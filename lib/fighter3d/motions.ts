/**
 * Animations de chaque exercice (poses clés + accessoires + caméra).
 * Toutes les clés de EXERCISES ont une animation (vérifié par test).
 */
import { mirrorPose, type Pose, type V3 } from './rig';
import type { Motion, TwoContact } from './player';

type Limbs = { sh?: V3; el?: number; hip?: V3; knee?: number; ank?: number };
const sym = (o: Limbs, rest: Pose = {}): Pose => ({
  lSh: o.sh,
  rSh: o.sh,
  lEl: o.el,
  rEl: o.el,
  lHip: o.hip,
  rHip: o.hip,
  lKnee: o.knee,
  rKnee: o.knee,
  lAnk: o.ank,
  rAnk: o.ank,
  ...rest,
});
const with_ = (p: Pose, q: Pose): Pose => ({ ...p, ...q });

/* ───────── poses de base ───────── */

const STAND = sym({ sh: [0, 9, 0], el: 10, hip: [0, 5, 0], knee: 3 });
const GUARD: Pose = { lSh: [45, 10, 0], rSh: [40, 12, 0], lEl: 125, rEl: 130, lHip: [12, 8, 0], rHip: [-8, 8, 0], lKnee: 18, rKnee: 15, root: { ry: 18 }, chest: [4, 0, -10], neck: [-4, 0, 10] };

const PLANK: TwoContact = { range: [30, 115], a: ['lHand', 'rHand'], b: ['lToe', 'rToe'] };
const PU_TOP = sym({ sh: [80, 14, 0], el: 0, hip: [0, 4, 0], knee: 0 }, { neck: [-18, 0, 0] });
const PU_BOT = sym({ sh: [22, 42, 0], el: 98, hip: [0, 4, 0], knee: 0 }, { neck: [-20, 0, 0], chest: [-4, 0, 0] });
const MAT = [{ type: 'mat' as const, pos: [0, 0, 0] as [number, number, number] }];

const HANG_BOT = sym({ sh: [0, 165, 90], el: 4, hip: [12, 4, 0], knee: 55 }, { lHip: [18, 4, 0] });
const HANG_TOP = sym({ sh: [0, 38, 90], el: 132, hip: [22, 4, 0], knee: 60 }, { lHip: [28, 4, 0], neck: [-10, 0, 0] });
const BAR = (h = 2.3) => [{ type: 'pullBar' as const, pos: [0, h, 0] as [number, number, number] }];

const SQ_BOT: Pose = { root: { rx: 34 }, lHip: [124, 18, 0], rHip: [124, 18, 0], lKnee: 118, rKnee: 118, spine: [6, 0, 0], neck: [-32, 0, 0] };
// barre posée sur les trapèzes, derrière la nuque, coudes vers le bas
const BACK_BAR_ARMS: Pose = { lSh: [15, 40, 120], rSh: [15, 40, 120], lEl: 150, rEl: 150 };
const HINGE = (deg: number, knee: number): Pose => ({ root: { rx: deg }, lHip: [deg + 4, 6, 0], rHip: [deg + 4, 6, 0], lKnee: knee, rKnee: knee, neck: [-deg * 0.55, 0, 0] });

const SUPINE = -90;
const BENCH = (z = -0.2, h = 0.45, len = 1.25) => ({ type: 'bench' as const, pos: [0, 0, z] as [number, number, number], size: [0.4, h, len] as [number, number, number] });

/* ───────── animations ───────── */

const m = (o: Motion): Motion => o;

export const MOTIONS: Record<string, Motion> = {
  /* — Poussée — */
  pompe: m({ keys: [PU_TOP, PU_BOT], dur: 2, two: PLANK, view: 'side', props: MAT }),
  pompe_poings: m({ keys: [PU_TOP, PU_BOT], dur: 2, two: PLANK, view: 'side', hands: 'fist', props: MAT }),
  pompe_doigts: m({ keys: [PU_TOP, PU_BOT], dur: 2.2, two: PLANK, view: 'side', props: MAT }),
  pompe_inclinee: m({ keys: [PU_TOP, PU_BOT], dur: 2, two: { ...PLANK, range: [20, 100], dy: -0.45 }, view: 'side', props: [{ type: 'blockHands', size: [0.6, 1, 0.35] }] }),
  pompe_declinee: m({ keys: [PU_TOP, PU_BOT], dur: 2, two: { ...PLANK, range: [40, 130], dy: 0.45 }, view: 'side', props: [{ type: 'blockFeet', size: [0.5, 1, 0.35] }, ...MAT] }),
  pompe_explosive: m({
    keys: [PU_TOP, PU_BOT, with_(PU_TOP, { air: 0.13, lSh: [72, 4, 0], rSh: [72, 4, 0], lEl: 20, rEl: 20 })],
    weights: [1, 0.7, 0.6],
    dur: 1.6,
    two: PLANK,
    view: 'side',
    props: MAT,
  }),
  pompe_diamant: m({ keys: [sym({ sh: [82, 4, 0], el: 0, hip: [0, 4, 0] }, { neck: [-18, 0, 0] }), sym({ sh: [12, 12, 0], el: 108, hip: [0, 4, 0] }, { neck: [-20, 0, 0] })], dur: 2, two: PLANK, view: 'side', props: MAT }),
  pompe_archer: (() => {
    // mains très écartées : un bras plie, l'autre reste tendu sur le côté
    const top = sym({ sh: [86, 34, 0], el: 0, hip: [0, 6, 0] }, { neck: [-18, 0, 0] });
    const low: Pose = with_(top, { lSh: [30, 40, 0], lEl: 104, rSh: [62, 74, 0], rEl: 0, root: { rz: 8 } });
    return m({ keys: [top, low, top, mirrorPose(low)], dur: 3.2, two: PLANK, view: 'three4', zoom: 0.85, props: MAT });
  })(),
  pompe_pike: m({
    keys: [sym({ sh: [168, 12, 0], el: 0, hip: [100, 6, 0], knee: 0 }, { neck: [-10, 0, 0] }), sym({ sh: [150, 32, 0], el: 76, hip: [104, 6, 0], knee: 0 }, { neck: [-10, 0, 0] })],
    dur: 2.2,
    two: { range: [80, 175], a: ['lHand', 'rHand'], b: ['lToe', 'rToe'] },
    view: 'side',
    props: MAT,
  }),
  handstand: m({
    keys: [sym({ sh: [178, 10, 0], el: 0, hip: [0, 4, 0], knee: 0, ank: -20 }, { root: { rx: 180 }, neck: [-25, 0, 0] }), sym({ sh: [174, 10, 0], el: 0, hip: [4, 4, 0], knee: 0, ank: -20 }, { root: { rx: 177 }, neck: [-25, 0, 0] })],
    dur: 3.2,
    ground: { contacts: ['lHand', 'rHand'] },
    view: 'side',
    zoom: 1.2,
    props: [{ type: 'wall', pos: [0, 0, -0.42], size: [1.6, 2.4, 0.08] }, ...MAT],
  }),
  dips: m({
    keys: [sym({ sh: [-12, 12, 0], el: 2, hip: [30, 4, 0], knee: 80 }, { spine: [6, 0, 0] }), sym({ sh: [-62, 18, 0], el: 98, hip: [36, 4, 0], knee: 84 }, { spine: [18, 0, 0], neck: [-12, 0, 0] })],
    dur: 2.2,
    hang: 1.12,
    view: 'three4',
    props: [{ type: 'dipBars', pos: [0, 1.1, 0] }],
  }),
  dips_lestes: m({
    keys: [sym({ sh: [-12, 12, 0], el: 2, hip: [30, 4, 0], knee: 80 }, { spine: [6, 0, 0] }), sym({ sh: [-62, 18, 0], el: 98, hip: [36, 4, 0], knee: 84 }, { spine: [18, 0, 0], neck: [-12, 0, 0] })],
    dur: 2.4,
    hang: 1.12,
    props: [{ type: 'dipBars', pos: [0, 1.1, 0] }, { type: 'plateBelt' }],
  }),
  developpe: m({
    keys: [with_(STAND, { lSh: [40, 35, 0], rSh: [40, 35, 0], lEl: 120, rEl: 120 }), with_(STAND, { lSh: [172, 14, 0], rSh: [172, 14, 0], lEl: 4, rEl: 4, neck: [6, 0, 0] })],
    dur: 2.2,
    flatFeet: true,
    props: [{ type: 'barbell' }],
  }),
  developpe_halteres: m({
    keys: [sym({ sh: [0, 88, 90], el: 92, hip: [90, 10, 0], knee: 90 }), sym({ sh: [0, 168, 90], el: 6, hip: [90, 10, 0], knee: 90 })],
    dur: 2.2,
    flatFeet: true,
    ground: { y: 0.45, contacts: ['butt', 'pelvisLow'] },
    props: [{ type: 'dumbbells' }, BENCH(-0.05, 0.45, 0.5)],
  }),
  developpe_couche: m({
    keys: [
      sym({ sh: [90, 12, 0], el: 2, hip: [28, 18, 0], knee: 100 }, { root: { rx: SUPINE } }),
      sym({ sh: [22, 62, 0], el: 92, hip: [28, 18, 0], knee: 100 }, { root: { rx: SUPINE } }),
    ],
    dur: 2.4,
    ground: { y: 0.46, contacts: ['back', 'butt', 'upperBack'] },
    view: 'side',
    props: [{ type: 'barbell' }, BENCH(-0.3)],
  }),
  developpe_incline: m({
    keys: [
      sym({ sh: [95, 16, 0], el: 3, hip: [60, 18, 0], knee: 85 }, { root: { rx: -52 } }),
      sym({ sh: [28, 64, 0], el: 95, hip: [60, 18, 0], knee: 85 }, { root: { rx: -52 } }),
    ],
    dur: 2.4,
    ground: { y: 0.5, contacts: ['back', 'butt'] },
    view: 'side',
    props: [{ type: 'dumbbells' }, BENCH(-0.25, 0.48, 0.9)],
  }),
  elevation_laterale: m({ keys: [with_(STAND, { lSh: [5, 12, 0], rSh: [5, 12, 0], lEl: 18, rEl: 18 }), with_(STAND, { lSh: [8, 86, 0], rSh: [8, 86, 0], lEl: 18, rEl: 18 })], dur: 2.2, flatFeet: true, view: 'front', props: [{ type: 'dumbbells' }] }),
  extension_triceps: m({ keys: [with_(STAND, { lSh: [168, 8, 0], rSh: [168, 8, 0], lEl: 138, rEl: 138 }), with_(STAND, { lSh: [172, 8, 0], rSh: [172, 8, 0], lEl: 6, rEl: 6 })], dur: 2.2, flatFeet: true, props: [{ type: 'dumbbellHands' }] }),

  /* — Tirage — */
  tractions: m({ keys: [HANG_BOT, HANG_TOP], dur: 2.4, hang: 2.3, view: 'three4', props: BAR() }),
  traction_lestee: m({ keys: [HANG_BOT, HANG_TOP], dur: 2.8, hang: 2.3, props: [...BAR(), { type: 'plateBelt' }] }),
  traction_explosive: m({ keys: [HANG_BOT, with_(HANG_TOP, { lSh: [0, 30, 90], rSh: [0, 30, 90], lEl: 145, rEl: 145 })], weights: [1, 0.5], dur: 1.5, hang: 2.3, props: BAR() }),
  chin_up: m({
    keys: [sym({ sh: [172, 18, 0], el: 4, hip: [12, 4, 0], knee: 50 }), sym({ sh: [30, 18, 0], el: 140, hip: [22, 4, 0], knee: 55 }, { neck: [-12, 0, 0] })],
    dur: 2.4,
    hang: 2.3,
    view: 'side',
    props: BAR(),
  }),
  dead_hang: m({ keys: [HANG_BOT, with_(HANG_BOT, { lHip: [20, 4, 0], rHip: [8, 4, 0] })], dur: 3.4, hang: 2.3, breathe: true, props: BAR() }),
  towel_hang: m({ keys: [with_(HANG_BOT, { lSh: [0, 172, 90], rSh: [0, 172, 90] }), with_(HANG_BOT, { lSh: [0, 172, 90], rSh: [0, 172, 90], lHip: [20, 4, 0] })], dur: 3.4, hang: 2.14, breathe: true, props: [...BAR(), { type: 'towelsBar', pos: [0, 2.3, 0] }] }),
  rowing_inverse: m({
    keys: [sym({ sh: [92, 12, 0], el: 0, hip: [0, 4, 0], knee: 0 }, { neck: [8, 0, 0] }), sym({ sh: [12, 40, 0], el: 105, hip: [0, 4, 0], knee: 0 }, { neck: [10, 0, 0] })],
    dur: 2.2,
    two: { range: [-110, -35], a: ['lHand', 'rHand'], b: ['lHeel', 'rHeel'], dy: -0.78 },
    hands: 'fist',
    view: 'side',
    props: [{ type: 'table', pos: [0, 0.75, 0] }],
  }),
  rowing: m({
    keys: [with_(HINGE(58, 22), { lSh: [62, 12, 0], rSh: [62, 12, 0], lEl: 2, rEl: 2 }), with_(HINGE(58, 22), { lSh: [-18, 22, 0], rSh: [-18, 22, 0], lEl: 98, rEl: 98 })],
    dur: 2.2,
    flatFeet: true,
    view: 'side',
    props: [{ type: 'barbell' }],
  }),
  rowing_haltere: m({
    // fente, main gauche en appui sur un banc, le bras droit tire l'haltère
    keys: [
      with_(HINGE(70, 18), { lSh: [72, 10, 0], lEl: 0, rSh: [70, 8, 0], rEl: 2, lHip: [86, 6, 0], lKnee: 24, rHip: [62, 8, 0], rKnee: 8 }),
      with_(HINGE(70, 18), { lSh: [72, 10, 0], lEl: 0, rSh: [-20, 14, 0], rEl: 100, lHip: [86, 6, 0], lKnee: 24, rHip: [62, 8, 0], rKnee: 8 }),
    ],
    dur: 2.2,
    flatFeet: true,
    ground: { contacts: ['lHeel', 'lToe', 'rHeel', 'rToe'] },
    view: 'three4',
    props: [{ type: 'dumbbellR' }, { type: 'blockLHand', size: [0.4, 1, 0.45] }],
  }),
  face_pull: m({
    keys: [with_(STAND, { lSh: [88, 10, 0], rSh: [88, 10, 0], lEl: 4, rEl: 4 }), with_(STAND, { lSh: [0, 84, 90], rSh: [0, 84, 90], lEl: 100, rEl: 100 })],
    dur: 2.2,
    flatFeet: true,
    view: 'side',
    props: [{ type: 'cable', pos: [0, 1.65, 1.5] }],
  }),
  y_raise: m({
    keys: [sym({ sh: [160, 38, 0], el: 0, hip: [0, 6, 0] }, { root: { rx: 90 }, neck: [-10, 0, 0] }), sym({ sh: [182, 38, 0], el: 0, hip: [0, 6, 0] }, { root: { rx: 90 }, chest: [-8, 0, 0], neck: [-18, 0, 0] })],
    dur: 2.4,
    view: 'side',
    props: MAT,
  }),
  curl: m({ keys: [with_(STAND, { lSh: [4, 10, 0], rSh: [4, 10, 0], lEl: 6, rEl: 6 }), with_(STAND, { lSh: [12, 10, 0], rSh: [12, 10, 0], lEl: 142, rEl: 142 })], dur: 2, flatFeet: true, props: [{ type: 'dumbbells' }] }),
  curl_marteau: m({ keys: [with_(STAND, { lSh: [4, 10, 0], rSh: [4, 10, 0], lEl: 6, rEl: 6 }), with_(STAND, { lSh: [10, 10, 0], rSh: [10, 10, 0], lEl: 138, rEl: 138 })], dur: 2, flatFeet: true, view: 'side', props: [{ type: 'dumbbells' }] }),
  chin_up_iso: m({
    keys: [with_(STAND, { lSh: [28, 14, 0], rSh: [28, 14, 0], lEl: 96, rEl: 96, rHip: [62, 4, 0], rKnee: 78, rAnk: 10, spine: [10, 0, 0] })],
    dur: 3,
    flatFeet: 'l',
    anchor: ['lHeel', 'lToe'],
    breathe: true,
    view: 'three4',
    props: [{ type: 'towelFoot' }],
  }),
  shrug: m({ keys: [with_(STAND, { lSh: [0, 10, 0], rSh: [0, 10, 0], lEl: 2, rEl: 2 }), with_(STAND, { lSh: [0, 10, 0], rSh: [0, 10, 0], lEl: 2, rEl: 2, shrug: 0.07 })], dur: 1.8, flatFeet: true, view: 'front', props: [{ type: 'dumbbells' }] }),

  /* — Jambes — */
  squat_barre: m({ keys: [with_(STAND, BACK_BAR_ARMS), with_(SQ_BOT, { ...BACK_BAR_ARMS, neck: [-12, 0, 0] })], dur: 2.6, flatFeet: true, view: 'three4', props: [{ type: 'barbell' }] }),
  front_squat: m({
    // barre sur l'avant des épaules, sous le menton, coudes hauts devant
    keys: [with_(STAND, { lSh: [100, 60, -90], rSh: [100, 60, -90], lEl: 155, rEl: 155 }), with_({ ...SQ_BOT, root: { rx: 18 } }, { lSh: [104, 60, -90], rSh: [104, 60, -90], lEl: 155, rEl: 155 })],
    dur: 2.6,
    flatFeet: true,
    props: [{ type: 'barbell' }],
  }),
  presse: m({
    keys: [sym({ sh: [10, 30, 0], el: 30, hip: [72, 14, 0], knee: 12, ank: 10 }, { root: { rx: -48 } }), sym({ sh: [10, 30, 0], el: 30, hip: [128, 14, 0], knee: 108, ank: 10 }, { root: { rx: -48 } })],
    dur: 2.4,
    ground: { y: 0.42, contacts: ['butt', 'pelvisLow'] },
    view: 'side',
    props: [{ type: 'sled' }, { type: 'seatBack' }, BENCH(-0.25, 0.42, 0.6)],
  }),
  squat_saute: m({
    keys: [
      with_(STAND, { lSh: [-30, 10, 0], rSh: [-30, 10, 0] }),
      with_(SQ_BOT, { lSh: [-40, 12, 0], rSh: [-40, 12, 0], lEl: 20, rEl: 20 }),
      with_(STAND, { air: 0.38, lSh: [150, 14, 0], rSh: [150, 14, 0], lAnk: -40, rAnk: -40 }),
    ],
    weights: [0.8, 0.8, 0.6],
    dur: 1.6,
    flatFeet: false,
  }),
  squat_bulgare: m({
    keys: [
      { lHip: [10, 5, 0], lKnee: 6, rHip: [-30, 5, 0], rKnee: 70, rAnk: -40, lSh: [0, 12, 0], rSh: [0, 12, 0] },
      { lHip: [86, 5, 0], lKnee: 95, rHip: [-12, 5, 0], rKnee: 105, rAnk: -40, root: { rx: 8 }, lSh: [0, 12, 0], rSh: [0, 12, 0] },
    ],
    dur: 2.4,
    flatFeet: 'l',
    ground: { contacts: ['lHeel', 'lToe'] },
    view: 'side',
    props: [{ type: 'blockRFoot', size: [0.5, 1, 0.35] }],
  }),
  pistol: m({
    keys: [
      { lHip: [0, 5, 0], lKnee: 4, rHip: [55, 5, 0], rKnee: 10, lSh: [60, 8, 0], rSh: [60, 8, 0], lEl: 0, rEl: 0 },
      { root: { rx: 22 }, lHip: [128, 5, 0], lKnee: 140, rHip: [100, 5, 0], rKnee: 0, lSh: [95, 8, 0], rSh: [95, 8, 0], lEl: 0, rEl: 0 },
    ],
    dur: 2.8,
    flatFeet: 'l',
    ground: { contacts: ['lHeel', 'lToe'] },
    view: 'side',
  }),
  fente_sautee: (() => {
    const lunge: Pose = { lHip: [82, 6, 0], lKnee: 92, rHip: [-22, 6, 0], rKnee: 104, rAnk: -35, lSh: [-30, 10, 0], rSh: [40, 10, 0], lEl: 70, rEl: 70 };
    const air = with_(STAND, { air: 0.25, lHip: [30, 6, 0], rHip: [10, 6, 0], lKnee: 30, rKnee: 30 });
    return m({ keys: [lunge, air, mirrorPose(lunge), air], weights: [1, 0.5, 1, 0.5], dur: 2, flatFeet: false, view: 'side' });
  })(),
  squat_statique: m({
    keys: [sym({ sh: [-35, 14, 0], el: 105, hip: [80, 34, 0], knee: 82 }, { neck: [0, 0, 0] })],
    dur: 3,
    flatFeet: true,
    breathe: true,
    view: 'front',
  }),
  chaise: m({ keys: [sym({ sh: [0, 12, 0], el: 10, hip: [90, 8, 0], knee: 90 })], dur: 3, flatFeet: true, breathe: true, view: 'side', props: [{ type: 'wall', pos: [0, 0, -0.2] }] }),
  souleve_terre: m({
    keys: [with_(HINGE(52, 62), { lSh: [54, 12, 0], rSh: [54, 12, 0], lEl: 0, rEl: 0, lHip: [92, 10, 0], rHip: [92, 10, 0] }), with_(STAND, { lSh: [2, 12, 0], rSh: [2, 12, 0], lEl: 0, rEl: 0 })],
    weights: [1.1, 0.9],
    dur: 2.6,
    flatFeet: true,
    view: 'side',
    props: [{ type: 'barbell' }],
  }),
  souleve_roumain: m({
    keys: [with_(STAND, { lSh: [2, 12, 0], rSh: [2, 12, 0], lEl: 0, rEl: 0 }), with_(HINGE(70, 16), { lSh: [72, 12, 0], rSh: [72, 12, 0], lEl: 0, rEl: 0 })],
    dur: 2.6,
    flatFeet: true,
    view: 'side',
    props: [{ type: 'barbell' }],
  }),
  souleve_une_jambe: m({
    keys: [
      { lHip: [0, 5, 0], lKnee: 8, rHip: [14, 5, 0], rKnee: 55, lSh: [0, 10, 0], rSh: [0, 10, 0] },
      { root: { rx: 74 }, lHip: [76, 5, 0], lKnee: 14, rHip: [2, 5, 0], rKnee: 4, lSh: [76, 12, 0], rSh: [76, 12, 0], lEl: 0, rEl: 0, neck: [-30, 0, 0] },
    ],
    dur: 2.8,
    flatFeet: 'l',
    ground: { contacts: ['lHeel', 'lToe'] },
    view: 'side',
  }),
  pont_fessier: m({
    keys: [sym({ sh: [0, 18, 0], el: 0, hip: [48, 10, 0], knee: 104 }, { neck: [22, 0, 0] }), sym({ sh: [0, 18, 0], el: 0, hip: [8, 10, 0], knee: 88 }, { neck: [34, 0, 0] })],
    dur: 2.2,
    two: { range: [-118, -55], a: ['upperBack', 'headBack'], b: ['lHeel', 'rHeel'] },
    flatFeet: true,
    view: 'side',
    props: MAT,
  }),
  pont_fessier_iso: m({
    keys: [sym({ sh: [0, 18, 0], el: 0, hip: [6, 10, 0], knee: 88 }, { neck: [34, 0, 0] })],
    dur: 3,
    two: { range: [-118, -55], a: ['upperBack', 'headBack'], b: ['lHeel', 'rHeel'] },
    flatFeet: true,
    breathe: true,
    view: 'side',
    props: MAT,
  }),
  hip_thrust: m({
    keys: [sym({ sh: [0, 30, 0], el: 30, hip: [66, 12, 0], knee: 100 }, { neck: [18, 0, 0] }), sym({ sh: [0, 30, 0], el: 30, hip: [4, 12, 0], knee: 86 }, { neck: [26, 0, 0] })],
    dur: 2.4,
    two: { range: [-125, -45], a: ['upperBack'], b: ['lHeel', 'rHeel'], dy: -0.42 },
    flatFeet: true,
    view: 'side',
    props: [{ type: 'barbell' }, BENCH(-0.64, 0.42, 0.45)],
  }),
  leg_curl: m({
    keys: [sym({ sh: [150, 25, 0], el: 40, hip: [0, 4, 0], knee: 4 }, { root: { rx: 90 }, neck: [-20, 0, 0] }), sym({ sh: [150, 25, 0], el: 40, hip: [0, 4, 0], knee: 112 }, { root: { rx: 90 }, neck: [-20, 0, 0] })],
    dur: 2.2,
    ground: { y: 0.48, contacts: ['chestFront', 'pelvisLow', 'lKnee', 'rKnee'] },
    view: 'side',
    props: [BENCH(0.05, 0.48, 1.3)],
  }),
  mollets: m({ keys: [sym({ sh: [0, 10, 0], el: 10, hip: [0, 5, 0], knee: 0, ank: 14 }), sym({ sh: [0, 10, 0], el: 10, hip: [0, 5, 0], knee: 0, ank: -32 })], dur: 1.6, ground: { contacts: ['lToe', 'rToe'], y: 0.12 }, view: 'side', props: [{ type: 'step', pos: [0, 0, 0.2], size: [0.7, 0.12, 0.25] }] }),

  /* — Gainage — */
  gainage: m({ keys: [sym({ sh: [88, 14, 0], el: 92, hip: [0, 4, 0] }, { neck: [-15, 0, 0] })], dur: 3, two: { range: [40, 110], a: ['lElbow', 'rElbow'], b: ['lToe', 'rToe'] }, breathe: true, view: 'side', props: MAT }),
  gainage_lateral: m({
    keys: [{ lSh: [0, 88, 0], lEl: 90, rSh: [0, 172, 0], rEl: 0, lHip: [0, 2, 0], rHip: [0, -2, 0], neck: [0, 10, 0] }],
    dur: 3,
    two: { axis: 'rz', range: [-120, -50], a: ['lElbow'], b: ['lHeel', 'lToe'] },
    breathe: true,
    view: 'front',
    props: MAT,
  }),
  hollow_hold: m({ keys: [sym({ sh: [172, 8, 0], el: 0, hip: [22, 2, 0], knee: 0 }, { root: { rx: SUPINE }, chest: [22, 0, 0], neck: [20, 0, 0] })], dur: 3, breathe: true, view: 'side', props: MAT }),
  leg_raise: m({ keys: [sym({ sh: [0, 14, 0], el: 0, hip: [8, 2, 0], knee: 0 }, { root: { rx: SUPINE } }), sym({ sh: [0, 14, 0], el: 0, hip: [92, 2, 0], knee: 0 }, { root: { rx: SUPINE } })], dur: 2.4, anchor: ['back', 'upperBack'], view: 'side', props: MAT }),
  crunch: m({
    keys: [sym({ sh: [160, 60, 0], el: 130, hip: [55, 8, 0], knee: 95 }, { root: { rx: SUPINE } }), sym({ sh: [160, 60, 0], el: 130, hip: [55, 8, 0], knee: 95 }, { root: { rx: SUPINE }, spine: [18, 0, 0], chest: [22, 0, 0], neck: [10, 0, 0] })],
    dur: 2,
    flatFeet: true,
    view: 'side',
    props: MAT,
  }),
  russian_twist: m({
    // assis, buste incliné en arrière, talons posés devant
    keys: [
      sym({ sh: [62, 10, 0], el: 40, hip: [86, 6, 0], knee: 70 }, { root: { rx: -34 }, chest: [10, 0, 38] }),
      sym({ sh: [62, 10, 0], el: 40, hip: [86, 6, 0], knee: 70 }, { root: { rx: -34 }, chest: [10, 0, -38] }),
    ],
    dur: 1.8,
    ground: { contacts: ['butt', 'pelvisLow', 'lHeel', 'rHeel'] },
    view: 'front',
    props: MAT,
  }),
  dragon_flag: m({
    // haut du dos à plat sur le banc, mains agrippées derrière la tête, le reste du corps gainé en planche
    keys: [
      sym({ sh: [168, 24, 0], el: 40, hip: [0, 2, 0], knee: 0 }, { root: { rx: -138 }, spine: [22, 0, 0], chest: [24, 0, 0], neck: [6, 0, 0] }),
      sym({ sh: [168, 24, 0], el: 40, hip: [0, 2, 0], knee: 0 }, { root: { rx: -100 }, spine: [4, 0, 0], chest: [6, 0, 0], neck: [2, 0, 0] }),
    ],
    dur: 3,
    ground: { y: 0.45, contacts: ['upperBack', 'back'] },
    view: 'side',
    props: [BENCH(-0.35, 0.43, 1.0)],
  }),

  /* — Conditionnement — */
  burpee: m({
    keys: [
      STAND,
      with_(SQ_BOT, { root: { rx: 60 }, lSh: [70, 12, 0], rSh: [70, 12, 0], lEl: 0, rEl: 0 }),
      with_(PU_TOP, { root: { rx: 80 } }),
      with_(SQ_BOT, { root: { rx: 60 }, lSh: [70, 12, 0], rSh: [70, 12, 0], lEl: 0, rEl: 0 }),
      with_(STAND, { air: 0.3, lSh: [165, 14, 0], rSh: [165, 14, 0], lAnk: -35, rAnk: -35 }),
    ],
    weights: [0.6, 0.7, 0.8, 0.7, 0.6],
    dur: 3,
    anchor: false,
    view: 'side',
    props: MAT,
  }),
  mountain_climber: (() => {
    const a = sym({ sh: [80, 14, 0], el: 0, hip: [0, 4, 0], knee: 0 }, { lHip: [95, 4, 0], lKnee: 110, neck: [-18, 0, 0] });
    return m({ keys: [a, mirrorPose(a)], dur: 0.9, two: { range: [40, 110], a: ['lHand', 'rHand'], b: ['lToe', 'rToe'] }, view: 'side', props: MAT });
  })(),
  bear_crawl: (() => {
    // genoux décollés : appuis mains + pointes de pieds, hanches au-dessus des épaules
    const a: Pose = { lSh: [96, 10, 0], rSh: [72, 10, 0], lEl: 4, rEl: 4, lHip: [80, 8, 0], rHip: [102, 8, 0], lKnee: 66, rKnee: 60, lAnk: 20, rAnk: 20, neck: [-35, 0, 0] };
    return m({ keys: [a, mirrorPose(a)], dur: 1.2, two: { range: [60, 110], a: ['lHand', 'rHand'], b: ['lToe', 'rToe'] }, view: 'side', props: MAT });
  })(),
  sprint: (() => {
    const a: Pose = { lHip: [92, 4, 0], lKnee: 100, rHip: [-10, 4, 0], rKnee: 30, rAnk: -30, lSh: [-40, 8, 0], rSh: [60, 8, 0], lEl: 90, rEl: 90, air: 0.06, root: { rx: 6 } };
    return m({ keys: [a, mirrorPose(a)], dur: 0.6, view: 'side' });
  })(),
  shadow_boxing: (() => {
    const jab = with_(GUARD, { lSh: [88, 2, 0], lEl: 4, chest: [4, 0, -24] });
    const cross = with_(GUARD, { rSh: [88, -4, 0], rEl: 4, chest: [4, 0, 22], rHip: [-4, 8, 0] });
    return m({ keys: [GUARD, jab, GUARD, cross], weights: [0.8, 0.5, 0.8, 0.5], dur: 1.6, flatFeet: true, view: 'three4' });
  })(),
  seiken: (() => {
    const base = sym({ sh: [-32, 14, 0], el: 112, hip: [40, 26, 0], knee: 40 });
    const punchL = with_(base, { lSh: [86, -8, 0], lEl: 0, chest: [0, 0, -14] });
    return m({ keys: [base, punchL, base, mirrorPose(punchL)], weights: [0.7, 0.5, 0.7, 0.5], dur: 1.4, flatFeet: true, view: 'front' });
  })(),
  mae_geri: (() => {
    const g = with_(GUARD, { root: { ry: 0 }, chest: [0, 0, 0], neck: [0, 0, 0], lKnee: 24, lAnk: 20 });
    const chamber = with_(g, { lHip: [95, 6, 0], lKnee: 110, lAnk: -10 });
    const kick = with_(g, { lHip: [92, 6, 0], lKnee: 6, lAnk: -30, spine: [-6, 0, 0] });
    return m({ keys: [g, chamber, kick, chamber], weights: [0.8, 0.4, 0.5, 0.4], dur: 1.8, flatFeet: 'r', ground: { contacts: ['rHeel', 'rToe'] }, view: 'side' });
  })(),
  corde: m({
    keys: [sym({ sh: [8, 26, 0], el: 75, hip: [4, 4, 0], knee: 10, ank: -10 }), sym({ sh: [8, 26, 0], el: 75, hip: [4, 4, 0], knee: 4, ank: -35 }, { air: 0.1 })],
    dur: 0.5,
    ground: { contacts: ['lToe', 'rToe', 'lHeel', 'rHeel'] },
    view: 'three4',
    props: [{ type: 'jumpRope' }],
  }),
  kb_swing: m({
    keys: [with_(HINGE(62, 30), { lSh: [30, 4, 0], rSh: [30, 4, 0], lEl: 0, rEl: 0 }), with_(STAND, { lSh: [92, 4, 0], rSh: [92, 4, 0], lEl: 0, rEl: 0 })],
    dur: 1.6,
    flatFeet: true,
    view: 'side',
    props: [{ type: 'kettlebell' }],
  }),

  /* — Grip — */
  farmer_walk: (() => {
    const a: Pose = { lHip: [24, 6, 0], lKnee: 14, rHip: [-12, 6, 0], rKnee: 22, lSh: [0, 14, 0], rSh: [0, 14, 0], lEl: 0, rEl: 0, shrug: -0.01 };
    return m({ keys: [a, mirrorPose(a)], dur: 1.2, flatFeet: true, view: 'three4', props: [{ type: 'dumbbells' }] });
  })(),
  farmer_hold_home: m({ keys: [with_(STAND, { lSh: [0, 14, 0], rSh: [0, 14, 0], lEl: 0, rEl: 0 })], dur: 3, flatFeet: true, breathe: true, props: [{ type: 'dumbbells' }] }),
  towel_squeeze: m({
    keys: [with_(STAND, { lSh: [62, 4, 20], rSh: [62, 4, -10], lEl: 70, rEl: 70 }), with_(STAND, { lSh: [62, 4, -10], rSh: [62, 4, 20], lEl: 70, rEl: 70 })],
    dur: 1.4,
    flatFeet: true,
    props: [{ type: 'towelHands' }],
  }),
};

/** Animation d'un exercice (repli sur une posture debout neutre) */
export function motionFor(id: string): Motion {
  return MOTIONS[id] ?? m({ keys: [STAND], dur: 3, flatFeet: true, breathe: true });
}
