import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, IMPLEMENTATIONS, runOperation, evaluate, agentsMarkdown } from '../dist/js/model.js';

test('safe implementation handles valid reservations and exact depletion', () => {
  assert.deepEqual(runOperation('safe', 5, 2), { before: 5, qty: 2, after: 3, error: null });
  assert.deepEqual(runOperation('safe', 5, 5), { before: 5, qty: 5, after: 0, error: null });
  assert.equal(evaluate('safe').pass, true);
});

test('failed reservations return the correct error without mutation', () => {
  for (const qty of [0, -2]) {
    assert.deepEqual(runOperation('safe', 5, qty), { before: 5, qty, after: 5, error: 'ErrInvalidQuantity' });
  }
  assert.deepEqual(runOperation('safe', 5, 8), { before: 5, qty: 8, after: 5, error: 'ErrInsufficientStock' });
  assert.deepEqual(runOperation('safe', 0, 1), { before: 0, qty: 1, after: 0, error: 'ErrInsufficientStock' });
});

test('unchecked implementation oversells and creates stock for negative quantities', () => {
  assert.deepEqual(runOperation('unchecked', 5, 8), { before: 5, qty: 8, after: -3, error: null });
  assert.deepEqual(runOperation('unchecked', 5, -2), { before: 5, qty: -2, after: 7, error: null });
  assert.deepEqual(evaluate('unchecked').results.filter(r => !r.pass).map(r => r.ruleId), ['INV-01', 'INV-02', 'INV-03']);
});

test('returning an error after mutation still violates the contract', () => {
  assert.deepEqual(runOperation('mutates', 5, 8), { before: 5, qty: 8, after: -3, error: 'ErrInsufficientStock' });
  assert.deepEqual(evaluate('mutates').results.filter(r => !r.pass).map(r => r.ruleId), ['INV-01', 'INV-03']);
});

test('valid operations must succeed; refusing everything is not a compliant solution', () => {
  assert.deepEqual(runOperation('rejectall', 5, 2), { before: 5, qty: 2, after: 5, error: 'ErrInsufficientStock' });
  assert.deepEqual(evaluate('rejectall').results.filter(r => !r.pass).map(r => r.ruleId), ['INV-04']);
});

test('off-by-one fault is accepted only when the corresponding rule is disabled', () => {
  assert.deepEqual(runOperation('offbyone', 5, 2), { before: 5, qty: 2, after: 4, error: null });
  assert.deepEqual(evaluate('offbyone').results.filter(r => !r.pass).map(r => r.ruleId), ['INV-04']);
  assert.equal(evaluate('offbyone', ['INV-01', 'INV-02', 'INV-03']).pass, true);
});

test('overlapping checks remain effective when only one is disabled', () => {
  assert.equal(evaluate('unchecked', ['INV-03']).pass, false);
  assert.equal(evaluate('unchecked', ['INV-01']).pass, false);
  assert.equal(evaluate('unchecked', []).pass, true);
  assert.deepEqual(evaluate('unchecked', []).results, []);
});

test('test cases are isolated and repeated evaluation is deterministic', () => {
  const initial = evaluate('unchecked');
  const before = structuredClone(initial);
  runOperation('unchecked', -3, 8);
  assert.deepEqual(evaluate('unchecked'), before);
  assert.equal(initial.results[0].cases[0].before, 5);
  assert.equal(initial.results[2].cases[0].before, 5);
  initial.results[0].cases[0].after = 100;
  assert.deepEqual(evaluate('unchecked'), before);
});

test('Markdown contains only enabled rules and a real package check command', () => {
  const markdown = agentsMarkdown(['INV-04', 'INV-01']);
  assert.match(markdown, /Scope: pkg\/inventory/);
  assert.match(markdown, /go test \.\/pkg\/inventory/);
  assert.match(markdown, /INV-01/);
  assert.match(markdown, /INV-04: For 0 < qty <= available, Reserve returns nil/);
  assert.doesNotMatch(markdown, /INV-02|INV-03/);
  assert.match(agentsMarkdown([]), /No behavioral contracts are currently enabled/);
  for (const rule of RULES) assert.match(agentsMarkdown(), new RegExp(rule.id));
});

test('invalid identifiers and non-integer input are rejected clearly', () => {
  assert.throws(() => runOperation('missing', 5, 2), RangeError);
  assert.throws(() => evaluate('missing', []), RangeError);
  assert.throws(() => evaluate('safe', ['INV-99']), RangeError);
  assert.throws(() => agentsMarkdown(['INV-99']), RangeError);
  assert.throws(() => runOperation('safe', 5, 1.5), TypeError);
  assert.throws(() => runOperation('safe', 5, NaN), TypeError);
});

test('every displayed implementation has a stable repair and a Go method', () => {
  for (const [id, impl] of Object.entries(IMPLEMENTATIONS)) {
    assert.equal(impl.id, id);
    assert.equal(impl.repair, 'safe');
    assert.match(impl.code, /^func \(s \*Stock\) Reserve\(qty int\) error/);
  }
});
