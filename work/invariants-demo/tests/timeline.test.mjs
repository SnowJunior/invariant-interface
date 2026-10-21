import test from 'node:test';
import assert from 'node:assert/strict';
import { Timeline } from '../dist/js/timeline.js';

function harness(callbacks = {}) {
  let time = 0;
  let nextId = 1;
  const pending = new Map();
  const allCallbacks = new Map();
  const entered = [];
  const changes = [];
  const timeline = new Timeline({
    onEvent(event, index) {
      entered.push(event.id);
      callbacks.onEvent?.(event, index, timeline);
    },
    onChange(status) {
      changes.push(status);
      callbacks.onChange?.(status, timeline);
    },
    now: () => time,
    requestFrame(callback) {
      const id = nextId++;
      pending.set(id, callback);
      allCallbacks.set(id, callback);
      return id;
    },
    cancelFrame: id => pending.delete(id),
  });
  return {
    timeline, entered, changes, pending, allCallbacks,
    tick(ms = 16) {
      time += ms;
      const batch = [...pending.entries()];
      pending.clear();
      for (const [, callback] of batch) callback(time);
    },
    setTime(value) { time = value; },
  };
}

const events = [
  { id: 'proposal', duration: 100 },
  { id: 'rejected', duration: 200 },
  { id: 'repair', duration: 100 },
];

test('play enters immediately; completion waits for the final event duration', () => {
  const h = harness();
  h.timeline.load(events).play();
  assert.deepEqual(h.entered, ['proposal']);
  h.tick(100);
  assert.deepEqual(h.entered, ['proposal', 'rejected']);
  h.tick(200);
  assert.equal(h.timeline.status.finished, false);
  assert.deepEqual(h.entered, ['proposal', 'rejected', 'repair']);
  h.tick(99);
  assert.equal(h.timeline.status.playing, true);
  h.tick(1);
  assert.deepEqual(h.timeline.status, {
    playing: false, index: 2, total: 3, speed: 1, finished: true,
  });
  h.timeline.play();
  assert.equal(h.pending.size, 0);
});

test('pause freezes time, resume preserves partial event, step enters exactly one event', () => {
  const h = harness();
  h.timeline.load(events).play();
  h.tick(60);
  h.timeline.pause();
  h.tick(2000);
  assert.deepEqual(h.entered, ['proposal']);
  h.timeline.play();
  h.tick(39);
  assert.equal(h.entered.length, 1);
  h.tick(1);
  assert.deepEqual(h.entered, ['proposal', 'rejected']);
  h.timeline.step();
  assert.equal(h.timeline.status.playing, false);
  assert.deepEqual(h.entered, ['proposal', 'rejected', 'repair']);
  h.tick(1000);
  assert.equal(h.entered.length, 3);
  assert.equal(h.timeline.status.finished, false);
  h.timeline.step();
  assert.equal(h.timeline.status.finished, true);
});

test('all playback speeds preserve complete event ordering', () => {
  for (const speed of [0.5, 1, 2]) {
    const h = harness();
    h.timeline.load(events).setSpeed(speed).play();
    for (let i = 0; i < 100 && !h.timeline.status.finished; i++) h.tick(20);
    assert.deepEqual(h.entered, ['proposal', 'rejected', 'repair']);
    assert.equal(h.timeline.status.finished, true);
  }
});

test('speed changes account for the prior partial frame using its original speed', () => {
  const h = harness();
  h.timeline.load(events).play();
  h.setTime(50);
  h.timeline.setSpeed(2);
  h.tick(24);
  assert.deepEqual(h.entered, ['proposal']);
  h.tick(1);
  assert.deepEqual(h.entered, ['proposal', 'rejected']);
});

test('replacing a running sequence ignores stale callbacks and preserves new frames', () => {
  const h = harness();
  h.timeline.load(events).play();
  const stale = [...h.allCallbacks.values()][0];
  h.timeline.load([{ id: 'new', duration: 100 }]).play();
  const newFrame = [...h.pending.keys()][0];
  stale(1000);
  assert.equal(h.pending.has(newFrame), true);
  assert.deepEqual(h.entered, ['proposal', 'new']);
  h.tick(100);
  assert.equal(h.timeline.status.finished, true);
});

test('onEvent may load and play a new sequence without advancing the old one', () => {
  const h = harness({
    onEvent(event, _index, timeline) {
      if (event.id === 'rejected') {
        timeline.load([{ id: 'replacement', duration: 100 }]).play();
      }
    },
  });
  h.timeline.load(events).play();
  h.tick(250);
  assert.deepEqual(h.entered, ['proposal', 'rejected', 'replacement']);
  assert.equal(h.timeline.status.index, 0);
  assert.equal(h.timeline.status.finished, false);
  assert.equal(h.pending.size, 1);
  h.tick(100);
  assert.equal(h.timeline.status.finished, true);
});

test('large or negative timestamp jumps cannot skip the story or create reverse time', () => {
  const h = harness();
  h.timeline.load([
    { id: 'one', duration: 300 },
    { id: 'two', duration: 300 },
  ]).play();
  h.tick(10000);
  assert.deepEqual(h.entered, ['one']);
  h.tick(-9000);
  assert.deepEqual(h.entered, ['one']);
  h.setTime(10000);
  h.tick(50);
  assert.deepEqual(h.entered, ['one', 'two']);
});

test('zero-duration steps are delivered exactly once, and reset preserves speed', () => {
  const h = harness();
  h.timeline.load([
    { id: 'a', duration: 0 },
    { id: 'b', duration: 0 },
    { id: 'c', duration: 0 },
  ]).setSpeed(2).play();
  h.tick();
  assert.deepEqual(h.entered, ['a', 'b', 'c']);
  assert.equal(h.timeline.status.finished, true);
  h.timeline.reset();
  assert.deepEqual(h.timeline.status, {
    playing: false, index: -1, total: 3, speed: 2, finished: false,
  });
  h.timeline.step();
  assert.equal(h.timeline.status.index, 0);
  assert.equal(h.timeline.status.playing, false);
});

test('empty sequences, validation, and destroy do not leave work queued', () => {
  const h = harness();
  h.timeline.load([]).play().step();
  assert.equal(h.pending.size, 0);
  assert.equal(h.timeline.status.finished, true);
  assert.throws(() => h.timeline.load([{ duration: -1 }]), TypeError);
  assert.throws(() => h.timeline.setSpeed(3), RangeError);
  h.timeline.load(events).play();
  const stale = [...h.allCallbacks.values()].at(-1);
  h.timeline.destroy();
  stale(200);
  h.timeline.play();
  assert.deepEqual(h.entered, ['proposal']);
  assert.equal(h.pending.size, 0);
});
