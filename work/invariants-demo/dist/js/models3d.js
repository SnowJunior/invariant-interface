import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Models contain no clocks or render decisions. All poses belong to the caller.
const geometryCache = new Map();
const materials = new Map();

function material(color, roughness = .64, metalness = .04) {
  const key = `${color}:${roughness}:${metalness}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  return materials.get(key);
}

function roundedGeometry(w, h, d, r = .08) {
  const radius = Math.min(r, w / 2, h / 2, d / 2);
  const key = `box:${w}:${h}:${d}:${radius}`;
  if (!geometryCache.has(key)) geometryCache.set(key, new RoundedBoxGeometry(w, h, d, 3, radius));
  return geometryCache.get(key);
}

function box(parent, dimensions, position, mat, radius = .08) {
  const mesh = new THREE.Mesh(roundedGeometry(...dimensions, radius), mat);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, radius, length, position, mat, radialSegments = 12) {
  const key = `cylinder:${radius}:${length}:${radialSegments}`;
  if (!geometryCache.has(key)) geometryCache.set(key, new THREE.CylinderGeometry(radius, radius, length, radialSegments));
  const mesh = new THREE.Mesh(geometryCache.get(key), mat);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function sphere(parent, radius, position, mat) {
  const key = `sphere:${radius}`;
  if (!geometryCache.has(key)) geometryCache.set(key, new THREE.SphereGeometry(radius, 16, 12));
  const mesh = new THREE.Mesh(geometryCache.get(key), mat);
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function group(parent, name, position = [0, 0, 0]) {
  const result = new THREE.Group();
  result.name = name;
  result.position.set(...position);
  parent.add(result);
  return result;
}

const cream = material(0xf1e7cc, .48);
const dark = material(0x253b35, .75);
const olive = material(0x5e7561, .72);
const mint = material(0xa8c7a3, .6);
const brass = material(0xa88557, .48, .4);
const rubber = material(0x283731, .94);
const black = material(0x192521, .45);
const light = material(0xfff8df, .36);

/**
 * Torso center is the origin. At root.y=1.4, boot soles sit at y≈0.
 * Arms: X rotation for reach/typing, Z for expressive sideways gestures.
 * Legs: X rotation for gait/dangling. The backpack grip is [0,.65,-.45].
 */
export function createBot({ color = 0xe57748 } = {}) {
  const root = new THREE.Group();
  root.name = 'bot';
  const shell = material(color, .53);
  const shellInset = material(new THREE.Color(color).multiplyScalar(.76).getHex(), .65);
  const body = group(root, 'torso');

  box(body, [1.42, 1.18, .96], [0, .03, 0], shell, .19);
  box(body, [1.13, .66, .11], [0, .1, .481], shellInset, .13);
  box(body, [1.06, .59, .07], [0, .12, .549], cream, .12);
  box(body, [.6, .035, .025], [0, .55, .34], light, .012);

  const eyes = [-.23, .23].map((x, i) => {
    const eye = box(body, [.135, .25, .07], [x, .16, .603], black, .035);
    eye.name = i ? 'eye-right' : 'eye-left';
    box(eye, [.027, .045, .012], [-.024, .063, .04], light, .006);
    return eye;
  });
  const mouth = box(body, [.19, .035, .025], [0, -.14, .6], dark, .013);
  mouth.name = 'mouth';
  for (const x of [-.75, .75]) {
    box(body, [.15, .37, .39], [x, .11, -.02], shell, .055);
    box(body, [.04, .18, .21], [x + Math.sign(x) * .08, .11, .035], brass, .015);
  }

  // Layered backpack and handle visibly explain where the hand grips.
  box(body, [.91, .84, .33], [0, -.01, -.61], olive, .12);
  box(body, [.62, .42, .05], [0, -.13, -.795], dark, .065);
  box(body, [.36, .035, .028], [0, -.02, -.83], brass, .01);
  for (const x of [-.42, .42]) box(body, [.07, .81, .055], [x, .01, -.81], cream, .02);
  const handle = group(root, 'backpack-grip', [0, .65, -.45]);
  for (const x of [-.23, .23]) box(handle, [.09, .27, .11], [x, -.025, 0], brass, .04);
  box(handle, [.54, .11, .13], [0, .075, 0], brass, .05);
  box(handle, [.3, .09, .145], [0, .075, 0], dark, .035);

  function arm(side) {
    const pivot = group(root, side < 0 ? 'arm-left' : 'arm-right', [side * .83, .25, 0]);
    sphere(pivot, .16, [0, 0, 0], brass);
    box(pivot, [.19, .43, .24], [0, -.23, 0], shell, .08);
    cylinder(pivot, .115, .24, [0, -.47, 0], brass).rotation.z = Math.PI / 2;
    box(pivot, [.17, .23, .23], [0, -.58, .04], shellInset, .065);
    box(pivot, [.28, .24, .3], [0, -.78, .09], cream, .09);
    box(pivot, [.04, .11, .02], [side * .055, -.79, .246], brass, .01);
    pivot.rotation.z = side * .09;
    return pivot;
  }
  function leg(side) {
    const pivot = group(root, side < 0 ? 'leg-left' : 'leg-right', [side * .4, -.48, 0]);
    sphere(pivot, .15, [0, 0, 0], brass);
    box(pivot, [.21, .36, .24], [0, -.2, 0], shellInset, .07);
    sphere(pivot, .13, [0, -.4, .01], brass);
    box(pivot, [.19, .27, .23], [0, -.57, .015], shell, .065);
    box(pivot, [.37, .23, .58], [0, -.775, .12], cream, .075);
    box(pivot, [.38, .055, .59], [0, -.883, .12], rubber, .023);
    box(pivot, [.17, .03, .025], [0, -.74, .42], brass, .01);
    return pivot;
  }
  const armL = arm(-1), armR = arm(1), legL = leg(-1), legR = leg(1);
  root.userData.floorOffset = 1.39;
  root.userData.gripOffset = new THREE.Vector3(0, .65, -.45);
  return { root, body, armL, armR, legL, legR, eyes, handle };
}

/** Root is the grip socket, with palm above it and fingers curving through z=0. */
export function createHand() {
  const root = new THREE.Group();
  root.name = 'grabbing-hand';
  const glove = material(0xece8d8, .45);
  const seams = material(0xc2c8b5, .7);
  const palm = box(root, [1.04, .49, .72], [0, .77, -.015], glove, .17);
  box(root, [.76, .045, .5], [0, 1.023, -.02], seams, .02);
  box(root, [.64, .23, .52], [0, 1.14, -.035], mint, .075);
  box(root, [.7, .07, .56], [0, 1.28, -.035], brass, .025);
  cylinder(root, .095, 3.4, [0, 3.01, -.035], dark);
  cylinder(root, .045, 3.42, [0, 3.015, .043], brass);
  box(palm, [.39, .027, .027], [0, -.05, .372], seams, .01);
  box(palm, [.2, .027, .027], [0, .045, .372], seams, .01);

  function finger(name, x, width, length) {
    const base = group(root, name, [x, .55, .29]);
    const middle = group(base, `${name}-middle`, [0, -length, 0]);
    const tip = group(middle, `${name}-tip`, [0, -length * .92, 0]);
    box(base, [width, length + .055, width * 1.06], [0, -length / 2, 0], glove, width * .42);
    box(middle, [width * .94, length * .98, width], [0, -length * .46, 0], glove, width * .42);
    box(tip, [width * .92, length * .86, width], [0, -length * .39, 0], glove, width * .42);
    cylinder(base, width * .48, width * 1.05, [0, -.025, 0], seams).rotation.z = Math.PI / 2;
    cylinder(middle, width * .43, width * 1.02, [0, -.015, 0], seams).rotation.z = Math.PI / 2;
    box(tip, [width * .55, .07, .012], [0, -length * .42, width * .52], seams, .018);
    base.userData.links = [base, middle, tip];
    return base;
  }
  const fingers = [
    finger('index', -.345, .18, .305),
    finger('middle', -.115, .195, .335),
    finger('ring', .12, .185, .32),
    finger('little', .345, .165, .27),
  ];
  const thumb = finger('thumb', -.61, .23, .31);
  thumb.position.set(-.6, .76, -.11);

  function setGrip(value = 0) {
    const grip = THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
    fingers.forEach((digit, i) => {
      const [base, middle, tip] = digit.userData.links;
      base.rotation.x = THREE.MathUtils.lerp(-.35 - i * .035, .08, grip);
      base.rotation.z = THREE.MathUtils.lerp((i - 1.5) * -.075, (i - 1.5) * -.01, grip);
      middle.rotation.x = THREE.MathUtils.lerp(.06, .88 + i * .025, grip);
      tip.rotation.x = THREE.MathUtils.lerp(.035, 1.12, grip);
    });
    const [base, middle, tip] = thumb.userData.links;
    base.rotation.set(THREE.MathUtils.lerp(-.24, .08, grip), .12, THREE.MathUtils.lerp(-.15, 1.03, grip));
    middle.rotation.x = THREE.MathUtils.lerp(.05, .74, grip);
    tip.rotation.x = THREE.MathUtils.lerp(.02, .88, grip);
    root.userData.grip = grip;
  }
  setGrip(0);
  return { root, fingers, thumb, palm, setGrip };
}

/** Pivot is at the handle butt; foam head extends along -X to x=-1.28. */
export function createPaddle() {
  const root = new THREE.Group();
  root.name = 'foam-paddle';
  const pivot = group(root, 'paddle-swing');
  box(pivot, [.94, .13, .15], [-.45, 0, 0], material(0x9e754e, .68), .05);
  box(pivot, [.28, .16, .2], [-.09, 0, 0], brass, .04);
  box(pivot, [.7, .89, .27], [-1.25, 0, 0], mint, .18);
  box(pivot, [.54, .71, .025], [-1.25, 0, .145], material(0xc4d8b7, .95), .12);
  for (const y of [-.22, -.07, .08, .23]) box(pivot, [.37, .025, .012], [-1.25, y, .164], material(0x8aa17d, .85), .01);
  return { root, pivot };
}

/** Static toy set. Floor top is y=0; back wall/props are at negative Z. */
export function createWorkshop() {
  const root = new THREE.Group();
  root.name = 'workshop-set';
  const platform = material(0x354e43, .83);
  const stone = material(0x687b61, .8);
  const wood = material(0xb08e63, .72);
  const frame = material(0x617658, .65);
  const accent = material(0xe3af6d, .55);
  const screenMaterial = new THREE.MeshStandardMaterial({ color: 0x233d34, emissive: 0x89ad83, emissiveIntensity: .12, roughness: .58 });
  box(root, [12.5, .34, 6.65], [0, -.17, -.6], platform, .16);
  box(root, [11.9, .035, 6.05], [0, .012, -.6], material(0x3f5a49, .91), .08);
  for (let x = -5.8; x <= 5.8; x += .8) box(root, [.012, .008, 5.9], [x, .034, -.6], material(0x506653, .95), .003);
  for (let z = -3.4; z <= 2.3; z += .8) box(root, [11.8, .008, .012], [0, .034, z], material(0x506653, .95), .003);
  for (const x of [-5.5, 5.5]) {
    for (const z of [-3.3, 2.1]) cylinder(root, .1, .04, [x, .045, z], brass);
  }

  // Code bench: rear left, deliberately outside the central grabbing area.
  const desk = group(root, 'code-bench', [-3.8, 0, -2.1]);
  box(desk, [2.6, .18, 1.25], [0, 1.14, 0], wood, .07);
  for (const x of [-1.05, 1.05]) for (const z of [-.43, .43]) box(desk, [.14, 1.1, .14], [x, .55, z], stone, .03);
  box(desk, [1.48, 1.03, .18], [0, 1.96, -.27], dark, .1);
  const screen = box(desk, [1.25, .78, .035], [0, 1.97, -.16], screenMaterial, .05);
  screen.name = 'code-screen';
  box(desk, [.18, .3, .16], [0, 1.35, -.27], stone, .03);
  box(desk, [.7, .06, .35], [0, 1.2, -.17], stone, .03);
  box(desk, [.95, .07, .38], [0, 1.27, .34], cream, .04);
  const codeBar = material(0xc6dbb4, .7);
  for (let row = 0; row < 5; row++) box(desk, [.3 + (row % 3) * .2, .025, .012], [-.2 + (row % 2) * .07, 2.24 - row * .12, -.133], codeBar, .005);
  for (let i = 0; i < 3; i++) sphere(desk, .025, [-.49 + i * .09, 2.25, -.128], i ? mint : accent);

  // Type-check machine with a satisfying physical lever and stamped patch.
  const machine = group(root, 'interface-machine', [-.6, 0, -2.55]);
  box(machine, [2.15, 1.75, .9], [0, .9, 0], frame, .13);
  box(machine, [1.64, .66, .08], [0, 1.26, .48], dark, .045);
  box(machine, [1.08, .24, .16], [0, .48, .52], mint, .045);
  box(machine, [.63, .04, .025], [0, 1.35, .53], cream, .01);
  box(machine, [.9, .04, .025], [0, 1.16, .53], codeBar, .01);
  box(machine, [.11, .8, .11], [1.2, 1.42, .02], brass, .04);
  sphere(machine, .17, [1.2, 1.86, .02], accent);
  for (let i = 0; i < 5; i++) box(machine, [.07, .18, .025], [-.62 + i * .31, .94, .49], stone, .01);

  const gate = group(root, 'contract-gate', [3.4, 0, -2.7]);
  for (const x of [-1.05, 1.05]) {
    box(gate, [.2, 2.35, .32], [x, 1.175, 0], mint, .075);
    box(gate, [.5, .13, .67], [x, .09, 0], frame, .045);
  }
  box(gate, [2.3, .2, .32], [0, 2.35, 0], mint, .07);
  box(gate, [1.72, .48, .17], [0, 1.95, .05], dark, .06);
  for (let i = 0; i < 3; i++) sphere(gate, .055, [-.31 + i * .31, 1.96, .16], codeBar);
  box(gate, [1.97, .14, .15], [0, .86, .18], brass, .04);
  for (const x of [-.65, -.1, .45]) box(gate, [.18, .16, .17], [x, .86, .18], dark, .025);

  // Repair table right, behind the floor landing point [2.2,0,0].
  const repair = group(root, 'repair-bench', [3.6, 0, -.85]);
  box(repair, [1.75, .16, .9], [0, 1.06, 0], wood, .06);
  for (const x of [-.7, .7]) for (const z of [-.3, .3]) box(repair, [.11, 1, .11], [x, .5, z], stone, .025);
  box(repair, [.47, .08, .3], [-.43, 1.2, 0], cream, .035);
  box(repair, [.07, .38, .07], [.32, 1.3, -.08], brass, .02).rotation.z = -.5;
  box(repair, [.29, .08, .13], [.4, 1.48, -.08], accent, .025);

  const crate = group(root, 'stock-display', [4.35, 0, 1.08]);
  box(crate, [2.1, .23, .82], [0, .14, 0], frame, .07);
  const stockBlocks = Array.from({ length: 5 }, (_, i) => {
    const block = box(crate, [.31, .38, .49], [-.76 + i * .38, .45, 0], mint, .05);
    box(block, [.2, .018, .24], [0, .2, 0], cream, .008);
    return block;
  });
  function updateStock(n) {
    const count = Math.max(0, Math.min(5, Math.trunc(Number(n) || 0)));
    stockBlocks.forEach((block, index) => { block.visible = index < count; });
    root.userData.stock = Number(n) || 0;
  }
  updateStock(5);
  return { root, stockBlocks, screenMaterial, updateStock };
}
