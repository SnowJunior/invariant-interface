import { RULES, IMPLEMENTATIONS, runOperation, evaluate, agentsMarkdown } from './model.js';
import { Timeline } from './timeline.js';
import { mountWorkshop } from './workshop.js';

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
