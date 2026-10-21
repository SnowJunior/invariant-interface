import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBot, createHand } from '../dist/js/models3d.js';
import { sampleMotion } from '../dist/js/motion3d.js';

const GROUND_OFFSET = .035;

function setPose(bot, hand, time) {
  const pose = sampleMotion(time);
  bot.root.position.fromArray(pose.bot.position);
  bot.root.position.y += GROUND_OFFSET;
  bot.root.rotation.set(...pose.bot.rotation);
  bot.body.scale.set(1 / Math.sqrt(pose.bot.squash), pose.bot.squash, 1 / Math.sqrt(pose.bot.squash));
  bot.armL.rotation.x = pose.bot.armL;
  bot.armR.rotation.x = pose.bot.armR;
  bot.legL.rotation.x = pose.bot.legL;
  bot.legR.rotation.x = pose.bot.legR;
  hand.root.position.fromArray(pose.hand.position);
  hand.root.position.y += GROUND_OFFSET;
  hand.root.rotation.set(...pose.hand.rotation);
  hand.setGrip(pose.hand.grip);
  return pose;
}

function setup() {
  const scene = new THREE.Scene();
  const bot = createBot();
  const hand = createHand();
  scene.add(bot.root, hand.root);
  return { scene, bot, hand };
}

test('actual mesh hierarchy keeps the backpack handle at the hand socket while attached', () => {
  const { scene, bot, hand } = setup();
  const handle = new THREE.Vector3(), socket = new THREE.Vector3();
  // Include exact phase endpoints and nonsequential seeks, not just forward play.
  const times = [2.1, 3.2, 4.47, 6.5, 7.2, 7.45, 3.61, 5.7, 2.32, 4.13];
  for (const time of times) {
    const pose = setPose(bot, hand, time);
    assert.equal(pose.attached, true);
    scene.updateMatrixWorld(true);
    bot.handle.getWorldPosition(handle);
    hand.root.getWorldPosition(socket);
    assert.ok(handle.distanceTo(socket) < 1e-8, `Handle lost its socket at ${time}s: ${handle.distanceTo(socket)}`);
  }
});

test('spatial contact survives a shared world translation, rotation, and uniform scale', () => {
  const { scene, bot, hand } = setup();
  const stage = new THREE.Group();
  stage.position.set(3.5, .4, -2);
  stage.rotation.set(.07, .63, -.04);
  stage.scale.setScalar(1.25);
  scene.add(stage);
  stage.add(bot.root, hand.root);
  for (const time of [2.1, 3.7, 4.47, 5.9, 7.2]) {
    setPose(bot, hand, time);
    scene.updateMatrixWorld(true);
    const handle = bot.handle.getWorldPosition(new THREE.Vector3());
    const socket = hand.root.getWorldPosition(new THREE.Vector3());
    assert.ok(handle.distanceTo(socket) < 1e-8, `World transforms broke the grip at ${time}s`);
  }
});

test('torso compression does not move the backpack grip or change the attachment scale', () => {
  const { scene, bot, hand } = setup();
  setPose(bot, hand, 4.47);
  scene.updateMatrixWorld(true);
  const before = bot.handle.getWorldPosition(new THREE.Vector3());
  const scaleBefore = bot.handle.getWorldScale(new THREE.Vector3());
  bot.body.scale.set(1.15, .72, 1.15);
  scene.updateMatrixWorld(true);
  const after = bot.handle.getWorldPosition(new THREE.Vector3());
  const scaleAfter = bot.handle.getWorldScale(new THREE.Vector3());
  assert.ok(before.distanceTo(after) < 1e-12);
  assert.ok(scaleBefore.distanceTo(scaleAfter) < 1e-12);
  assert.ok(scaleAfter.distanceTo(new THREE.Vector3(1, 1, 1)) < 1e-12);
});

function fingertipMatrices(hand) {
  hand.root.updateMatrixWorld(true);
  return [...hand.fingers, hand.thumb].flatMap(digit => digit.userData.links.at(-1).matrixWorld.toArray());
}

test('finger articulation is deterministic after arbitrary grip seeks', () => {
  const hand = createHand();
  hand.root.position.set(-1, 3.4, .8);
  hand.root.rotation.set(.12, -.18, .24);
  hand.setGrip(.62);
  const expected = fingertipMatrices(hand);
  for (const grip of [1, .1, 0, .93, .37, .62]) hand.setGrip(grip);
  assert.deepEqual(fingertipMatrices(hand), expected);
});

test('closing the fingers curls their distal joints toward the grasp plane', () => {
  const hand = createHand();
  hand.setGrip(0);
  hand.root.updateMatrixWorld(true);
  const openDistances = hand.fingers.map(digit => Math.abs(digit.userData.links.at(-1).getWorldPosition(new THREE.Vector3()).z));
  hand.setGrip(1);
  hand.root.updateMatrixWorld(true);
  hand.fingers.forEach((digit, i) => {
    const closedDistance = Math.abs(digit.userData.links.at(-1).getWorldPosition(new THREE.Vector3()).z);
    assert.ok(closedDistance < openDistances[i] * .2, `Finger ${i} did not curl around the grasp plane`);
  });
});

test('boot soles reach the floor on landing before release and never penetrate it', () => {
  const { scene, bot, hand } = setup();
  for (const time of [0, 7.2, 7.4, 7.8, 9]) {
    setPose(bot, hand, time);
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(bot.root);
    assert.ok(bounds.min.y >= GROUND_OFFSET, `Bot penetrated the floor at ${time}s`);
    assert.ok(bounds.min.y <= GROUND_OFFSET + .025, `Bot floated above the floor at ${time}s`);
  }
  for (let time = 6.5; time <= 7.2; time += .02) {
    setPose(bot, hand, time);
    scene.updateMatrixWorld(true);
    assert.ok(new THREE.Box3().setFromObject(bot.root).min.y >= GROUND_OFFSET - .005, `Bot penetrated floor during landing at ${time}s`);
  }
  setPose(bot, hand, 3.6);
  scene.updateMatrixWorld(true);
  assert.ok(new THREE.Box3().setFromObject(bot.root).min.y > 1, 'The lift must visibly clear both feet from the floor');
});

test('constructors return independent articulation state and perform no automatic movement', () => {
  const botA = createBot(), botB = createBot();
  const handA = createHand(), handB = createHand();
  const untouchedBot = botB.root.position.clone();
  const untouchedHand = fingertipMatrices(handB);
  setPose(botA, handA, 5.6);
  botA.armL.rotation.x = 1.2;
  assert.ok(botB.root.position.equals(untouchedBot));
  assert.equal(botB.armL.rotation.x, 0);
  assert.deepEqual(fingertipMatrices(handB), untouchedHand);
  assert.notEqual(botA.handle, botB.handle);
  assert.notEqual(handA.fingers[0], handB.fingers[0]);
});
