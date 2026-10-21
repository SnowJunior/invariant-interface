# 3D motion prototype verification

21 October 2026

- All 36 Node tests passed, including 16 new choreography and Three.js scene-graph tests.
- Actual world-space handle/socket distance was zero to six displayed decimal places in the browser while attached. Tests check tighter numerical tolerances at many timestamps and after arbitrary seeks.
- The renderer initialized as WebGL 2 in the in-app browser, with real lighting, shadows, procedural meshes, and articulated fingers.
- Browser checks covered the complete repair sequence, phase selection, phase stepping, keyboard scrubbing, play/pause, replay, and mouse-drag scene inspection.
- Desktop layout was inspected at 1280 px. Phone layout was inspected at 375 px, with document and content widths both measuring 375 px.
- Phone checks exercised alternate color, lightweight rendering, and reduced-motion mode. Reduced motion replaced the paddle gag with a stationary rejection explanation.
- Fixed a phase-selector collision with the canvas's diagnostic data attribute, a medium-width control-clipping issue, and missing keyboard focus indication on the canvas.
- Repaired-code status is derived from the passing safe model, rather than from animation completion alone.
- A self-contained HTML export was built with the pinned Three.js dependency and procedural assets embedded. The served bundle was browser-tested; the browser automation surface does not permit navigating directly to file URLs.

This verifies the available in-app browser. It is not a benchmark claim for all phones or separate browser engines. The original SVG page and its standalone export remain available unchanged.

The existing Sites source-upload approval restriction remains unresolved; this prototype is delivered locally.
