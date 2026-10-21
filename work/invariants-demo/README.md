# Invariant Lab

An interactive Go package workshop about interfaces, behavioral contracts, and AGENTS.md. Original SVG bots propose faulty changes, pass a simulated interface check, break inventory, and encounter linked checks after a package contract is added.

## Run locally

Requires Node.js 18 or later. No package installation is needed.

```sh
npm run dev
```

Open http://127.0.0.1:4173. This serves the `dist/` directory. Any ordinary static host can serve the same directory without a build step.

## 3D motion prototype

Open http://127.0.0.1:4173/3d.html for the additional Three.js motion study. The original page is preserved at `/`.

The prototype includes procedural characters, individually articulated fingers, a nine-second grab/lift/tap/carry/land/release sequence, a floor shadow, a camera push, and draggable scene inspection. Pause or scrub to any time, click a choreography beat, step between phases, or change speed. The character's handle remains constrained to the hand socket while attached. Motion is authored and deterministic; it does not use a physics engine or live model calls.

To install the development dependencies, run `npm ci`. To rebuild both the served script and self-contained HTML, run:

```sh
npm run build:3d
```

The standalone page is written to `standalone/invariant-lab-3d.html`. Supply a different destination with `npm run build:3d -- /absolute/path/invariant-lab-3d.html`.

The Three.js and esbuild versions are pinned in package.json and package-lock.json. The built page requires WebGL 2 for 3D and shows a text storyboard if GPU initialization fails. The standalone export embeds its library, CSS, models, and shaders; it fetches no external assets. This is a focused motion prototype rather than a replacement for the original workshop's complete exploration controls.

To make one self-contained HTML file that opens directly in a browser:

```sh
node bundle.mjs /absolute/path/invariant-lab.html
```

All JavaScript, CSS, and original SVG artwork are embedded. No external dependencies or API keys are needed.

## Check behavior

```sh
npm test
cd fixtures/go
go test ./...
```

The JavaScript tests cover rule behavior, overlapping checks, disabled rules, isolated evaluation, replay ordering, pause/step/speed, and stale callback cancellation. Additional 3D tests check chronological grip/landing relationships, actual Three.js world-space contact through arbitrary seeking, finger articulation, torso compression isolation, and floor contact. Go tests establish that the faulty examples satisfy the same interface and expose their intended behavioral defects; the overall suite passes by asserting those defects.

## Explore

- Run the unprotected demonstration, then choose **Add AGENTS.md** to rewind and replay with guidance and linked checks.
- Pause, step, change speed, or restart at any time.
- Click a rule to inspect its evidence. Rule checkboxes change the downloaded Markdown and the enabled validators.
- Expand **Take the controls** to run requests, inject four kinds of bad proposals, separate guidance from the gate, switch skins, or change motion/sound preferences.
- A new patch experiment explicitly resets stock to five while preserving accepted code. Turning on checks alone never silently repairs existing code.

## Implementation

- `dist/js/model.js`: exact Go snippets, modeled operation behaviors, independently checked cases, and Markdown generation.
- `dist/js/timeline.js`: deterministic presentation clock, pause, step, speed, reset, and cancellation.
- `dist/js/main.js`: story choreography, accepted/candidate separation, evidence, and controls.
- `dist/js/workshop.js` and `dist/workshop.css`: original animated SVG scene. Animation never determines pass/fail.
- `dist/styles.css`: responsive page and controls.
- `fixtures/go/`: real, compilable teaching fixtures.

## Accuracy

This is a clearly labelled simulation, with scripted agents and browser-modeled checks. It does not run a model or compile visitor code. AGENTS.md supplies instructions; linked tests provide evidence and a gate rejects failing proposals. Finite example tests are not a formal proof of all possible behavior.

The orange terminal bot and mint pet are original characters inspired by coding companions. They are not connected to Claude Code or ChatGPT Pets.

## Accessibility

All controls are keyboard operable. Code tabs support arrow keys, Home, and End. The scene is decorative, with equivalent visible text and restrained live announcements. Reduced motion replaces the slapstick with a rejection-and-repair explanation; sound defaults off. Playback pauses when the tab is hidden.

## Deployment

The `.openai/hosting.json` file identifies this Site and serves `dist/`. The source is synchronized through the Sites workflow before publishing. Preserve that identity when updating this deployment. For a separate independent copy, register a new Site rather than pushing to this identity.
