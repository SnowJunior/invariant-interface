import test from 'node:test';
import assert from 'node:assert/strict';
import { DURATION, PHASES, sampleMotion } from '../dist/js/motion3d.js';

const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const nearVector = (actual, expected, tolerance = 1e-8) => actual.forEach((n, i) => near(n, expected[i], tolerance));

test('phase windows cover the entire nine-second sequence without gaps', () => {
  assert.equal(DURATION, 9);
  near(PHASES[0].start, 0);
  near(PHASES.at(-1).end, DURATION);
  for (let i = 0; i < PHASES.length; i++) {
    const phase = PHASES[i];
    assert.ok(phase.end > phase.start);
    if (i) near(PHASES[i - 1].end, phase.start);
    assert.equal(sampleMotion((phase.start + phase.end) / 2).phase, phase.id);
  }
});

test('out-of-range time clamps and invalid input safely returns the initial pose', () => {
  assert.deepEqual(sampleMotion(-100), sampleMotion(0));
  assert.deepEqual(sampleMotion(100), sampleMotion(DURATION));
  for (const input of [NaN, Infinity, -Infinity, '3', null, {}]) {
    assert.deepEqual(sampleMotion(input), sampleMotion(0));
  }
  assert.equal(sampleMotion(DURATION).progress, 1);
});

test('grip completes before lift; release begins only after the feet are grounded', () => {
  nearVector(sampleMotion(0).bot.position, [-1.5, 1.4, 0]);
  near(sampleMotion(1.5).hand.grip, 0);
  near(sampleMotion(2.1).hand.grip, 1);
  nearVector(sampleMotion(2.1).hand.position, [-1.5, 2.05, -.45]);
  near(sampleMotion(2.1).bot.position[1], 1.4);
  assert.ok(sampleMotion(2.8).bot.position[1] > 2);
  near(sampleMotion(7.2).hand.grip, 1);
  nearVector(sampleMotion(7.2).bot.position, [2.2, 1.4, 0]);
  assert.ok(sampleMotion(7.4).hand.grip < 1);
  nearVector(sampleMotion(7.4).bot.position, [2.2, 1.4, 0]);
  near(sampleMotion(7.8).hand.grip, 0);
  assert.equal(sampleMotion(7.8).attached, false);
});

// Independently reconstruct the handle using direct rotation-matrix terms.
function transformedHandle(rotation) {
  const [x, y, z] = rotation;
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
  return [
    -c*f*.65 + d*(-.45),
    (a*e-b*f*d)*.65 + (-b*c)*(-.45),
    (b*e+a*f*d)*.65 + a*c*(-.45),
  ];
}

test('backpack handle stays exactly at the grip socket through swinging and carrying', () => {
  for (let t = 2.1; t <= 7.2; t += .037) {
    const sample = sampleMotion(t);
    const offset = transformedHandle(sample.bot.rotation);
    nearVector(sample.bot.position.map((n, i) => n + offset[i]), sample.hand.position);
    assert.equal(sample.attached, true);
  }
});

test('all spatial poses remain continuous at choreography boundaries', () => {
  const boundaries = [...PHASES.slice(1).map(p => p.start), 4.3, 4.43, 5.1, 7.5];
  for (const boundary of boundaries) {
    const left = sampleMotion(boundary - 1e-7), right = sampleMotion(boundary + 1e-7);
    nearVector(left.hand.position, right.hand.position, 1e-5);
    nearVector(left.hand.rotation, right.hand.rotation, 1e-5);
    nearVector(left.bot.position, right.bot.position, 1e-5);
    nearVector(left.bot.rotation, right.bot.rotation, 1e-5);
    near(left.hand.grip, right.hand.grip, 1e-5);
    near(left.bot.squash, right.bot.squash, 1e-5);
    near(left.paddle.swing, right.paddle.swing, 1e-5);
  }
});

test('contact is brief, follows paddle windup, and precedes carry', () => {
  assert.ok(sampleMotion(4.25).paddle.swing < 0);
  assert.ok(sampleMotion(4.43).paddle.swing > 0);
  assert.ok(sampleMotion(4.47).impact > .9);
  near(sampleMotion(4.2).impact, 0);
  near(sampleMotion(4.7).impact, 0);
  assert.ok(sampleMotion(4.47).bot.squash < 1);
  near(sampleMotion(5.5).paddle.swing, 0);
  assert.equal(sampleMotion(5.5).paddle.visible, false);
});

test('the ground-shadow cue diminishes during lifting and returns on landing', () => {
  near(sampleMotion(0).shadow, 1);
  assert.ok(sampleMotion(3.6).shadow < .5);
  near(sampleMotion(7.2).shadow, 1);
  near(sampleMotion(DURATION).shadow, 1);
});

test('arbitrary seeking is deterministic and samples never share mutable state', () => {
  const expected = sampleMotion(5.73);
  sampleMotion(8.9); sampleMotion(.7); sampleMotion(4.47);
  assert.deepEqual(sampleMotion(5.73), expected);
  const changed = sampleMotion(5.73);
  changed.bot.position[0] = 100;
  changed.hand.rotation[1] = 100;
  assert.deepEqual(sampleMotion(5.73), expected);
});

test('the complete sequence stays finite and normalized, then ends grounded and repairing', () => {
  for (let t = 0; t <= DURATION; t += .01) {
    const sample = sampleMotion(t);
    for (const value of [...sample.bot.position, ...sample.bot.rotation, ...sample.hand.position, ...sample.hand.rotation, sample.paddle.swing]) assert.ok(Number.isFinite(value));
    for (const value of [sample.progress, sample.hand.grip, sample.bot.eyeWide, sample.impact, sample.shadow, sample.cameraPush]) assert.ok(value >= 0 && value <= 1);
  }
  const last = sampleMotion(DURATION);
  nearVector(last.bot.position, [2.2, 1.4, 0]);
  nearVector(last.hand.position, [2.2, 6, -.45]);
  assert.equal(last.phase, 'repair');
  assert.equal(last.repair, true);
  assert.equal(last.attached, false);
  assert.ok(last.bot.armL < 0 && last.bot.armR < 0);
});
