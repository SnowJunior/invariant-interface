/**
 * Pure, seekable choreography for the 3D motion prototype. Times are seconds;
 * coordinates are world units with +Y up. Angles are radians, Euler XYZ.
 *
 * The hand root is its grip socket. Its palm/fingers should be built above that
 * origin. The bot root is its body center; its backpack handle is locally at
 * [0, .65, -.45]. While attached, that handle remains exactly at the hand root
 * even when the torso swings. `squash` is for a visual torso mesh only: do not
 * nonuniformly scale the attachment hierarchy or the backpack handle.
 *
 * `progress` is overall 0..1 progress. `phase` is a PHASES id. `shadow` is a
 * relative ground-shadow strength/size cue, not a world-space elevation.
 * `cameraPush`, `eyeWide`, `grip`, and `impact` are normalized 0..1 cues.
 * All objects and arrays returned by sampleMotion are fresh. No frame history,
 * clock, random state, renderer, or browser API is used.
 */

export const DURATION = 9;

export const PHASES = Object.freeze([
  { id: 'notice', label: 'Notice the rejection', start: 0, end: .6, description: 'The bot leans away before the hand approaches.' },
  { id: 'approach', label: 'Approach', start: .6, end: 1.5, description: 'The open hand descends along a curved path.' },
  { id: 'grip', label: 'Close the grip', start: 1.5, end: 2.1, description: 'Fingers close around the backpack handle before the lift.' },
  { id: 'lift', label: 'Lift', start: 2.1, end: 3.2, description: 'The hand lifts the attached bot; its feet leave the floor.' },
  { id: 'swing', label: 'Dangle and swing', start: 3.2, end: 4, description: 'The torso swings from the grip and the legs dangle.' },
  { id: 'tap', label: 'Wind up, tap, recoil', start: 4, end: 4.8, description: 'The foam paddle anticipates, makes brief contact, and rebounds.' },
  { id: 'carry', label: 'Carry to repair', start: 4.8, end: 6.5, description: 'The hand carries the bot along an arc toward the repair area.' },
  { id: 'land', label: 'Set down', start: 6.5, end: 7.2, description: 'Feet reach the floor before the fingers release.' },
  { id: 'release', label: 'Release', start: 7.2, end: 7.8, description: 'The grounded bot settles while the hand opens.' },
  { id: 'retract', label: 'Retract the hand', start: 7.8, end: 8.5, description: 'The empty hand lifts away from the bot.' },
  { id: 'repair', label: 'Back to the contract', start: 8.5, end: 9, description: 'The bot reads the feedback and starts repairing the code.' },
].map(Object.freeze));

const START = [-1.5, 1.4, 0];
const FINISH = [2.2, 1.4, 0];
const HANDLE = [0, .65, -.45];
const GRIP_Y = START[1] + HANDLE[1];
const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const lerp = (a, b, p) => a + (b - a) * p;
const unit = (t, start, end) => clamp((t - start) / (end - start));
const smooth = p => p * p * (3 - 2 * p);
const ease = (t, start, end) => smooth(unit(t, start, end));
const arch = (t, start, end) => Math.sin(Math.PI * unit(t, start, end));

function envelope(t, start, riseEnd, fallStart, end) {
  return ease(t, start, riseEnd) * (1 - ease(t, fallStart, end));
}

// Rotate a vector by Rx * Ry * Rz, matching Three.js intrinsic Euler XYZ.
function rotateXYZ(vector, rotation) {
  const [rx, ry, rz] = rotation;
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  const x1 = vector[0] * cz - vector[1] * sz, y1 = vector[0] * sz + vector[1] * cz, z1 = vector[2];
  const x2 = x1 * cy + z1 * sy, y2 = y1, z2 = -x1 * sy + z1 * cy;
  return [x2, y2 * cx - z2 * sx, y2 * sx + z2 * cx];
}

function handPosition(t) {
  if (t <= .6) return [-1.5, 6, -.45];
  if (t < 1.5) {
    const p = ease(t, .6, 1.5), arc = arch(t, .6, 1.5);
    return [-1.5 - .32 * arc, lerp(6, GRIP_Y, p), -.45 - .18 * arc];
  }
  if (t <= 2.1) return [-1.5, GRIP_Y, -.45];
  if (t < 3.2) {
    const p = ease(t, 2.1, 3.2);
    return [-1.5 + .1 * arch(t, 2.1, 3.2), lerp(GRIP_Y, 4.1, p), -.45];
  }
  if (t <= 4.8) return [-1.5, 4.1, -.45];
  if (t < 6.5) {
    const p = ease(t, 4.8, 6.5), arc = arch(t, 4.8, 6.5);
    return [lerp(-1.5, 2.2, p), lerp(4.1, 2.65, p) + .38 * arc, -.45 + .35 * arc];
  }
  if (t < 7.2) return [2.2, lerp(2.65, GRIP_Y, ease(t, 6.5, 7.2)), -.45];
  if (t <= 7.8) return [2.2, GRIP_Y, -.45];
  if (t < 8.5) {
    const p = ease(t, 7.8, 8.5), arc = arch(t, 7.8, 8.5);
    return [2.2 + .3 * arc, lerp(GRIP_Y, 6, p), -.45 - .15 * arc];
  }
  return [2.2, 6, -.45];
}

function paddleSwing(t) {
  if (t < 4 || t >= 5.1) return 0;
  if (t < 4.3) return lerp(0, -.75, ease(t, 4, 4.3));
  if (t < 4.43) return lerp(-.75, .8, ease(t, 4.3, 4.43));
  if (t < 4.8) return lerp(.8, -.15, ease(t, 4.43, 4.8));
  return lerp(-.15, 0, ease(t, 4.8, 5.1));
}

export function sampleMotion(inputTime = 0) {
  const t = typeof inputTime === 'number' && Number.isFinite(inputTime) ? clamp(inputTime, 0, DURATION) : 0;
  const phase = PHASES.find(item => t < item.end)?.id ?? PHASES.at(-1).id;
  const hand = handPosition(t);
  const grip = ease(t, 1.5, 2.1) * (1 - ease(t, 7.2, 7.8));
  const attached = t >= 2.1 && t < 7.5;
  const air = envelope(t, 2.1, 3.2, 6.5, 7.2);
  const impact = t >= 4.4 && t <= 4.54 ? Math.sin(Math.PI * unit(t, 4.4, 4.54)) ** 2 : 0;
  const anticipation = t < .6 ? arch(t, 0, .6) : 0;
  const fear = t >= 1.5 && t <= 2.1 ? arch(t, 1.5, 2.1) : 0;
  const swingTime = t - 2.1;
  const rotation = [
    .06 * Math.sin(swingTime * 4.2) * air,
    .10 * Math.sin(swingTime * 2.3) * air,
    -.12 * anticipation - .045 * fear + .14 * Math.sin(swingTime * 5) * air + .07 * impact,
  ];
  let bot;
  if (t >= 2.1 && t <= 7.2) {
    const offset = rotateXYZ(HANDLE, rotation);
    bot = hand.map((value, index) => value - offset[index]);
  } else bot = [...(t < 2.1 ? START : FINISH)];

  const landingTime = t - 7.2;
  const settle = t >= 7.2 && t <= 7.8
    ? -.06 * Math.sin(Math.PI * unit(t, 7.2, 7.8)) * Math.exp(-landingTime * 3)
    : 0;
  const repairProgress = ease(t, 8.5, 9);
  const typing = t >= 8.5 ? Math.sin(unit(t, 8.5, 9) * Math.PI * 4) * .08 : 0;
  const handTurn = .2 * (arch(t, .6, 1.5) - arch(t, 4.8, 6.5) + arch(t, 7.8, 8.5));
  const height = Math.max(0, bot[1] - START[1]);

  return {
    phase,
    progress: t / DURATION,
    hand: { position: hand, rotation: [.045 * air, .04 * air, handTurn], grip },
    bot: {
      position: bot,
      rotation,
      armL: (-.65 + .16 * Math.sin(swingTime * 6.2)) * air - .6 * repairProgress + typing,
      armR: (.5 - .13 * Math.sin(swingTime * 5.7 + .5)) * air - .8 * repairProgress - typing,
      legL: .38 * Math.sin(swingTime * 6.5) * air,
      legR: -.34 * Math.sin(swingTime * 6.5 + .6) * air,
      squash: 1 - .075 * impact + settle,
      eyeWide: clamp(.4 * anticipation + .35 * grip + .4 * air + .25 * impact),
    },
    paddle: { swing: paddleSwing(t), visible: t >= 3.75 && t <= 5.1 },
    attached,
    impact,
    shadow: 1 / (1 + .8 * height),
    cameraPush: envelope(t, .6, 2.1, 7.2, 8.5),
    repair: t >= 8.5,
  };
}
