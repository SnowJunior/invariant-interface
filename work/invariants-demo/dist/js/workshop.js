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
export function mountWorkshop(container) {
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
