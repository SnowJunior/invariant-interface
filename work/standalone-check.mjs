
// This models the displayed Go implementations. It does not execute Go in a browser.
const RULES = Object.freeze([
  { id: 'INV-01', title: 'Stock never goes negative', short: 'Never negative', description: 'Available stock must never become negative. Zero is allowed.' },
  { id: 'INV-02', title: 'Reject invalid quantities', short: 'Validate the request', description: 'A quantity of zero or less returns ErrInvalidQuantity and leaves stock unchanged.' },
  { id: 'INV-03', title: 'Never sell what you don’t have', short: 'No overselling', description: 'A quantity greater than available stock returns ErrInsufficientStock and leaves stock unchanged.' },
  { id: 'INV-04', title: 'Do exactly the work requested', short: 'Exact reservation', description: 'For 0 < qty <= available, Reserve returns nil and reduces stock by exactly qty.' },
].map(Object.freeze));

const IMPLEMENTATIONS = Object.freeze({
  safe: Object.freeze({ id: 'safe', title: 'Contract preserved', repair: 'safe', code: `func (s *Stock) Reserve(qty int) error {
    if qty <= 0 {
        return ErrInvalidQuantity
    }
    if qty > s.available {
        return ErrInsufficientStock
    }
    s.available -= qty
    return nil
}` }),
  unchecked: Object.freeze({ id: 'unchecked', title: 'The confident shortcut', repair: 'safe', code: `func (s *Stock) Reserve(qty int) error {
    s.available -= qty
    return nil
}` }),
  mutates: Object.freeze({ id: 'mutates', title: 'Check after changing stock', repair: 'safe', code: `func (s *Stock) Reserve(qty int) error {
    if qty <= 0 {
        return ErrInvalidQuantity
    }
    s.available -= qty
    if s.available < 0 {
        return ErrInsufficientStock
    }
    return nil
}` }),
  offbyone: Object.freeze({ id: 'offbyone', title: 'One item left behind', repair: 'safe', code: `func (s *Stock) Reserve(qty int) error {
    if qty <= 0 {
        return ErrInvalidQuantity
    }
    if qty > s.available {
        return ErrInsufficientStock
    }
    s.available -= qty - 1
    return nil
}` }),
  rejectall: Object.freeze({ id: 'rejectall', title: 'The overly cautious bot', repair: 'safe', code: `func (s *Stock) Reserve(qty int) error {
    if qty <= 0 {
        return ErrInvalidQuantity
    }
    return ErrInsufficientStock
}` }),
});

const ALL_IDS = RULES.map(rule => rule.id);

function runOperation(implementationId, stock, qty) {
  if (!Object.hasOwn(IMPLEMENTATIONS, implementationId)) throw new RangeError(`Unknown implementation: ${implementationId}`);
  if (!Number.isSafeInteger(stock) || !Number.isSafeInteger(qty)) throw new TypeError('Stock and quantity must be safe integers.');
  const outcome = { before: stock, qty, after: stock, error: null };
  if (implementationId === 'unchecked') {
    outcome.after -= qty;
    return outcome;
  }
  if (qty <= 0) {
    outcome.error = 'ErrInvalidQuantity';
    return outcome;
  }
  if (implementationId === 'mutates') {
    outcome.after -= qty;
    if (outcome.after < 0) outcome.error = 'ErrInsufficientStock';
    return outcome;
  }
  if (implementationId === 'rejectall' || qty > stock) {
    outcome.error = 'ErrInsufficientStock';
    return outcome;
  }
  outcome.after -= implementationId === 'offbyone' ? qty - 1 : qty;
  return outcome;
}

// Each case starts with fresh stock. Tests cannot mutate the live demonstration.
const CASES = Object.freeze({
  'INV-01': [[5, 8], [0, 1], [5, -2], [5, 0], [5, 2], [5, 5]],
  'INV-02': [[5, 0], [5, -2], [0, 0], [0, -3]],
  'INV-03': [[5, 8], [0, 1], [2, 3]],
  'INV-04': [[5, 2], [5, 5], [1, 1], [10, 3]],
});

function selectedRules(enabledRuleIds) {
  const selected = new Set(enabledRuleIds);
  for (const id of selected) {
    if (!ALL_IDS.includes(id)) throw new RangeError(`Unknown rule: ${id}`);
  }
  return RULES.filter(rule => selected.has(rule.id));
}

function expectedOutcome(before, qty) {
  if (qty <= 0) return { expectedAfter: before, expectedError: 'ErrInvalidQuantity' };
  if (qty > before) return { expectedAfter: before, expectedError: 'ErrInsufficientStock' };
  return { expectedAfter: before - qty, expectedError: null };
}

function evaluate(implementationId, enabledRuleIds = ALL_IDS) {
  if (!Object.hasOwn(IMPLEMENTATIONS, implementationId)) throw new RangeError(`Unknown implementation: ${implementationId}`);
  const results = selectedRules(enabledRuleIds).map(rule => {
    const cases = CASES[rule.id].map(([before, qty]) => {
      const observed = runOperation(implementationId, before, qty);
      const expected = expectedOutcome(before, qty);
      const pass = rule.id === 'INV-01'
        ? observed.after >= 0
        : observed.after === expected.expectedAfter && observed.error === expected.expectedError;
      return {
        ...observed, ...expected, pass,
        expectation: rule.id === 'INV-01'
          ? 'Stock must remain at least 0.'
          : `Stock ${expected.expectedAfter}; result ${expected.expectedError ?? 'nil'}.`,
      };
    });
    return { ruleId: rule.id, pass: cases.every(test => test.pass), cases };
  });
  return { pass: results.every(result => result.pass), results };
}

function agentsMarkdown(enabledRuleIds = ALL_IDS) {
  const rules = selectedRules(enabledRuleIds);
  return `# Inventory package instructions

Scope: pkg/inventory.
The package represents a sequential in-memory stock counter.
Initial stock must be nonnegative.

## Behavioral contracts
${rules.length ? rules.map(rule => `- ${rule.id}: ${rule.description}`).join('\n') : 'No behavioral contracts are currently enabled.'}

## Change boundaries
- Preserve the Inventory interface and existing error identities.
- Keep changes within this package for the demonstrated task.
- Preserve the behavioral assertions in the tests; do not weaken them
  to make a failing implementation appear correct.

## Verification
From the module root, run:
go test ./pkg/inventory

Fix failing checks before requesting acceptance of a change.
`;
}


/**
 * A presentation clock for a deterministic sequence of semantic events.
 * Event duration is measured in simulation milliseconds. The clock never owns
 * application state: onEvent applies each event once when it is entered.
 */
class Timeline {
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


const SVG_NS = 'http://www.w3.org/2000/svg';
let workshopId = 0;

function botMarkup(id, role, scale = 1) {
  return `<g class="bot-position bot-${role}" data-bot="${id}" transform="translate(0 0)">
    <ellipse class="bot-shadow" cx="0" cy="34" rx="34" ry="6"/>
    <g class="bot-puppet" style="--bot-scale:${scale}">
      <g class="bot-leg leg-left"><path d="M-20 13v15l-9 3"/></g>
      <g class="bot-leg leg-right"><path d="M20 13v15l9 3"/></g>
      <rect class="bot-backpack" x="24" y="-17" width="13" height="34" rx="4"/>
      <path class="bot-backpack-strap" d="M27-8h10m-10 15h10"/>
      <g class="bot-arm arm-left"><path d="M-25-3l-13 6v10"/><path class="bot-finger" d="M-42 10h8"/></g>
      <g class="bot-arm arm-right"><path d="M25-3l13 6v10"/><path class="bot-finger" d="M34 10h8"/></g>
      <rect class="bot-body" x="-29" y="-26" width="58" height="47" rx="6"/>
      <path class="bot-highlight" d="M-21-22h39"/>
      <rect class="bot-ear ear-left" x="-32" y="-17" width="7" height="15" rx="2"/>
      <rect class="bot-ear ear-right" x="25" y="-17" width="7" height="15" rx="2"/>
      <g class="bot-eyes"><rect x="-15" y="-9" width="7" height="12" rx="1"/><rect x="8" y="-9" width="7" height="12" rx="1"/></g>
      <path class="bot-mouth" d="M-5 9h10"/>
      <g class="carried-code"><rect x="-21" y="8" width="42" height="24" rx="3"/><text x="0" y="25" text-anchor="middle">{ }</text></g>
    </g>
  </g>`;
}

const POSITIONS = {
  idle: [167, 268], walking: [252, 272], typing: [237, 268],
  compiling: [452, 268], chaos: [604, 291], reading: [675, 270],
  checking: [701, 270], rejected: [701, 270], bonk: [690, 230],
  repairing: [282, 356], accepted: [765, 270], celebrating: [605, 281],
};

const BUBBLES = {
  idle: 'Ready to ship.', walking: 'One tiny change…', typing: 'Less code. More speed.',
  compiling: 'It compiles!', chaos: 'Wait. Negative stock?', reading: 'Okay, reading the rules.',
  checking: 'The contract says…', rejected: 'That patch is blocked.', bonk: 'BONK!',
  repairing: 'Guards before shortcuts.', accepted: 'Checks passed.', celebrating: 'Contract kept. Ship it.',
};

/** Decorative workshop renderer. All decisions and stock values come from its caller. */
function mountWorkshop(container) {
  const prefix = `iw-${++workshopId}`;
  container.classList.add('workshop');
  container.innerHTML = `<svg class="workshop-svg" xmlns="${SVG_NS}" viewBox="0 0 1000 450" aria-hidden="true" focusable="false">
    <defs>
      <pattern id="${prefix}-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" fill="none" stroke="#ffffff" stroke-opacity=".045" stroke-width="1"/></pattern>
      <pattern id="${prefix}-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="9" fill="#e9b36c" fill-opacity=".23"/></pattern>
      <linearGradient id="${prefix}-screen" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#222c29"/><stop offset="1" stop-color="#18211e"/></linearGradient>
    </defs>
    <rect width="1000" height="450" fill="#1d2422"/>
    <rect width="1000" height="450" fill="url(#${prefix}-grid)"/>
    <path d="M0 313H1000" class="floor-line"/>
    <path d="M0 316H1000" stroke="#101916" stroke-width="6"/>
    <path d="M35 428H965" class="floor-line floor-line-secondary"/>

    <g class="workshop-caption"><rect x="30" y="25" width="6" height="6" rx="1" fill="#e8ae7e"/><text x="46" y="32">pkg / inventory</text><text x="970" y="32" text-anchor="end" class="caption-dim">A SMALL PACKAGE. BIG CONSEQUENCES.</text></g>

    <g class="station-label"><text x="87" y="94">01 / WRITE</text><text x="402" y="94">02 / TYPE CHECK</text><text x="720" y="94">03 / CONTRACT GATE</text></g>

    <g class="code-station">
      <path d="M90 115l-11-10h217l12 10" fill="#3d4742"/>
      <rect x="79" y="105" width="229" height="144" rx="8" class="machine-case"/>
      <rect x="89" y="115" width="209" height="115" rx="3" fill="url(#${prefix}-screen)" stroke="#111a16"/>
      <path d="M89 139h209" stroke="#39443c"/>
      <circle cx="102" cy="127" r="3" fill="#d59978"/><circle cx="113" cy="127" r="3" fill="#bdb47d"/><circle cx="124" cy="127" r="3" fill="#85ad94"/>
      <text x="143" y="130" class="screen-filename">inventory.go</text>
      <g class="monitor-code"><text x="103" y="160"><tspan class="code-purple">func</tspan> Reserve(qty <tspan class="code-gold">int</tspan>) {</text><text x="113" y="179" class="monitor-line">stock -= qty</text><text x="113" y="198"><tspan class="code-purple">return</tspan> nil</text><text x="103" y="217">}</text></g>
      <rect class="monitor-cursor" x="184" y="187" width="6" height="11" fill="#9bc6aa"/>
      <path d="M170 249v17h49v-17" fill="#4b554e"/><path d="M146 270h98l8 7H138z" fill="#667066"/>
      <circle cx="194" cy="240" r="3" fill="#708477"/>
      <path d="M64 283h257l-14 10H75z" fill="#424c45"/><path d="M76 293v19m233-19v19" stroke="#727a6c" stroke-width="7"/>
      <rect x="87" y="278" width="76" height="4" rx="2" fill="#939780"/>
    </g>

    <g class="conveyor">
      <path d="M330 204H684" stroke="#354039" stroke-width="22"/><path d="M330 194H684" stroke="#697365" stroke-width="2"/>
      <path d="M330 216H684" stroke="#101814" stroke-width="5"/>
      <g class="conveyor-teeth" stroke="#5a675c" stroke-width="2" stroke-dasharray="2 17"><path d="M331 204H681"/></g>
      <path d="M351 218v38m303-38v38" stroke="#424d42" stroke-width="7"/>
      <g class="moving-patch"><rect x="346" y="161" width="49" height="34" rx="4" fill="#d8b58b"/><path d="M354 171h24m-24 7h30m-30 7h17" stroke="#665a49" stroke-width="2"/><path d="M383 161v10h12" fill="#b68a65"/></g>
    </g>

    <g class="type-station">
      <path d="M403 105h190v90H403z" fill="#4b5346" stroke="#76806a"/>
      <rect x="414" y="115" width="168" height="62" rx="3" fill="#252f26"/>
      <text x="498" y="138" text-anchor="middle" class="type-heading">GO INTERFACE</text>
      <text x="498" y="159" text-anchor="middle" class="type-signature">Reserve(int) error</text>
      <path d="M418 195v15m161-15v15" stroke="#9a9d80" stroke-width="9"/>
      <rect x="438" y="185" width="120" height="29" rx="3" class="type-stamp"/>
      <text x="498" y="204" text-anchor="middle" class="stamp-label">✓ SATISFIED</text>
      <g class="type-lever"><path d="M595 148h16v-31" stroke="#8f977f" stroke-width="5" fill="none"/><circle cx="611" cy="114" r="7" fill="#c4b083"/></g>
    </g>

    <g class="gate-station">
      <path class="gate-arch" d="M704 260V126a15 15 0 0 1 15-15h154a15 15 0 0 1 15 15v134" fill="none" stroke-width="14"/>
      <path d="M690 260h31v10h-31zm181 0h31v10h-31z" fill="#556257"/>
      <rect x="721" y="126" width="149" height="35" rx="4" fill="#131c17"/>
      <circle class="gate-light" cx="738" cy="143" r="4"/><text class="gate-status" x="752" y="147">NOT CHECKED</text>
      <g class="gate-beams"><path d="M716 180h160m-160 24h160m-160 24h160"/></g>
      <g class="gate-bar"><path d="M717 238h157" stroke="#bdab83" stroke-width="9"/><path d="M720 238h151" stroke="#4c4b3a" stroke-width="9" stroke-dasharray="15 12"/></g>
      <path d="M724 281h148" stroke="url(#${prefix}-hatch)" stroke-width="14"/>
      <g class="guidance-sheet"><path d="M899 170h49l11 11v66h-60z" fill="#eee9d9"/><path d="M948 170v12h11" fill="#c6d0bd"/><path d="M910 193h36m-36 9h31m-31 9h36m-36 9h25" stroke="#7b8b75" stroke-width="2"/><text x="929" y="237" text-anchor="middle">AGENTS.md</text><path d="M929 247v24" stroke="#818a78" stroke-width="3"/></g>
      <g class="guidance-empty"><rect x="903" y="177" width="52" height="67" rx="3" fill="none" stroke="#677467" stroke-dasharray="4 5"/><text x="929" y="211" text-anchor="middle">+</text></g>
    </g>

    <g class="repair-station"><text x="55" y="350" class="station-label">REPAIR BENCH</text><path d="M54 378h160l9 9H46z" fill="#9b8263"/><path d="M62 387v38m143-38v38" stroke="#776d55" stroke-width="7"/><path d="M66 391h135" stroke="#454d40" stroke-width="5"/><rect x="76" y="367" width="24" height="10" rx="2" fill="#b5b99c"/><path d="M125 374l14-18m-19 12l10 8" stroke="#c7c8aa" stroke-width="4"/><path d="M166 375v-17m-5 0h10" stroke="#dc9e70" stroke-width="4"/><rect x="172" y="366" width="23" height="10" rx="2" fill="#4d6454"/></g>
    <g class="package-label"><path d="M365 348h198v62H365z" fill="#202a24" stroke="#4d5b4c" stroke-dasharray="3 4"/><text x="381" y="370">CURRENT TASK</text><text x="381" y="391" class="task-label">Make a reservation.</text></g>

    <g class="inventory"><text x="652" y="348" class="station-label">AVAILABLE STOCK</text><text class="stock-number" x="949" y="351" text-anchor="end">5</text><path d="M650 393h303" stroke="#87947c" stroke-width="1"/><text x="640" y="398" text-anchor="end" class="zero-label">0</text><g class="stock-blocks"></g><g class="debt-blocks"></g><text class="stock-caption" x="652" y="425">Five items. Zero surprises.</text></g>

    ${botMarkup('builder', 'builder')}
    ${botMarkup('improver', 'improver', .72)}
    ${botMarkup('checker', 'checker', .8)}

    <g class="correction-rig"><path class="glove-cable" d="M720 42V174" stroke="#b0b5a0" stroke-width="3" stroke-dasharray="5 4"/><g class="cartoon-glove" transform="translate(30 0)"><path d="M679 166v-14c0-7 10-7 10 0v12-21c0-7 10-7 10 0v21-17c0-7 10-7 10 0v24l7-6c7-5 13 2 8 8l-13 20c-4 6-12 10-20 8l-13-3c-8-2-13-10-12-18l2-12c1-8 10-9 11-2z" fill="#e9e5d5" stroke="#a5a891" stroke-width="2"/><path d="M674 202h33v9h-33z" fill="#93b39b"/><path d="M687 178v10m10-12v12m10-12v10" stroke="#aaa993" stroke-width="2"/></g><g class="foam-paddle"><rect x="747" y="237" width="38" height="8" rx="4" fill="#b78b61"/><rect x="724" y="223" width="32" height="37" rx="12" fill="#b2c9a7" stroke="#76946e" stroke-width="2"/><path d="M733 230h14m-14 7h14m-14 7h14m-14 7h14" stroke="#dce4c7" stroke-width="2"/></g><path class="impact-lines" d="M718 223l-8-5m7 16l-10-1m11 11l-9 6" fill="none" stroke="#f7d986" stroke-width="3" stroke-linecap="round"/></g>

    <g class="speech"><path class="speech-panel" d="M-106-43h212a7 7 0 0 1 7 7v28a7 7 0 0 1-7 7H9L0 9l-2-10h-104a7 7 0 0 1-7-7v-28a7 7 0 0 1 7-7z"/><text class="speech-text" text-anchor="middle" y="-17">Ready to ship.</text></g>
    <g class="celebration-particles" fill="#b6d3a9"><path d="M571 226h5v10h-5zm79 14h5v10h-5zm-43-28h5v10h-5z"/><path d="M550 252h5v10h-5zm120-30h5v10h-5z" fill="#e6ac72"/><path d="M580 199h5v10h-5zm59-3h5v10h-5z" fill="#ddd5a7"/></g>
  </svg>`;

  const svg = container.querySelector('svg');
  const main = svg.querySelector('[data-bot="builder"]');
  const improver = svg.querySelector('[data-bot="improver"]');
  const checker = svg.querySelector('[data-bot="checker"]');
  const speech = svg.querySelector('.speech');
  const speechText = svg.querySelector('.speech-text');
  const sheet = svg.querySelector('.guidance-sheet');
  const emptySheet = svg.querySelector('.guidance-empty');
  const gateStatus = svg.querySelector('.gate-status');
  const stockNumber = svg.querySelector('.stock-number');
  const stockBlocks = svg.querySelector('.stock-blocks');
  const debtBlocks = svg.querySelector('.debt-blocks');
  const stockCaption = svg.querySelector('.stock-caption');
  const taskLabel = svg.querySelector('.task-label');
  const monitorLine = svg.querySelector('.monitor-line');
  const prefs = {skin: 'orange', reducedMotion: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false, paused: false, speed: 1, slapstick: true};
  let scene = {pose: 'idle', stock: 5, protected: false, bubble: undefined};
  let lastPose = null;
  let lastStock = null;
  let position = POSITIONS.idle;
  let movement = null;
  let destroyed = false;

  improver.setAttribute('transform', 'translate(366 283)');
  checker.setAttribute('transform', 'translate(850 278)');

  function syncAnimationSettings() {
    if (destroyed) return;
    for (const animation of svg.getAnimations({subtree: true})) {
      animation.playbackRate = prefs.speed;
      if (prefs.paused) animation.pause();
      else if (!prefs.reducedMotion && animation.playState === 'paused') animation.play();
    }
  }

  function renderStock(value) {
    const stock = Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0;
    if (stock === lastStock) return;
    lastStock = stock;
    stockNumber.textContent = String(stock);
    container.classList.toggle('stock-negative', stock < 0);
    stockBlocks.replaceChildren();
    debtBlocks.replaceChildren();
    const count = Math.min(Math.abs(stock), 9);
    const width = count > 6 ? 25 : 36;
    const gap = 6;
    const total = Math.max(count, 5);
    for (let i = 0; i < total; i++) {
      const ghost = document.createElementNS(SVG_NS, 'rect');
      ghost.setAttribute('x', String(652 + i * (width + gap)));
      ghost.setAttribute('y', '361');
      ghost.setAttribute('width', String(width));
      ghost.setAttribute('height', '27');
      ghost.setAttribute('rx', '3');
      ghost.setAttribute('class', 'stock-ghost');
      stockBlocks.append(ghost);
    }
    for (let i = 0; i < count; i++) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(652 + i * (width + gap)));
      rect.setAttribute('y', stock < 0 ? '399' : '361');
      rect.setAttribute('width', String(width));
      rect.setAttribute('height', stock < 0 ? '13' : '27');
      rect.setAttribute('rx', '3');
      rect.setAttribute('class', stock < 0 ? 'debt-block' : 'stock-block');
      (stock < 0 ? debtBlocks : stockBlocks).append(rect);
    }
    stockCaption.textContent = stock < 0 ? 'That should never happen.' : stock === 0 ? 'Empty is valid. Negative isn’t.' : stock > 9 ? 'Each block represents a stocked item.*' : 'Inventory remains in the package.';
    if (stock > 9) stockCaption.textContent = `${stock} items · first 9 shown`;
    if (stock < -9) stockCaption.textContent = `${Math.abs(stock)} missing · first 9 shown`;
  }

  function renderScene(force = false) {
    if (destroyed) return;
    const requestedPose = POSITIONS[scene.pose] ? scene.pose : 'idle';
    const pose = requestedPose === 'bonk' && (!prefs.slapstick || prefs.reducedMotion) ? 'rejected' : requestedPose;
    container.dataset.pose = pose;
    container.dataset.protected = String(Boolean(scene.protected));
    const guidance = scene.guidance ?? scene.protected;
    sheet.style.display = guidance ? '' : 'none';
    emptySheet.style.display = guidance ? 'none' : '';
    const rejected = ['rejected', 'bonk'].includes(pose);
    gateStatus.textContent = rejected ? 'PATCH BLOCKED' : scene.protected ? (['accepted', 'celebrating'].includes(pose) ? 'CHECKS PASSED' : 'CHECKS ENABLED') : 'NOT CHECKED';
    taskLabel.textContent = pose === 'repairing' ? 'Validate. Then subtract.' : rejected ? 'Read → repair → retry' : scene.protected ? 'Preserve the contract.' : 'Make a reservation.';
    monitorLine.textContent = ['repairing', 'accepted', 'celebrating'].includes(pose) && scene.protected ? 'if qty > stock { … }' : 'stock -= qty';
    renderStock(scene.stock);
    if (pose !== lastPose || force) {
      const target = POSITIONS[pose];
      if (movement) { movement.cancel(); movement = null; }
      const from = position;
      main.setAttribute('transform', `translate(${target[0]} ${target[1]})`);
      if (!prefs.reducedMotion && from !== target && main.animate) {
        movement = main.animate([
          {transform: `translate(${from[0]}px, ${from[1]}px)`},
          {transform: `translate(${target[0]}px, ${target[1]}px)`},
        ], {duration: pose === 'bonk' ? 250 : 740, easing: 'cubic-bezier(.25,.65,.25,1)', fill: 'none'});
      }
      position = target;
      const speechX = pose === 'bonk' ? 560 : Math.min(870, Math.max(125, target[0]));
      speech.setAttribute('transform', `translate(${speechX} 77)`);
      lastPose = pose;
    }
    let bubble = scene.bubble || BUBBLES[pose];
    if (requestedPose === 'bonk' && pose === 'rejected') bubble = 'Rejected. Repair required.';
    speechText.textContent = bubble;
    speechText.style.fontSize = bubble.length > 27 ? '10px' : bubble.length > 22 ? '11px' : '12px';
    syncAnimationSettings();
  }

  function setPreferences(next = {}) {
    Object.assign(prefs, next);
    prefs.speed = Math.max(.25, Math.min(4, Number(prefs.speed) || 1));
    const mint = ['mint', 'pet', 'gpt'].includes(prefs.skin);
    container.dataset.skin = mint ? 'mint' : 'orange';
    container.classList.toggle('motion-reduced', Boolean(prefs.reducedMotion));
    container.classList.toggle('is-paused', Boolean(prefs.paused));
    if (prefs.reducedMotion && movement) { movement.cancel(); movement = null; }
    renderScene();
    syncAnimationSettings();
  }

  setPreferences();
  renderScene();
  return {
    setScene(next = {}) {
      if (next.pose && next.pose !== scene.pose && !Object.hasOwn(next, 'bubble')) scene.bubble = undefined;
      scene = {...scene, ...next};
      renderScene();
    },
    setPreferences,
    destroy() {
      destroyed = true;
      for (const animation of svg.getAnimations({subtree: true})) animation.cancel();
      container.replaceChildren();
      container.classList.remove('workshop', 'motion-reduced', 'is-paused', 'stock-negative');
    },
  };
}





const $ = id => document.getElementById(id);
const allRules = RULES.map(r => r.id);
const motionMedia = matchMedia('(prefers-reduced-motion: reduce)');
const workshop = mountWorkshop($('workshop'));
const state = {
  guidance: false, checks: false, rules: [...allRules], accepted: 'safe', candidate: 'unchecked', stock: 5,
  selectedRule: 'INV-01', tab: 'proposal', results: null, pose: 'idle', bubble: 'Ready to ship.',
  before: 5, qty: 8, after: '—', evidenceTitle: 'A signature isn’t a promise.',
  detail: 'Reserve(qty int) error tells us how to call it. It doesn’t say whether stock can go below zero.',
  result: 'Waiting for the first proposal.', resultType: '', logs: [], story: 'unprotected',
  skin: 'orange', reducedMotion: motionMedia.matches, slapstick: true, sound: false,
};
let timeline;
let audioContext;
let sequenceKind = 'comparison';
let injectionBaseline;

function announce(text) { $('announcer').textContent = text; }
function log(text) { state.logs.unshift(text); state.logs = state.logs.slice(0, 8); }
function setEvidence(title, detail, type = '', result) {
  state.evidenceTitle = title; state.detail = detail; state.resultType = type;
  if (result !== undefined) state.result = result;
}
function showCase(c) {
  state.before = c.before; state.qty = c.qty; state.after = c.after;
}
function resultForCase(c) {
  return `Expected: ${c.expectedError ?? 'nil'}, stock ${c.expectedAfter}. Observed: ${c.error ?? 'nil'}, stock ${c.after}.`;
}
function showRule(id, inspect = true) {
  state.selectedRule = id;
  if (inspect) {
    const rule = RULES.find(r => r.id === id);
    const outcome = state.results?.results.find(r => r.ruleId === id);
    const example = outcome?.cases.find(c => !c.pass) ?? outcome?.cases[0];
    setEvidence(`${id} · ${rule.short}`, rule.description, outcome ? (outcome.pass ? 'good' : 'bad') : '',
      example ? resultForCase(example) : (state.rules.includes(id) ? 'Rule selected. Run a proposal to collect evidence.' : 'This rule is disabled. Other rules still apply.'));
    if (example) showCase(example);
    render();
  }
}

function renderRules() {
  for (const rule of RULES) {
    const row = document.querySelector(`[data-rule-row="${rule.id}"]`);
    const outcome = state.results?.results.find(r => r.ruleId === rule.id);
    const enabled = state.rules.includes(rule.id);
    row.classList.toggle('faded', !state.guidance || !enabled);
    row.classList.toggle('selected', state.selectedRule === rule.id);
    row.classList.toggle('failed', !!outcome && !outcome.pass);
    row.querySelector('input').checked = enabled;
    row.querySelector('input').disabled = !state.guidance;
    const status = row.querySelector('.rule-status');
    status.textContent = outcome ? (outcome.pass ? '✓' : '×') : (enabled ? '·' : '—');
    status.setAttribute('aria-label', outcome ? (outcome.pass ? 'Pass' : 'Fail') : (enabled ? 'Not checked' : 'Disabled'));
  }
}
function escapeHTML(value) { return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function renderCode() {
  const isAgents = state.tab === 'agents';
  const code = isAgents ? agentsMarkdown(state.rules) : IMPLEMENTATIONS[state.tab === 'accepted' ? state.accepted : state.candidate].code;
  $('sourceCode').innerHTML = code.split('\n').map((line, i) => {
    let text = escapeHTML(line);
    if (!isAgents) text = text.replace(/\b(func|if|return|nil|int|error)\b/g, '<span class="code-keyword">$1</span>');
    return `<span class="code-line"><span class="line-number" aria-hidden="true">${i + 1}</span>${text || ' '}</span>`;
  }).join('');
  $('codeFilename').innerHTML = isAgents ? `pkg/inventory/AGENTS.md <span>• ${state.guidance ? 'loaded' : 'preview · not added'}</span>` : `pkg/inventory/inventory.go <span>• ${state.tab === 'accepted' ? 'accepted' : 'proposed'}</span>`;
  $('codeBadge').textContent = isAgents ? 'MD' : 'GO';
  $('typeNote').textContent = isAgents ? 'Plain Markdown. Linked checks enforce the selected rules.' : 'All example implementations satisfy Inventory.';
  for (const tab of document.querySelectorAll('[data-tab]')) {
    const selected = tab.dataset.tab === state.tab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) $('codePanel').setAttribute('aria-labelledby', tab.id);
  }
}
function render() {
  $('contractToggle').setAttribute('aria-pressed', String(state.guidance));
  $('contractToggleText').textContent = state.guidance ? 'AGENTS.md added' : 'Add AGENTS.md';
  $('fileStatus').textContent = state.guidance ? 'LOADED' : 'NOT ADDED';
  $('fileStatus').classList.toggle('added', state.guidance);
  $('contractIntro').innerHTML = state.guidance ? 'Rules live beside the code.<br>Click a promise to inspect its evidence.' : 'A little context goes a long way.<br>Add the file. Make the promises explicit.';
  $('guidanceStatus').textContent = state.guidance ? 'Guidance loaded' : 'Guidance absent';
  $('checksStatus').textContent = state.checks ? `${state.rules.length} checks enabled` : 'Checks disabled';
  $('guidanceDot').classList.toggle('active', state.guidance);
  $('checksDot').classList.toggle('active', state.checks);
  $('modeBadge').textContent = state.checks ? (state.rules.length ? 'CHECKS ON' : 'NO RULES') : (state.guidance ? 'GUIDANCE ONLY' : 'NO CONTRACT');
  $('modeBadge').classList.toggle('active', state.checks && state.rules.length > 0);
  $('guidanceToggle').checked = state.guidance;
  $('checksToggle').checked = state.checks;
  $('beforeValue').textContent = state.before;
  $('requestValue').textContent = state.qty;
  $('afterValue').textContent = state.after;
  $('afterValue').classList.toggle('negative', typeof state.after === 'number' && state.after < 0);
  $('evidenceTitle').textContent = state.evidenceTitle;
  $('evidenceDetail').textContent = state.detail;
  $('evidenceIcon').textContent = state.resultType === 'bad' ? '×' : state.resultType === 'good' ? '✓' : '↗';
  $('resultMessage').textContent = state.result;
  $('resultMessage').className = `result-message ${state.resultType}`;
  $('eventLog').replaceChildren(...state.logs.slice(0,2).map(message => { const el=document.createElement('span');el.textContent=`› ${message}`;return el; }));
  $('liveStock').textContent = `Stock: ${state.stock}`;
  renderRules(); renderCode();
  workshop.setScene({ pose:state.pose,stock:state.stock,protected:state.checks,guidance:state.guidance,bubble:state.bubble });
}
function syncPlayback(status) {
  $('playLabel').textContent = status.playing ? 'Pause' : status.finished ? 'Replay' : status.index < 0 ? 'Run demo' : 'Continue';
  $('playIcon').textContent = status.playing ? 'Ⅱ' : '▶';
  $('play').setAttribute('aria-label', status.playing ? 'Pause simulation' : status.finished ? 'Replay simulation' : 'Play simulation');
  $('eventCount').textContent = status.index < 0 ? 'READY' : `${String(status.index+1).padStart(2,'0')} / ${String(status.total).padStart(2,'0')}`;
  $('progress').style.width = `${status.total ? (status.index+1)/status.total*100 : 0}%`;
  $('step').disabled = status.finished;
  workshop.setPreferences({paused:!status.playing,speed:status.speed,skin:state.skin,reducedMotion:state.reducedMotion,slapstick:state.slapstick});
}

function runLive(qty, reset = false) {
  if (reset) state.stock = 5;
  const c = runOperation(state.accepted, state.stock, qty);
  state.stock = c.after; showCase(c);
  $('requestFeedback').textContent = `${c.error??'Success'} · stock ${c.before} → ${c.after}`;
  return c;
}
function checkCandidate() {
  state.results = evaluate(state.candidate, state.rules);
  const failed = state.results.results.find(r => !r.pass);
  if (failed) {
    showRule(failed.ruleId, false);
    const c = failed.cases.find(c => !c.pass); showCase(c);
    setEvidence(`${failed.ruleId} caught the shortcut.`, RULES.find(r=>r.id===failed.ruleId).description, 'bad', resultForCase(c));
  } else {
    setEvidence(state.rules.length ? 'The promises still hold.' : 'No enabled checks.', state.rules.length ? 'Every enabled check passed against fresh, isolated stock. The live stockroom was untouched.' : 'With every rule disabled, this gate has no behavioral evidence to require.', state.rules.length ? 'good' : '', `${state.results.results.filter(r=>r.pass).length} / ${state.rules.length} enabled rules passed.`);
  }
}
function beep() {
  if (!state.sound) return;
  try {audioContext ??= new (window.AudioContext||window.webkitAudioContext)();const oscillator=audioContext.createOscillator();const gain=audioContext.createGain();oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.type='sine';oscillator.frequency.setValueAtTime(290,audioContext.currentTime);oscillator.frequency.exponentialRampToValueAtTime(90,audioContext.currentTime+.13);gain.gain.setValueAtTime(.075,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.16);oscillator.start();oscillator.stop(audioContext.currentTime+.17);}catch{}
}
function applyEvent(event, index) {
  if (event.mutate) event.mutate();
  state.pose = event.pose || 'idle'; state.bubble = event.bubble;
  $('sceneNumber').textContent = String(index+1).padStart(2,'0');
  $('sceneTitle').textContent = event.title;
  $('sceneDescription').textContent = event.description;
  if (event.pose === 'bonk' && (!state.slapstick || state.reducedMotion)) {
    $('sceneTitle').textContent = 'A precise course correction.';
    $('sceneDescription').textContent = 'Rejected. The bot gets the failing rule and returns to the repair bench.';
  }
  log(event.title);
  if (event.pose === 'bonk' && state.slapstick && !state.reducedMotion) beep();
  render();
  if (event.announce) announce(`${event.title} ${event.description}`);
}
const beat = (pose,title,description,duration=2200,mutate,bubble) => ({pose,title,description,duration,mutate,bubble});

function makeProposal(candidate, guided, checked, comparison) {
  const initial = evaluate(candidate,state.rules);
  const shouldReject = checked && !initial.pass;
  const requestQty = ['offbyone','rejectall'].includes(candidate) ? 2 : 8;
  const events = [];
  if (comparison) events.push(beat('idle','Same starting point. Same tiny change.','Rewind: the accepted source is sound, and stock is back at 5.',1600,()=>{state.accepted='safe';state.stock=5;state.before=5;state.qty=requestQty;state.after='—';state.results=null;},'A fresh start.'));
  else events.push(beat('idle','A fresh stockroom for this experiment.','Stock resets to 5 before the new proposal. The accepted source stays unchanged.',1800,()=>{state.stock=5;state.before=5;state.qty=requestQty;state.after='—';state.results=null;$('requestFeedback').textContent='New experiment: stock reset to 5; accepted source unchanged.';setEvidence('New experiment. Same accepted source.','Stock is explicitly reset to five for a repeatable comparison. Submitting a patch does not change accepted code.','','Stock reset to 5; new proposal pending.');},'Five blocks. New idea.'));
  if (guided && comparison) {
    events.push(beat('reading','A contract arrives beside the code.','pkg/inventory/AGENTS.md appears. The bots read the package rules.',2400,()=>{state.guidance=true;state.checks=false;state.tab='agents';setEvidence('Give the bot the missing context.','The file documents the promises. Reading it is separate from enforcing them.','','Guidance loaded. Linked checks are next.');},'Let me read that.'));
    events.push(beat('checking','Now connect the promises to checks.','The validation gate is enabled as a separate step.',1900,()=>{state.checks=checked;state.tab='proposal';},'Read it. Check it.'));
  }
  events.push(beat('walking',guided?'Let’s test the very same shortcut.':'Here comes a very confident shortcut.',guided?'We deliberately replay the bad proposal to test the gate.':'Our builder proposes a smaller implementation. What could go wrong?',1900,()=>{state.candidate=candidate;state.tab='proposal';state.results=null;},'One tiny change…'));
  events.push(beat('typing',IMPLEMENTATIONS[candidate].title,'The proposed code changes. The public Go interface stays the same.',2400,()=>{setEvidence('The shape is still correct.','The proposal still provides Reserve(qty int) error and Available() int. Its behavior is the question.','','Candidate awaiting verification.');},'Fewer lines. Nice.'));
  events.push(beat('compiling','The interface says: yes.','A matching method signature doesn’t prove the intended behavior.',2100,()=>{setEvidence('Interface satisfied. Behavior unproven.','All five implementations in this workshop satisfy the same Go interface.','','Simulated type check: PASS.');},'It compiles!'));
  if (checked) events.push(beat('checking','Run the linked behavioral checks.','Each test gets fresh stock. The accepted package stays untouched.',2000,checkCandidate,'Show me the evidence.'));
  if (shouldReject) {
    events.push({...beat('rejected','That patch is not getting through.','The failing rule is highlighted. Accepted code and live stock are unchanged.',2300,()=>{checkCandidate();log(`Rejected ${candidate}; accepted source remains ${state.accepted}.`);},'Ah. The rules.'),announce:true});
    events.push(beat('bonk','A small course correction.','One foam-paddle bonk. Then back to the rule and the repair bench.',1600,undefined,'BONK!'));
    events.push(beat('repairing','Read the failure. Fix the implementation.','The bot restores the guards before changing stock.',2800,()=>{state.candidate='safe';state.results=null;setEvidence('A repair with a reason.','Invalid requests return an error before any mutation. Valid requests reserve exactly the requested amount.','','Repair proposed; acceptance is still pending.');},'Guards before shortcuts.'));
    events.push(beat('checking','The repaired proposal keeps its promises.','Run the same enabled checks against the repaired implementation.',1800,checkCandidate,'Try that again.'));
    events.push(beat('accepted','Accepted. The contract held.','Only the passing implementation becomes the accepted source.',1600,()=>{state.accepted='safe';},'Checks passed.'));
    events.push({...beat('accepted','A rejected request can be correct behavior.','Reserve(8) returns an error. The five stock blocks stay exactly where they were.',2600,()=>{const c=runLive(8,true);setEvidence('Reservation refused. Contract preserved.','Overselling returns ErrInsufficientStock without changing stock. The implementation passed; this particular request was invalid.','good',`${c.error}; stock stays ${c.after}.`);},'Not enough stock.'),announce:true});
    events.push({...beat('celebrating','And valid work still gets done.','Reserve(2) succeeds. Stock goes from 5 to 3. Try your own requests below.',3000,()=>{const c=runLive(2,true);showRule('INV-04',false);setEvidence('Useful work. Predictable behavior.','The valid request succeeds and reserves exactly two items. The same interface now carries the intended behavior.','good',`nil; stock ${c.before} → ${c.after}.`);},'Contract kept. Ship it.'),announce:true});
  } else {
    events.push(beat('accepted',checked?'The enabled gate accepts this proposal.':'No gate. The shortcut gets accepted.',checked?'Only enabled checks participate in acceptance.':'The type check passed, so the unchecked change reaches the package.',1700,()=>{state.accepted=candidate;},checked?'Through the gate.':'Ship it!'));
    events.push({...beat('chaos',requestQty===8?'Five in stock. Eight reserved. Oops.':'The request looks valid. The result isn’t.',checked?'A missing rule leaves a hole in this contract.':'The interface is satisfied. The behavior has gone off the rails.',3400,()=>{const c=runLive(requestQty,true);state.results=evaluate(candidate,state.rules);const failed=state.results.results.find(r=>!r.pass);if(failed)showRule(failed.ruleId,false);setEvidence(c.after<0?'The interface let this through.':'A promise slipped through.',c.after<0?'Three red debt blocks appear below zero. Nothing in the method signature forbids this.':`Requested ${requestQty}. Expected stock ${5-requestQty} and nil; observed stock ${c.after} and ${c.error??'nil'}.`,'bad',`${c.error??'nil'}; stock ${c.before} → ${c.after}. Observed after acceptance.`);},'But it compiled…'),announce:true});
    if (candidate==='unchecked') events.push(beat('chaos','A negative order creates free stock.','Fresh test input: Reserve(-2) turns 5 into 7. That is another broken promise.',2500,()=>{const c=runLive(-2,true);showRule('INV-02',false);setEvidence('Free inventory? Not quite.','The method subtracts a negative quantity. It should reject that input and preserve stock.','bad',`Expected ErrInvalidQuantity and stock 5. Observed nil and stock ${c.after}.`);},'Free inventory?'));
    events.push({...beat('idle',checked?'A gate is only as good as its rules.':guided?'Instructions help. Checks still matter.':'Give these bots a contract.',checked?'Enable the missing rule and send this proposal again.':guided?'The file is present, but the gate is off. Turn checks on to block the shortcut.':'Turn on AGENTS.md above to replay the same change with linked checks.',2200,undefined,'There has to be a rule.'),announce:true});
  }
  return events;
}

function resetComparison(on, autoplay=false) {
  sequenceKind='comparison';state.story=on?'protected':'unprotected';
  state.guidance=on;state.checks=false;state.accepted='safe';state.candidate='unchecked';state.stock=5;
  state.before=5;state.qty=8;state.after='—';state.results=null;state.logs=[];state.tab='proposal';state.pose='idle';state.bubble='Ready to ship.';
  setEvidence('A signature isn’t a promise.','Reserve(qty int) error tells us how to call it. It doesn’t say whether stock can go below zero.','','Waiting for the first proposal.');
  $('sceneTitle').textContent=on?'The same experiment. With a contract.':'Meet your very confident team.';
  $('sceneDescription').textContent='Both comparisons begin with correct source and five stock blocks.';$('sceneNumber').textContent='01';
  $('requestFeedback').textContent='Operations use the accepted implementation. Stock starts at 5.';
  timeline.load(makeProposal('unchecked',on,on,true));render();if(autoplay)timeline.play();
}
function cancelForExploration() {
  timeline.load([]);sequenceKind='exploration';state.pose='idle';state.bubble='Your move.';state.results=null;
}
function auditAccepted(message) {
  const audit=evaluate(state.accepted,state.rules);
  setEvidence(message,audit.pass?'The accepted implementation passes the currently enabled checks.':'There is already a defect in the accepted source. Enabling checks does not repair it; submit a proposal to trigger the repair loop.',audit.pass?'good':'bad',`${audit.results.filter(r=>r.pass).length} / ${state.rules.length} checks pass on accepted source.`);
  state.results=audit;const failed=audit.results.find(r=>!r.pass);if(failed)showRule(failed.ruleId,false);
  $('sceneTitle').textContent=message;$('sceneDescription').textContent='Exploration keeps the existing accepted source. Start a reckless proposal or replay the comparison.';
}
function downloadRules() {
  const blob=new Blob([agentsMarkdown(state.rules)],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='AGENTS.md';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('AGENTS.md downloaded with the currently selected rules.');
}

$('ruleList').innerHTML=RULES.map(rule=>`<div class="rule-row" data-rule-row="${rule.id}"><input type="checkbox" checked aria-label="Enable ${rule.id}: ${escapeHTML(rule.title)}" data-rule-toggle="${rule.id}"><button class="rule-select" data-rule="${rule.id}"><span>${rule.id}</span><strong>${escapeHTML(rule.title)}</strong></button><span class="rule-status" role="img"></span></div>`).join('');
timeline=new Timeline({onEvent:applyEvent,onChange:syncPlayback});
$('play').addEventListener('click',()=>{
  const status=timeline.status;
  if(status.playing){timeline.pause();return;}
  if(status.finished){
    if(sequenceKind==='injection'&&injectionBaseline){Object.assign(state,injectionBaseline);timeline.load(makeProposal(state.candidate,state.guidance,state.checks,false));render();}
    else resetComparison(state.guidance,false);
  }
  timeline.play();
});
$('step').addEventListener('click',()=>timeline.step());
$('restart').addEventListener('click',()=>{resetComparison(state.guidance,false);announce('Comparison reset to the same correct source and stock 5.');});
$('speed').addEventListener('change',e=>timeline.setSpeed(Number(e.target.value)));
$('contractToggle').addEventListener('click',()=>resetComparison(!state.guidance,true));
$('watchLink').addEventListener('click',()=>{if(!timeline.status.playing)timeline.play();});
document.querySelectorAll('[data-rule]').forEach(button=>button.addEventListener('click',()=>showRule(button.dataset.rule)));
document.querySelectorAll('[data-rule-toggle]').forEach(input=>input.addEventListener('change',()=>{
  cancelForExploration();state.rules=input.checked?[...state.rules,input.dataset.ruleToggle]:state.rules.filter(id=>id!==input.dataset.ruleToggle);state.rules=allRules.filter(id=>state.rules.includes(id));
  auditAccepted(input.checked?'A promise restored.':'The contract just got smaller.');render();announce(`${input.dataset.ruleToggle} ${input.checked?'enabled':'disabled'}.`);
}));
document.querySelectorAll('[data-tab]').forEach(button=>{
  button.addEventListener('click',()=>{state.tab=button.dataset.tab;renderCode();});
  button.addEventListener('keydown',event=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...document.querySelectorAll('[data-tab]')];const i=tabs.indexOf(button);const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();});
});
$('tryRequest').addEventListener('click',()=>{
  const qty=Number($('quantity').value);if($('quantity').value.trim()===''||!Number.isInteger(qty)||qty < -20||qty>20){$('requestFeedback').textContent='Enter a whole number from −20 to 20.';announce('Enter a whole number from minus 20 to 20.');return;}
  cancelForExploration();const c=runLive(qty);const expectedError=qty<=0?'ErrInvalidQuantity':qty>c.before?'ErrInsufficientStock':null;const expectedAfter=expectedError?c.before:c.before-qty;const correct=c.error===expectedError&&c.after===expectedAfter&&c.after>=0;
  state.pose=correct?(c.error?'accepted':'celebrating'):'chaos';state.bubble=correct?'Contract kept.':'That seems wrong.';
  setEvidence(correct?'The operation kept its promises.':'This operation broke a promise.',`Using the accepted ${IMPLEMENTATIONS[state.accepted].title.toLowerCase()} implementation.`,correct?'good':'bad',`Expected ${expectedError??'nil'}, stock ${expectedAfter}. Observed ${c.error??'nil'}, stock ${c.after}.`);
  $('requestFeedback').textContent=`${c.error??'Success'} · stock ${c.before} → ${c.after}`;$('sceneTitle').textContent=`Reserve(${qty}) on accepted code`;$('sceneDescription').textContent=correct?'The operation matches the full reference contract.':'The accepted implementation still contains a defect. Send a patch with checks enabled to repair it.';render();announce($('requestFeedback').textContent);
});
$('resetStock').addEventListener('click',()=>{cancelForExploration();state.stock=5;state.before=5;state.qty='—';state.after='—';$('requestFeedback').textContent='Stock reset to 5. Accepted source is unchanged.';setEvidence('Fresh stock. Same implementation.','The stockroom is back to five. Run a request to collect new evidence.','','No operation has run since the reset.');$('sceneTitle').textContent='The stockroom is ready again.';$('sceneDescription').textContent='Stock reset to 5. Accepted source is unchanged.';render();announce('Stock reset to 5.');});
$('inject').addEventListener('click',()=>{
  timeline.pause();state.candidate=$('defect').value;state.results=null;state.tab='proposal';state.logs=[];sequenceKind='injection';
  injectionBaseline={candidate:state.candidate,accepted:state.accepted,stock:state.stock,guidance:state.guidance,checks:state.checks,rules:[...state.rules]};
  timeline.load(makeProposal(state.candidate,state.guidance,state.checks,false));render();timeline.play();$('lab').scrollIntoView({behavior:state.reducedMotion?'instant':'smooth',block:'start'});
});
$('guidanceToggle').addEventListener('change',e=>{cancelForExploration();state.guidance=e.target.checked;auditAccepted(state.guidance?'The bot can read the rules.':'The instructions have been removed.');render();announce('Guidance changed. Accepted source is unchanged.');});
$('checksToggle').addEventListener('change',e=>{cancelForExploration();state.checks=e.target.checked;auditAccepted(state.checks?'Future proposals face the gate.':'The gate is now disabled.');render();announce('Check gate changed. Accepted source is unchanged.');});
for(const id of ['download','downloadHeader'])$(id).addEventListener('click',downloadRules);
$('skin').addEventListener('change',e=>{state.skin=e.target.value;syncPlayback(timeline.status);});
$('slapstick').addEventListener('change',e=>{state.slapstick=e.target.checked;syncPlayback(timeline.status);});
$('sound').addEventListener('change',e=>{state.sound=e.target.checked;if(state.sound)beep();});
$('motion').checked=state.reducedMotion;
$('motion').addEventListener('change',e=>{state.reducedMotion=e.target.checked;syncPlayback(timeline.status);});
motionMedia.addEventListener('change',e=>{state.reducedMotion=e.matches;$('motion').checked=e.matches;syncPlayback(timeline.status);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)timeline.pause();});
window.addEventListener('pagehide',()=>{timeline.pause();audioContext?.suspend();});
resetComparison(false,false);

