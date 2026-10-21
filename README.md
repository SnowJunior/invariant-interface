# invariant-interface

An interactive companion to the idea that **invariants are the new interface**.

The project demonstrates a Go `Inventory` contract before and after a package-level
`AGENTS.md` establishes the rules that coding agents must preserve. The published
experience includes a procedural Three.js scene where an unchecked agent is gently
redirected to the repair bench, plus the source, test fixtures, and implementation
notes used to build it.

## Run locally

```sh
cd work/invariants-demo
node server.mjs
```

Then open `http://127.0.0.1:4173/3d.html`.

## Project layout

- `outputs/invariant-lab-3d.html` — standalone GitHub Pages experience
- `work/invariants-demo/` — editable source and deterministic motion tests
- `outputs/invariants-webpage-plan.md` — implementation plan
- `outputs/3d-animation-feasibility.md` — 3D feasibility research
