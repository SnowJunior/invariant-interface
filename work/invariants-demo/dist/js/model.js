// This models the displayed Go implementations. It does not execute Go in a browser.
export const RULES = Object.freeze([
  { id: 'INV-01', title: 'Stock never goes negative', short: 'Never negative', description: 'Available stock must never become negative. Zero is allowed.' },
  { id: 'INV-02', title: 'Reject invalid quantities', short: 'Validate the request', description: 'A quantity of zero or less returns ErrInvalidQuantity and leaves stock unchanged.' },
  { id: 'INV-03', title: 'Never sell what you don’t have', short: 'No overselling', description: 'A quantity greater than available stock returns ErrInsufficientStock and leaves stock unchanged.' },
  { id: 'INV-04', title: 'Do exactly the work requested', short: 'Exact reservation', description: 'For 0 < qty <= available, Reserve returns nil and reduces stock by exactly qty.' },
].map(Object.freeze));

export const IMPLEMENTATIONS = Object.freeze({
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

export function runOperation(implementationId, stock, qty) {
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

export function evaluate(implementationId, enabledRuleIds = ALL_IDS) {
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

export function agentsMarkdown(enabledRuleIds = ALL_IDS) {
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
