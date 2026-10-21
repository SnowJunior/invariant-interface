/**
 * A presentation clock for a deterministic sequence of semantic events.
 * Event duration is measured in simulation milliseconds. The clock never owns
 * application state: onEvent applies each event once when it is entered.
 */
export class Timeline {
  constructor({
    onEvent = () => {},
    onChange = () => {},
    requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
    cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
    now = () => performance.now(),
  } = {}) {
    this._onEvent = onEvent;
    this._onChange = onChange;
    this._requestFrame = requestFrame;
    this._cancelFrame = cancelFrame;
    this._now = now;
    this._events = [];
    this._index = -1;
    this._elapsed = 0;
    this._speed = 1;
    this._playing = false;
    this._finished = true;
    this._generation = 0;
    this._frameId = null;
    this._lastTime = null;
    this._destroyed = false;
  }

  get status() {
    return {
      playing: this._playing,
      index: this._index,
      total: this._events.length,
      speed: this._speed,
      finished: this._finished,
    };
  }

  load(events) {
    if (this._destroyed) return this;
    if (!Array.isArray(events) || events.some(event =>
      !event || !Number.isFinite(event.duration) || event.duration < 0)) {
      throw new TypeError('Timeline events require a finite, nonnegative duration.');
    }
    this._invalidate();
    this._events = events.slice();
    this._index = -1;
    this._elapsed = 0;
    this._playing = false;
    this._finished = events.length === 0;
    this._lastTime = null;
    this._notify();
    return this;
  }

  play() {
    if (this._destroyed || this._playing || this._finished) return this;
    if (typeof this._requestFrame !== 'function') {
      throw new Error('Timeline requires requestAnimationFrame or an injected requestFrame.');
    }
    this._playing = true;
    this._lastTime = this._now();
    const generation = this._generation;
    this._notify();
    if (!this._active(generation)) return this;
    if (this._index < 0 && !this._enter(0, generation)) return this;
    this._schedule(generation);
    return this;
  }

  pause() {
    if (this._destroyed || !this._playing) return this;
    // Do not apply unseen elapsed time here: pausing must never advance a step.
    this._invalidate();
    this._playing = false;
    this._lastTime = null;
    this._notify();
    return this;
  }

  step() {
    if (this._destroyed || this._finished) return this;
    this._invalidate();
    this._playing = false;
    this._lastTime = null;
    const generation = this._generation;
    if (this._index + 1 >= this._events.length) {
      this._finished = true;
      this._notify();
    } else {
      this._enter(this._index + 1, generation);
    }
    return this;
  }

  setSpeed(speed) {
    if (![0.5, 1, 2].includes(speed)) {
      throw new RangeError('Timeline speed must be 0.5, 1, or 2.');
    }
    if (this._destroyed || speed === this._speed) return this;
    // Account for the current partial frame at its old speed.
    const generation = this._generation;
    if (this._playing) this._advance(this._now(), generation);
    if (generation !== this._generation || this._destroyed) return this;
    this._speed = speed;
    this._notify();
    return this;
  }

  reset() {
    return this.load(this._events);
  }

  destroy() {
    if (this._destroyed) return;
    this._invalidate();
    this._playing = false;
    this._destroyed = true;
    this._events = [];
    this._index = -1;
    this._finished = true;
  }

  _notify() {
    this._onChange(this.status);
  }

  _invalidate() {
    this._generation += 1;
    if (this._frameId !== null && this._cancelFrame) {
      this._cancelFrame(this._frameId);
    }
    this._frameId = null;
  }

  _active(generation) {
    return generation === this._generation && this._playing && !this._destroyed;
  }

  _enter(index, generation) {
    this._index = index;
    this._elapsed = 0;
    try {
      this._onEvent(this._events[index], index);
    } catch (error) {
      this._invalidate();
      this._playing = false;
      this._notify();
      throw error;
    }
    // A callback may replace or step the entire sequence. Its state wins.
    if (generation !== this._generation || this._destroyed) return false;
    this._notify();
    return generation === this._generation && !this._destroyed;
  }

  _schedule(generation) {
    if (!this._active(generation) || this._frameId !== null) return;
    this._frameId = this._requestFrame(timestamp => {
      // A cancelled callback can still arrive. Do not clear a newer frame ID.
      if (!this._active(generation)) return;
      this._frameId = null;
      this._advance(timestamp, generation);
      this._schedule(generation);
    });
  }

  _advance(timestamp, generation) {
    if (!this._active(generation) || !Number.isFinite(timestamp)) return;
    const lastTime = this._lastTime ?? timestamp;
    // A background-tab jump should not fast-forward past the whole story.
    // Negative timestamps add no time and cannot move the reference backwards.
    const delta = Math.min(250, Math.max(0, timestamp - lastTime));
    this._lastTime = Math.max(lastTime, timestamp);
    this._elapsed += delta * this._speed;

    while (this._active(generation) && this._index >= 0) {
      const duration = this._events[this._index].duration;
      if (this._elapsed < duration) break;
      const remainder = this._elapsed - duration;
      if (this._index === this._events.length - 1) {
        this._playing = false;
        this._finished = true;
        this._lastTime = null;
        this._notify();
        break;
      }
      if (!this._enter(this._index + 1, generation)) return;
      if (!this._active(generation)) return;
      this._elapsed = remainder;
    }
  }
}
