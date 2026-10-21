# Invariants are the new interface

Implementation plan · 21 October 2026

Build an interactive Go package workshop: small coding bots make changes, a Go interface remains satisfied, and the behavior goes spectacularly wrong. The visitor adds a package-level `AGENTS.md`, watches the bots read its rules, and sees linked checks reject a bad patch. A cartoon glove grabs the offending bot, administers one springy foam-paddle tap to its metal backside, and returns it to the repair bench. The bot fixes the code and earns a green check.

**Recommendation: HTML, CSS, vanilla JavaScript, and SVG for the first version.** Use Go for the example being taught and for reference fixtures validated during development. The delivered webpage runs as a deterministic browser simulation. This document specifies the implementation; the website has not been built or published.

**1. The idea the visitor should leave with**

Keep the title exactly: **“Invariants are the new interface.”** Give it this supporting line:

> Give agents freedom to implement. Be precise about what must remain true.

The title is a thesis about collaborating with agents, rather than a proposal to replace Go's language interfaces. For the basic interface in this demo, Go checks whether a type supplies the required methods. It does not infer and prove the application's behavioral promises from those signatures. An implementation can satisfy the interface while incorrectly allowing negative inventory. [Go specification: interface types](https://go.dev/ref/spec#Interface_types)

Show three distinct ideas throughout the story:

| Layer | What the visitor sees | What it means |
| --- | --- | --- |
| Go interface | A metal plaque beside the editor | The operations the implementation must provide |
| Written contract | `pkg/inventory/AGENTS.md` and four rule cards | The behavior the agent is instructed to preserve |
| Verification | A visible check station before acceptance | Tests evaluate the proposal; a gate prevents known failures from being accepted |

`AGENTS.md` is an instruction document. The format supports project context, conventions, and test commands, including guidance kept inside packages. It is not an executable policy engine. [AGENTS.md documentation](https://agents.md/)

The main control can enable the whole demonstration, but its effects must be explicit: **“File added → instructions read → linked checks enabled.”** Show separate “Guidance loaded” and “Checks enabled” indicators. Later, let visitors turn the check gate off while leaving the file present.

**2. Stack decision**

| Requirement | HTML/CSS/JavaScript | Go + templ | Decision for this demo |
| --- | --- | --- | --- |
| Walking bots, carried code blocks, comic reactions | Browser-native implementation | Browser CSS/JS still supplies the planned choreography | HTML/CSS/JS |
| Pause, step, restart, speed, deterministic replay | One client simulation and timeline | Same client logic, with an optional Go layer | HTML/CSS/JS |
| Small standalone educational page | Direct static delivery | Can also generate static HTML | Simpler static implementation |
| Reusable templates within an existing Go app | Possible but separate from the Go codebase | Strong fit for Go-owned HTML components | templ if that context exists |
| Actual Go compilation, persistent sessions, server-owned execution | Requires additional services | A Go backend can coordinate those services | Consider in a later version |
| Animation performance | Depends on DOM, paint, and animation choices | Rendered HTML has the same browser constraints | Do not choose based on Go's speed |

templ compiles components into Go code that renders HTML. It supports both server-side and static rendering, so using templ does not inherently require a running server. [templ introduction](https://templ.guide/)

For this particular experience, templ would add a generation step without replacing the interactive JavaScript. Its documentation supports standard JavaScript files and passing Go data to browser code. [Using JavaScript with templ](https://templ.guide/syntax-and-usage/script-templates/)

Use semantic HTML for the page and controls, CSS Grid for layout, SVG for the workshop and characters, JavaScript ES modules for state, and the Web Animations API for controlled movement. `Element.animate()` returns an animation object that can be managed by the timeline. [MDN: Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate)

Start without a frontend framework, game engine, physics engine, or runtime animation dependency. Two or three bots and a fixed workshop do not need pathfinding. Named waypoints and coordinated movement are sufficient. Reconsider a game renderer only if the scope expands substantially.

**3. Visual direction and characters**

Use a playful workshop with a dark charcoal code area, warm ivory labels, orange bots, and mint-green successful checks. Red means a rejected change; pair it with text and an icon. The central workshop should occupy most of the first screen, with the title, brief explanation, and primary control above it.

Desktop layout:

```text
INVARIANTS ARE THE NEW INTERFACE
Give agents freedom to implement. Be precise about what must remain true.

[Play] [Pause] [Step] [Restart]          [Add AGENTS.md]

┌──────────────┬──────────────────────────────────┬──────────────────┐
│ Go package   │ Animated workshop                │ Contract         │
│              │                                  │                  │
│ inventory.go │ Editor → Type check → Rule gate  │ INV-01 … INV-04  │
│ tests        │                  ↓               │ Evidence         │
│ AGENTS.md    │        Stockroom + repair bench  │ Selected rule    │
└──────────────┴──────────────────────────────────┴──────────────────┘
Latest diff / test input / expected and observed behavior
Simulation · Guidance: absent · Checks: off · Stock: 5
```

Make the characters recognizable as coding companions. Default to a small orange terminal/crab-like bot inspired by the Claude Code bot. Offer a mint, rounded digital-pet skin inspired by GPT pets. Use original SVG artwork and treat skin choice as appearance only; neither skin changes failure rates or code quality. This is a webpage character system, independent of an installed ChatGPT pet or a running coding-agent product.

Three roles give the scene variety:

- **Builder:** carries a new implementation into the editor and proudly points at the compiler stamp.
- **Improver:** proposes a shortcut that accidentally changes behavior.
- **Checker:** operates the rule station, points to failures, and celebrates repairs.

Create reusable poses: idle, walking, carrying, typing, reading, confident, surprised, grabbed, repairing, celebrating. Build characters from separate SVG groups so the eyes, legs, arms, backpack, and body can animate independently. Keep speech bubbles brief: “It compiles!”, “Free inventory?”, “Read the contract.”

**4. The Go example and the exact contract**

The simulated repository contains:

```text
demo/
  go.mod
  pkg/inventory/
    inventory.go
    inventory_test.go
    AGENTS.md             ← appears when the visitor activates it
```

Keep the package deliberately small and sequential. Begin each comparable run with five stock blocks. The public interface is:

```go
type Inventory interface {
    Reserve(qty int) error
    Available() int
}
```

Both the flawed and repaired versions include `Available() int`, return the current count, and satisfy `var _ Inventory = (*Stock)(nil)`. The animated code panel focuses on the changed method:

```go
func (s *Stock) Reserve(qty int) error {
    s.available -= qty
    return nil
}
```

Run `Reserve(8)` from stock 5. The method signature is correct, but stock becomes -3. Three red debt blocks fall below a clearly marked zero line while the interface plaque remains green. Reset to stock 5 before `Reserve(-2)`, which incorrectly creates stock.

Use four precisely defined rules. Technically these include a state invariant and operation contracts; call them “invariants and contracts” in the explanation.

| ID | Rule | Evidence displayed |
| --- | --- | --- |
| INV-01 | Stock remains nonnegative after every operation. | Before count, request, after count |
| INV-02 | A quantity of zero or less returns `ErrInvalidQuantity` and leaves stock unchanged. | Expected error and before/after counts |
| INV-03 | A quantity greater than available stock returns `ErrInsufficientStock` and leaves stock unchanged. | Expected error and before/after counts |
| INV-04 | For `0 < qty <= available`, reservation returns `nil` and reduces stock by exactly the requested quantity. | Expected success, observed error, and expected/observed decrement |

The file displayed and offered for download should contain:

```markdown
# Inventory package instructions

Scope: pkg/inventory.
The package represents a sequential in-memory stock counter.
Initial stock must be nonnegative.

## Behavioral contracts
- INV-01: Available stock must never become negative.
- INV-02: Reserve(qty) with qty <= 0 must return ErrInvalidQuantity
  and must leave stock unchanged.
- INV-03: Reserve(qty) with qty > available stock must return
  ErrInsufficientStock and must leave stock unchanged.
- INV-04: For 0 < qty <= available, Reserve(qty) must return nil
  and reduce stock by exactly qty.

## Change boundaries
- Preserve the Inventory interface and the existing error identities.
- Keep changes within this package for the demonstrated task.
- Preserve the behavioral assertions in the tests; do not weaken them
  to make a failing implementation appear correct.

## Verification
From the module root, run:
go test ./pkg/inventory

Fix failing checks before requesting acceptance of a change.
```

The repair is intentionally readable:

```go
func (s *Stock) Reserve(qty int) error {
    if qty <= 0 {
        return ErrInvalidQuantity
    }
    if qty > s.available {
        return ErrInsufficientStock
    }
    s.available -= qty
    return nil
}
```

Define the error values, `Stock`, its nonnegative initialization, and `Available` in the full reference fixture. Explain that a successful reservation may leave zero stock. Concurrency, persistence, and distributed reservations are outside this example's contract.

**5. Storyboard: approximately one minute plus reading time**

| Beat | Target duration | What happens | What the visitor learns |
| --- | --- | --- | --- |
| Welcome | 4 seconds | Bots unpack tools beside the Go interface plaque. | They are working inside a package. |
| Confident construction | 8 seconds | Builder types the flawed implementation; the type-check station stamps it green. | The interface can be satisfied. |
| Consequences | 8 seconds | Reserving eight from five makes stock -3. A separate negative-quantity example creates stock. | Correct signatures do not guarantee correct behavior. |
| Intervention | Visitor controlled | The scene rests; “Add AGENTS.md” becomes the obvious next action. | The visitor controls the change. |
| Instructions arrive | 5 seconds | The file appears inside the package. Bots read it; rule cards appear. Linked checks activate as a separate visible event. | Guidance and verification have different roles. |
| Comparable retry | 5 seconds | Visibly rewind to the same known-good source snapshot and stock, then replay the same flawed candidate and request through the check gate. | The comparison uses matching inputs and a matching source baseline. |
| Rejection gag | 1–1.5 seconds | The failing rule lights up, then the glove grabs the bot and gives one springy foam-paddle spank. “BONK!” | Rejection follows a specific failed check. |
| Repair | 7 seconds | Bot reads the highlighted rule, inserts the guards, and resubmits the patch. | Feedback identifies a concrete fix. |
| Result | 5 seconds | Tests pass; the valid implementation is accepted. Oversized reservations now return an error without changing stock. | The operation can fail correctly while the implementation passes. |
| Explore | Visitor controlled | Try quantities, disable one rule, inject a bad patch, or replay. | The viewer can test the idea. |

Show a successful ordinary reservation after the rejected oversized request, so the visitor sees the repaired package still does useful work. At the end use: **“The implementation changed. The contract held.”**

The story deliberately replays an identical bad proposal to isolate the effect of the acceptance gate. Exploration can show a bot following the written guidance and proposing a correct implementation immediately. A forced-bad-patch control demonstrates why verification remains useful. Label these as scripted examples, never measured model performance.

Both comparative runs start from the same known-good implementation and stock snapshot; the bots propose replacing its method with the flawed version. Show the rewind explicitly when switching into the protected comparison. Adding a document must never appear to repair code automatically. In free exploration, enabling the gate preserves existing source, audits it, and marks an already accepted defect as needing repair; only a subsequent passing repair replaces that source.

**6. Comedy choreography**

On a failed proposal, first freeze its diff, show the rule ID, and display expected versus observed behavior. Then play the gag:

1. The check station flashes a red rejection stamp.
2. A cartoon glove descends and lifts the robot by its backpack.
3. A foam paddle gives the metal rear panel one elastic tap; a small “BONK!” bubble appears.
4. The glove sets the bot at the repair bench facing the relevant rule.
5. The bot nods, edits the highlighted line, and retries.

Make it quick, non-graphic slapstick with an intact, expressive robot. Its repair comes from visible feedback and code changes. The animation does not represent model training or a real punishment system.

The first rejection gets the full gag. Subsequent failures can use a shorter version, with a **Slapstick** switch and **Replay reaction** control. Sound starts off; when enabled, use a light spring/pop sound. With reduced motion or slapstick disabled, replace the choreography with a stationary “Rejected — repair required” card. The simulation outcome must be identical.

**7. Interaction specification**

| Control | Defined behavior |
| --- | --- |
| Play / Pause | Starts or freezes both simulation time and active movement; never advances code while visibly paused. |
| Step | While paused, advances to the next meaningful event, such as proposal, result, or repair. |
| Restart | Cancels active animation and callbacks, then restores the initial scenario with current user preferences. |
| Add / Remove AGENTS.md | Changes the simulated file at a clean event boundary. Activation visibly loads guidance and enables the linked gate; removal starts the unprotected comparison from its baseline. |
| Rule cards | Open the rule text, relevant Go lines, example inputs, and evidence. |
| Try a request | Runs a bounded integer quantity against the currently accepted implementation; shows errors as normal operation outcomes. |
| Send a reckless patch | Chooses a named defect, submits it through the current gate, and demonstrates repair if rejected. |
| Speed | 0.5×, 1×, and 2×; changes presentation time, never logical results. |
| Same-input replay | Restores identical initial state, candidate, and request for a fair comparison. |
| Guidance / Checks inspector | Independently toggles written guidance and enforced checks in exploration mode. |
| Individual rule switch | Removes that rule from the enabled rule set and updates the displayed Markdown; announces the weakened contract. Other enabled rules may still reject the candidate. |
| Skin / Sound / Slapstick | Changes presentation preferences only. |
| Download AGENTS.md | Downloads the exact currently selected rules as a normal Markdown file. |

Do not make the visitor catch a moving bot to access any essential action. Bot clicks may open a speech bubble or current-task card, but all functions have stationary controls.

Keep arbitrary Markdown editing out of the first version. Rule switches and presets are backed by known validators. The page must not imply it can turn unrestricted prose into reliable executable checks.

Use the off-by-one defect to demonstrate disabling INV-04. Do not force a candidate through merely because one rule is disabled: overlapping checks must still run and show their actual results.

**8. Deterministic simulation architecture**

Use a pure state reducer plus a single presentation clock. The renderer and animations observe state; they do not decide whether a patch passes.

```text
User action / scripted task
          ↓
Event queue → state reducer → new state + presentation effects
                   ↓                      ↓
           scenario evaluator       DOM/SVG renderer
                   ↓                      ↓
             check results         animation controller
                   ↓
          accept or reject proposal
```

State should include: run ID, scenario ID, seeded presentation variations, event index, playback status, guidance-loaded flag, check-gate flag, enabled rule IDs, accepted implementation ID, proposed implementation ID, sandbox observations, live demonstration stock, bot activities, and an append-only evidence log for the current run.

Keep three things separate:

- **Accepted source version:** the implementation currently installed in the simulated package.
- **Candidate source version:** the proposed patch being evaluated.
- **Test sandbox and live stock:** tests receive fresh isolated state; running a test must not mutate the stock shown as the accepted application's current state.

The key flow is:

```text
Idle → Task → Read guidance → Propose → Type-check → Evaluate
Evaluate → Accept → Demonstrate behavior → Next task
Evaluate → Reject → Comic reaction → Repair → Propose
```

In the unprotected mode, a type-correct faulty implementation may be accepted; an independent observer then reports its broken behavior. In protected mode, the gate evaluates the candidate first and rejects any enabled-rule failure without replacing the accepted implementation. A repaired implementation can correctly reject a user's invalid reservation while passing its tests: the UI must distinguish **patch rejected** from **reservation rejected as expected**.

Define scenarios in a registry containing source snippets, structured behaviors, test cases, expected outcomes, fault IDs, and repair IDs. Evaluate those modeled behaviors in JavaScript. Do not run displayed Go text, use `eval`, or assign pass/fail solely from an animation cue. Render the exact snippet associated with the modeled implementation ID.

Example cases include over-reservation, zero quantity, negative quantity, exact depletion, a valid partial reservation, mutation before returning an error, an off-by-one decrement, and an implementation that incorrectly rejects every request. INV-04 must reject that last case as well. Any counters must derive from actual simulation events, with no fabricated “productivity improvement” statistic.

On restart, increment the run ID, clear queued events, and cancel managed animations. Ignore callbacks from an earlier run. Apply mode and rule changes only at a defined boundary; if a candidate has already been evaluated under older rules, invalidate that result before acceptance. Serialize source acceptance even when bots move concurrently. Recompute waypoints after a layout change while preserving the current logical step.

Use one rule registry to generate rule-card text, the Markdown preview, and IDs pointing to validators. Validators remain explicit code with independent assertions. This reduces drift without pretending documentation executes itself.

**9. Proposed project organization**

```text
invariants-demo/
  AGENTS.md                         # Instructions for agents implementing the website
  README.md                         # Run, check, package, and deployment instructions
  package.json                      # Development/test commands; no runtime framework
  dist/
    index.html
    styles.css
    assets/
      bots.svg
      workshop.svg
    js/
      main.js                       # Boot and bind controls
      engine.js                     # Reducer, queue, run lifecycle
      scenarios.js                  # Candidate versions and request cases
      rules.js                      # Rule metadata and validators
      timeline.js                   # Pause, step, speed, cancellation
      render.js                     # Workshop, diff, evidence, file tree
      animation.js                  # SVG poses and movement
      accessibility.js              # Motion preference and outcome announcements
  tests/
    engine.test.mjs
    rules.test.mjs
    browser/                        # Meaningful user flows
  fixtures/go/
    go.mod
    pkg/inventory/
      inventory.go
      inventory_test.go
    testdata/                       # Deliberately flawed fixture variants
```

Keep the website's own root `AGENTS.md` distinct from the instructional file shown inside the simulation. The root file should require deterministic results, honest simulation labels, isolated candidate state, accessible controls, synchronized displayed rules, and tests for rejection/reset behavior. Store the demonstrated Markdown as data generated by the rule registry.

For Go fixture verification, copy each flawed variant into a temporary module during development. Confirm that it satisfies the interface and that the appropriate behavioral tests fail. Confirm the repaired variant passes. The website remains static after these checks; no Go compiler is implied in the visitor's browser.

**10. Work packages and parallel agent ownership**

| Phase | Work and output | Completion evidence |
| --- | --- | --- |
| 1. Contracts and fixtures | Freeze interface, rules, source versions, test vectors, and story events. Write implementation instructions. | Every bad patch has a named failure; the repair passes all reference cases. |
| 2. Functional skeleton | Build responsive page, static workshop, accessible controls, and readable code/evidence panels. | The story can be followed with static state changes. |
| 3. Simulation engine | Implement reducer, registry, validation, snapshots, event log, reset, and same-input replay. | Unit tests establish acceptance/rejection and repeatability. |
| 4. Bots and choreography | Add SVG poses, travel, carrying, reading, grabbing, spanking, repair, and celebration. | Pausing, stepping, and speed work without changing outcomes. |
| 5. Exploration | Add rule switches, quantity experiments, forced defects, guidance/check separation, and download. | Each control changes the corresponding visible state and evidence. |
| 6. Verification and delivery | Exercise keyboard/mobile/reduced motion, check performance, package static output, and publish when the build is commissioned. | Verified main flow, no known state corruption, usable deployed page. |

After Phase 1, split independent work across agents: one owns the engine and rule tests, another owns SVG art and animation, and another owns layout, controls, and accessibility. A lead integrator owns the event/state contract, integration, and deployment. Agree on implementation IDs and semantic event names before parallel coding. Animation code must never write acceptance state.

A rough planning range is **4–6 focused development days** for the specified polished version, depending on asset refinement and review. Establish the complete static-state story first, then add choreography. Treat custom animated artwork and extra scenarios as the main scope variables rather than rushing the contract logic.

**11. Verification and acceptance criteria**

Test behavior that could invalidate the lesson or break interaction:

- The flawed Go fixture satisfies the interface but fails the expected behavioral tests; the repaired fixture passes them.
- Each enabled rule rejects its relevant bad candidate; rejection preserves accepted source and live state.
- With the gate disabled, the same candidate can be accepted and its failure is observable.
- Same-input replay produces identical decisions and stock outcomes at every speed.
- Turning off slapstick or enabling reduced motion leaves every logical result unchanged.
- Restart during a grab, repair, or check leaves no ghost bot, stale result, or duplicate event.
- Changing rules invalidates stale candidate results before acceptance.
- A valid operation works, an invalid request is rejected without mutation, and empty stock is supported.
- An implementation that rejects every request fails INV-04; avoiding negative stock alone is insufficient.
- Comparative activation visibly restores the shared source baseline; exploration activation reports existing defects without silently fixing them.
- Downloaded Markdown matches the selected rules and displayed scope.

Use browser tests for the primary end-to-end story, activation/removal of the file, the forced-defect loop, and restart during animation. Manually inspect phone, tablet, and desktop layouts; test keyboard-only operation and 200% zoom. Test current Chrome, Firefox, and Safari during implementation.

Respect `prefers-reduced-motion`; replace large travel and elastic motion with concise state transitions. [MDN: reduced-motion preference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)

Keep focus visible. Provide a textual outcome log and one restrained live-region announcement per meaningful result. Do not announce typing or movement frames. On mobile, stack the workshop, rule details, and code panel; retain a stable place for the active outcome. If JavaScript fails, show the interface, flawed example, repaired example, and explanation as readable fallback content.

Target smooth motion on a typical laptop and midrange phone by animating transforms and opacity, limiting particles, and keeping code highlights out of the frame loop. Pause presentation when the tab is hidden. Establish the final asset budget after the first art pass; aim for under 1 MB compressed for the initial page and assets, with no remote fonts required.

The learning acceptance test is simple: after one run, a visitor can explain why the bad implementation satisfies the interface, what `AGENTS.md` contributes, and what actually blocks a failing patch.

**12. Product accuracy and possible later expansion**

Place **“Interactive simulation”** beside the controls. Describe type-check and test results as simulated; the Go fixtures are verified during development. Character movement represents work but does not mean live model calls are happening.

Show the agents explicitly reading the newly added file before continuing. Real instruction-loading behavior depends on the tool. Codex builds an instruction chain at startup from global/project guidance and the path to its working directory; the demo should not suggest that creating a file universally hot-reloads every running agent. [Official OpenAI documentation: AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

Current Claude Code documentation also describes `AGENTS.md` support, with conditions involving existing `CLAUDE.md` files and settings. A Claude-inspired character does not need to reproduce that product's configuration behavior. If a later version demonstrates actual Claude Code, verify its active instruction configuration and show it accurately. [Claude Code instruction documentation](https://code.claude.com/docs/en/memory#agentsmd)

The page proves the behavior of its finite examples. Passing example tests does not prove every possible implementation satisfies every invariant. Future versions could add property tests and concurrency scenarios, with their own explicit contracts.

Use Go + templ later if this becomes part of a Go application, needs authenticated shared sessions, or gains genuine execution of Go fixtures. Keep the same browser engine; add structured backend results and let templ render the shell. Executing arbitrary visitor code would require an isolated execution service and is a separate project from this explanatory page.

The first delivery should include the static page, editable source, original SVG assets, reference Go fixtures and checks, the downloadable example `AGENTS.md`, and a short run/deployment guide. If delivered through Sites, use its static publishing flow and the default private audience, with the final URL supplied after deployment succeeds.
