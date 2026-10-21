# Making Invariant Lab feel alive

Research and implementation recommendation · 21 October 2026

**Recommendation: build a small Three.js 3D workshop inside the existing webpage, beginning with a one-bot grab prototype.** The desired result is feasible in a browser. The main improvement will come from character articulation, believable contact, timing, and grounded shadows; a 3D renderer supplies the depth and volume needed to make those choices read clearly.

This assessment combines inspection of the existing source with current official Three.js, Babylon.js, and browser documentation. The proposed 3D version has not been implemented or benchmarked on the user's device.

## Why the current animation feels flat

The existing scene is one SVG with flat silhouettes. More significantly, its motion has several concrete limitations:

- The correction glove simply becomes visible. It has no approach, finger closure, grip, or release animation.
- The bot moves to a preset location independently of the glove. Their contact is an illustration rather than a maintained spatial relationship.
- The bot's floor shadow belongs to its moving group and is hidden entirely during the correction. That removes the strongest cue about its height above the floor.
- Movement between most stations uses a straight 740 ms translation. The feet do not convincingly push off, contact the floor, and settle.
- Supporting bots remain at fixed positions. Blinking and small arm loops do not read as independent work.
- The correction event lasts 1.6 seconds, but its principal visual effects last 0.8 seconds. A short action is followed by a static hold.
- The semantic story timeline and the CSS/Web Animations effects have separate clocks. This makes elaborate choreography harder to control precisely.

These findings come from `dist/js/workshop.js`, `dist/workshop.css`, and `dist/js/timeline.js`. Improving timing and contact would help even before a renderer change.

## Options and tradeoffs

| Approach | What improves | Main limitation | Assessment |
| --- | --- | --- | --- |
| Rework the existing SVG | Curved movement, anticipation, finger closure, dangling legs, grounded shadow | Viewpoint and silhouettes still need to be drawn or faked | Fastest useful upgrade |
| CSS 2.5D | Layer separation, parallax, depth turns, an angled stage | Flat art remains flat art; hand contact and changing views become awkward | Viable for a paper-theater aesthetic |
| Three.js | Actual bot volume, occlusion, lighting, spatial attachments, camera framing | Requires meshes, animation hierarchy, and GPU/render lifecycle work | Best fit for the requested physical grab |
| Babylon.js | The same core 3D capabilities plus broader engine systems | Introduces systems this small scripted scene may not need | Strong alternative if the page grows into a game |

CSS `transform-style: preserve-3d` positions child elements in 3D space. It does not turn a single illustration into a volumetric character. The current SVG would need to be separated into multiple layers or replaced with constructed shapes. [MDN: transform-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform-style)

Babylon.js provides animation, collision, physics, cameras, meshes, and multiple rendering backends. The preference for Three.js here is a project-scope judgment, rather than a claim that Babylon cannot do the job. [Babylon.js specifications](https://www.babylonjs.com/specifications/)

## Recommended visual direction

Create a small toy-like diorama: rounded orange and mint bots, solid machinery, a shallow platform, soft lighting, and a substantial robot hand. Use an oblique camera so the viewer sees the front, top, and side surfaces of objects. A narrow-field perspective camera would emphasize the grab; an orthographic camera is an alternative if the workshop should resemble an isometric toy set.

The camera should be composed for the explanation. Use a restrained push toward the correction when it occurs, then return to the full workshop. Reframe for a phone instead of shrinking the entire desktop stage until the characters become tiny. Keep code and rule text in the existing HTML panels.

Three.js supports transform animation, skeletal animation, morph targets, clip blending, and synchronization. These mechanisms are sufficient for the planned characters. [Three.js animation system](https://threejs.org/manual/pages/animation-system.html)

## What the grab should do

Replace the brief flat gag with an approximately three-second authored sequence. These timings are an initial animation brief to refine by watching the result.

| Time | Action | Cue that creates weight |
| --- | --- | --- |
| 0.00–0.25 s | Bot notices rejection and leans away | Anticipation before contact |
| 0.25–0.65 s | Hand descends along an arc, palm turns, fingers open | Visible approach through space |
| 0.65–0.85 s | Fingers close around a backpack handle | Contact happens before lifting |
| 0.85–1.35 s | Hand lifts; legs dangle and the torso swings | Body parts lag behind the grip; the shadow remains on the floor |
| 1.35–1.70 s | Paddle winds back, taps, and rebounds | A readable windup, short contact, and delayed bot reaction |
| 1.70–2.50 s | Hand carries the bot to the repair bench | Continuous attachment and a curved travel path |
| 2.50–3.10 s | Feet land, body compresses and settles, fingers release | Landing precedes release; the hand retracts |

The foam-paddle tap remains quick, playful robot slapstick. The entertaining part is the whole performance: the bot's eyes follow the approaching hand, the legs scramble, the other bots react, and the corrected bot immediately starts repairing the code.

Construct a named grip socket inside the hand hierarchy and a matching handle on the backpack. During the lift the bot follows that socket. Three.js provides `Object3D.attach()` to change an object's parent while preserving its world transform; its documented restriction on nonuniformly scaled hierarchies should shape the rig. [Object3D attachment](https://threejs.org/docs/pages/Object3D.html#attach)

## Asset requirements

The initial prototype can use original procedural meshes built in JavaScript. A large asset-production pipeline is unnecessary for a geometric robot.

| Asset | Required movable parts |
| --- | --- |
| Bot | Torso, two arms, two legs, eyes, backpack, visible handle, ground-contact reference |
| Hand or gripper | Wrist, palm, thumb, finger segments, grip socket |
| Paddle | Solid head, handle, swing pivot |
| Ground | Floor that receives shadows and defines landing height |
| Workshop | Solid desks, interface machine, gate, repair bench, and inventory blocks |

Procedural geometry lets us establish the style and motion without waiting for Blender files. It can also keep the existing orange/mint choices as material variations.

For a later character-art pass, create an original model and rig in Blender and deliver it as an animated `.glb`. Separate clips can cover idle, walk, carry, type, read, startled, grabbed, and celebration. Three.js loads glTF scenes and their animation data; source models need intentional hierarchy and clip names. A 2D pet sprite or logo is a visual reference, rather than a ready-made 3D rig. [Three.js glTF loading](https://threejs.org/manual/pages/load-gltf.html)

## Integration with the existing application

Keep the model that decides whether an implementation passes its rules. Add a renderer behind the workshop interface, then extend the presentation timeline to expose frame progress:

```text
Rules + candidate evaluation
            ↓
Story event + one presentation clock
            ↓
render(event, localTime, progress, logicalState, preferences)
            ↓
3D meshes + rig pose + camera + shadows + effects
```

Add an `onFrame` callback to `Timeline`. Drive every animated property from its event-local or absolute presentation time. Pause freezes that time; speed changes how quickly it advances; restart restores the scene to a known baseline. A seek should reconstruct grip attachment and pose from the target phase, rather than depend on every previous frame having played.

Three.js `AnimationMixer.setTime()` can sample an exact animation time. For procedural parts, equivalent pure pose functions can compute position, rotation, scale, and grip state directly. If the application clock already applies playback speed, avoid applying the same speed again inside a mixer. [AnimationMixer documentation](https://threejs.org/docs/pages/AnimationMixer.html)

Use authored keyframes and damped-looking curves for the core grab. This delivers predictable animation without a physics simulation. Physics could later animate decorative blocks, but should not decide whether code passes or whether the bot reaches a particular story beat.

Suggested modules:

```text
workshop3d/
  renderer.js        # Canvas, camera, lighting, resize, cleanup
  bot.js             # Character hierarchy and named pivots
  hand.js            # Fingers, wrist, grip socket
  workshop.js        # Machines, floor, stock blocks
  choreography.js    # Time-sampled motion and attachment phases
  quality.js         # Device-quality settings and fallback selection
```

The existing renderer can remain the fallback when GPU rendering is unavailable. Keep buttons, code panels, rules, status announcements, and reduced-motion explanations in semantic HTML.

## Dependencies, hosting, and performance

Add a pinned Three.js dependency and a normal frontend build step such as Vite. Three.js recommends npm plus a build tool for most projects. This changes development packaging; the result is still a static site. Go, templ, a database, and live model calls are not required for the 3D animation. [Three.js installation guide](https://threejs.org/manual/pages/installation.html)

Current `WebGLRenderer` uses WebGL 2 and no longer supports WebGL 1. Detect whether renderer creation succeeds and handle failure gracefully. WebGPU is optional: Three.js also provides a separate renderer that can fall back from WebGPU to WebGL 2, but the proposed scene does not require it. [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html), [WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html)

Use one shadow-casting light plus ambient fill initially. Dynamic shadows require extra rendering work, so avoid multiple shadow-casting lights and expensive post-processing before profiling. A lower-quality mode can use simple ground shadows. [Three.js shadow tradeoffs](https://threejs.org/manual/pages/shadows.html)

Cap internal render resolution on high-density phones, reuse geometry and materials, stop the render loop when hidden or offscreen, and dispose of GPU resources when replacing the scene. The canvas size and camera framing must respond to the workshop container. The official responsive-rendering guidance explains why unrestricted pixel density can overload the GPU. [Responsive rendering](https://threejs.org/manual/pages/responsive.html)

An approximate 60 fps desktop target and 30 fps mobile minimum are useful prototype goals, not measured results. The benchmark must report the actual device, viewport, and quality setting. Essential reading and controls must remain usable if rendering is reduced or disabled.

The procedural version could still be packaged as a self-contained HTML file by bundling its dependency and embedding generated content. It will be larger than the present approximately 92 KB artifact. If we introduce separate GLB models or textures, ordinary HTTP/static hosting becomes the simpler delivery route. The earlier Sites publishing approval restriction is separate from 3D feasibility.

## Practical implementation sequence

1. Build one bot, one hand, a floor, and a bench. Prove open → grip → lift → tap → place → release before rebuilding the workshop.
2. Add contact shadows, eye tracking, dangling limbs, and one camera move. Check whether the sequence feels physical at normal speed and on a phone.
3. Connect the prototype to a single deterministic clock and test pause at contact, speed changes during the lift, step, and restart while attached.
4. Replace the workshop stage, add the remaining bots and machinery, and map the other existing story poses to animations.
5. Tune the two character skins, quality fallback, reduced motion, loading, and static packaging. Confirm the existing behavioral outcomes remain identical.

Rough effort estimates, assuming code-built geometric characters and a fixed scene: one to two development days for the focused motion prototype; four to seven days total for a complete integrated 3D workshop with mobile tuning. Bespoke Blender character art and polished rigging could add one to two weeks. These are planning ranges, with asset quality and animation iteration as the largest variables.

The next concrete deliverable should be the one-bot motion prototype. It provides a visible test of the hardest question—whether the hand, contact, weight, and reaction feel entertaining—before investing in the whole environment.
