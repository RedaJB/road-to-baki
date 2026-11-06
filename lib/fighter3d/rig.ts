/**
 * Combattant 3D de secours (rendu manga, visage lisse) : crinière rousse en pointes, musculature détaillée, pantalon de combat et ceinture nouée.
 * Le personnage affiché par défaut est le modèle riggé de public/fighter/ (voir model.ts).
 * Squelette piloté par poses.
 * Conventions des angles (degrés) :
 *  - épaule/hanche : [flexion (+ = vers l'avant), abduction (+ = vers l'extérieur), rotation]
 *  - coude : flexion (+ = avant-bras vers l'avant) · genou : flexion (+ = talon vers les fesses)
 *  - colonne/thorax : [flexion avant, inclinaison latérale, torsion]
 *  - cheville : + = pointe des pieds vers le haut
 * Le personnage regarde vers +Z, sa gauche est +X.
 */
import * as THREE from 'three';
import { mangaMaterial, outlineFor } from './manga';

export type V3 = [number, number, number];

export interface Pose {
  root?: { x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number };
  spine?: V3;
  chest?: V3;
  neck?: V3;
  lSh?: V3;
  rSh?: V3;
  lEl?: number;
  rEl?: number;
  lHip?: V3;
  rHip?: V3;
  lKnee?: number;
  rKnee?: number;
  lAnk?: number;
  rAnk?: number;
  /** Décollage vertical (saut), en mètres, ajouté après le calage au sol */
  air?: number;
  /** Haussement des épaules, en mètres */
  shrug?: number;
}

export interface Palette {
  skin: string;
  skinShade?: string;
  shorts: string;
  belt: string;
  hair: string;
  band: string;
  wraps: string;
}

export type HairStyle = 'band' | 'bald' | 'buzz' | 'spiky' | 'long' | 'bun' | 'slick' | 'mohawk';

export interface FighterStyle {
  hair?: HairStyle;
  /** corpulence (1 = athlétique, 1.4 = colosse) */
  bulk?: number;
  /** barbe courte */
  beard?: boolean;
  /** bandes aux mains */
  wraps?: boolean;
}

export const DEFAULT_PALETTE: Palette = {
  skin: '#dc9a6e',
  shorts: '#1d1d24',
  belt: '#c8323a',
  hair: '#b8321a',
  band: '#ece8e1',
  wraps: '#ece8e1',
};

const d2r = THREE.MathUtils.degToRad;

/** Matériau à plat (rendu manga : ombres hachurées, voir manga.ts) */
export function toon(color: string) {
  return mangaMaterial({ color });
}

/** Maillage + contour à l'encre d'épaisseur constante */
export function inked(geo: THREE.BufferGeometry, mat: THREE.Material, _outline = 1.04) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.add(outlineFor(geo));
  return m;
}

function capsule(r: number, len: number, mat: THREE.Material, outline = 1.08) {
  return inked(new THREE.CapsuleGeometry(r, len, 6, 14), mat, outline);
}

function sphere(rx: number, ry: number, rz: number, mat: THREE.Material, outline = 1.06) {
  const m = inked(new THREE.SphereGeometry(1, 28, 18), mat, outline);
  m.scale.set(rx, ry, rz);
  return m;
}

/** Volume sans contour (relief musculaire, traits du visage) : se fond dans la peau */
function bump(rx: number, ry: number, rz: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat);
  m.scale.set(rx, ry, rz);
  m.castShadow = true;
  return m;
}

export interface Rig {
  root: THREE.Group;
  joints: Record<string, THREE.Object3D>;
  markers: Record<string, THREE.Object3D>;
  hands: { l: THREE.Object3D; r: THREE.Object3D };
  feet: { l: THREE.Object3D; r: THREE.Object3D };
  pelvis: THREE.Object3D;
}

type Profile = [number, number][];

/** Volume de révolution lissé (profil [rayon, y] de haut en bas), aplati en profondeur si besoin */
function lathe(profile: Profile, mat: THREE.Material, depth = 1, outline = 1.03, segs = 32) {
  const pts = [...profile].reverse().map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0005), y));
  const geo = new THREE.LatheGeometry(pts, segs);
  geo.computeVertexNormals();
  const m = inked(geo, mat, outline);
  m.scale.z = depth;
  return m;
}

/** Membre galbé : de l'articulation (y = 0) jusqu'à -len, bouts arrondis, renflement musculaire */
function limbProfile(len: number, rTop: number, rBot: number, bulge = 0, at = 0.35): Profile {
  const p: Profile = [];
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * (Math.PI / 2);
    p.push([rTop * Math.sin(a), rTop * Math.cos(a) * 0.7]);
  }
  const n = 14;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    p.push([rTop + (rBot - rTop) * t + bulge * Math.exp(-(((t - at) / 0.24) ** 2)), -len * t]);
  }
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * (Math.PI / 2);
    p.push([rBot * Math.cos(a), -len - rBot * Math.sin(a) * 0.7]);
  }
  return p;
}

/** Crinière rousse en pointes (repère : centre de la tête) : calotte + mèches balayées vers l'arrière, frange dressée */
export function spikyHair(hair: THREE.Material) {
  const g = new THREE.Group();
  const cap = inked(new THREE.SphereGeometry(0.104, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 1.03);
  cap.position.set(0, 0.016, -0.014);
  cap.rotation.x = -0.2;
  cap.scale.set(1.1, 1.12, 1.14);
  g.add(cap);
  const up = new THREE.Vector3(0, 1, 0);
  const center = new THREE.Vector3(0, 0.015, -0.015);
  // [élévation, azimut (0 = devant), longueur, épaisseur]
  const tufts: [number, number, number, number][] = [];
  for (const az of [-0.62, -0.31, 0, 0.31, 0.62]) tufts.push([0.5, az, 0.1, 0.038]);
  for (const az of [-0.85, -0.45, -0.1, 0.25, 0.65, 0.9]) tufts.push([0.85, az, 0.13, 0.045]);
  for (const az of [-0.5, 0, 0.5]) tufts.push([1.25, az, 0.15, 0.05]);
  for (const az of [-1.55, -1.2, 1.2, 1.55]) tufts.push([0.55, az, 0.11, 0.042]);
  for (const az of [-1.6, -1.25, 1.25, 1.6]) tufts.push([1.0, az, 0.13, 0.046]);
  for (const az of [-2.7, -2.25, -1.85, 1.85, 2.25, 2.7, Math.PI]) tufts.push([0.75, az, 0.14, 0.05]);
  for (const az of [-2.5, -1.95, 1.95, 2.5, Math.PI]) tufts.push([0.3, az, 0.12, 0.045]);
  for (const az of [-2.2, -1.6, 1.6, 2.2, Math.PI]) tufts.push([1.3, az, 0.13, 0.048]);
  tufts.push([1.5, 0, 0.13, 0.05]);
  tufts.forEach(([el, az, len, r], i) => {
    const n = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const front = Math.abs(az) < 0.95 && el < 1;
    // la frange se dresse, le reste part vers l'arrière ; légère variation pour casser la symétrie
    const sweep = front ? new THREE.Vector3(0, 0.45, 0.3) : new THREE.Vector3(0, 0.15, -0.35);
    const dir = n.clone().add(sweep).normalize();
    const geo = new THREE.ConeGeometry(r, len * (1 + ((i * 37) % 7) / 30), 5);
    geo.translate(0, len / 2 - 0.02, 0);
    const tuft = inked(geo, hair, 1.06);
    tuft.userData.noContact = true; // mèches souples : ignorées pour le calage au sol
    tuft.position.copy(center).addScaledVector(n, 0.082);
    tuft.quaternion.setFromUnitVectors(up, dir);
    tuft.rotateY(((i * 53) % 11) / 10);
    g.add(tuft);
  });
  return g;
}

export function buildFighter(palette: Palette = DEFAULT_PALETTE, style: FighterStyle = {}): Rig {
  const bulk = style.bulk ?? 1;
  const sb = Math.sqrt(bulk);
  const skin = toon(palette.skin);
  const pants = toon(palette.shorts);
  const belt = toon(palette.belt);
  const hair = toon(palette.hair);

  const root = new THREE.Group();
  const joints: Record<string, THREE.Object3D> = {};
  const markers: Record<string, THREE.Object3D> = {};
  const mark = (name: string, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    markers[name] = o;
    return o;
  };

  // Bassin : pantalon de combat + ceinture
  const pelvis = new THREE.Group();
  root.add(pelvis);
  const hips = lathe([[0.0, 0.09], [0.14 * sb, 0.08], [0.155 * sb, 0.02], [0.16 * sb, -0.06], [0.13 * sb, -0.13], [0.0, -0.15]], pants, 0.74);
  pelvis.add(hips);
  // ceinture en tissu nouée sur le côté, deux pans qui tombent
  const beltM = inked(new THREE.CylinderGeometry(0.152 * sb, 0.156 * sb, 0.05, 32, 1, true), belt, 1.04);
  beltM.position.y = 0.07;
  beltM.scale.z = 0.76;
  (beltM.material as THREE.Material).side = THREE.DoubleSide;
  pelvis.add(beltM);
  const knot = sphere(0.028, 0.026, 0.02, belt, 1.08);
  knot.position.set(0.128 * sb, 0.07, 0.072 * sb);
  pelvis.add(knot);
  for (const [dx, rz, len] of [[-0.004, 0.08, 0.12], [0.012, -0.22, 0.1]] as const) {
    const g = new THREE.CapsuleGeometry(0.014, len, 4, 10);
    g.translate(0, -len / 2, 0);
    const tail = inked(g, belt, 1.08);
    tail.scale.z = 0.45;
    tail.position.set(0.13 * sb + dx, 0.055, 0.078 * sb);
    tail.rotation.y = 0.9;
    tail.rotation.z = rz;
    tail.userData.noContact = true;
    pelvis.add(tail);
  }
  mark('pelvisLow', pelvis, 0, -0.13, 0);
  mark('butt', pelvis, 0, -0.04, -0.13);

  // Taille (abdos)
  const spine = new THREE.Group();
  spine.position.y = 0.06;
  pelvis.add(spine);
  joints.spine = spine;
  spine.add(lathe([[0.0, 0.24], [0.15 * sb, 0.22], [0.14 * sb, 0.12], [0.135 * sb, 0.02], [0.0, -0.02]], skin, 0.72));
  for (let row = 0; row < 3; row++) {
    for (const s of [-1, 1]) {
      const ab = bump(0.031 - row * 0.001, 0.024, 0.014, skin);
      ab.position.set(s * 0.034, 0.035 + row * 0.054, 0.093 * sb);
      spine.add(ab);
    }
  }
  for (const s of [-1, 1]) {
    // obliques
    const obl = bump(0.04, 0.075, 0.05, skin);
    obl.position.set(s * 0.105 * sb, 0.08, 0.04 * sb);
    obl.rotation.z = s * 0.15;
    spine.add(obl);
  }

  // Thorax en V
  const chest = new THREE.Group();
  chest.position.y = 0.2;
  spine.add(chest);
  joints.chest = chest;
  const torso = lathe(
    [[0.0, 0.36], [0.1 * bulk, 0.345], [0.2 * bulk, 0.3], [0.225 * bulk, 0.24], [0.21 * bulk, 0.15], [0.175 * bulk, 0.06], [0.15 * sb, 0.0], [0.0, -0.03]],
    skin,
    0.6,
  );
  chest.add(torso);
  for (const s of [-1, 1]) {
    const pec = sphere(0.088 * bulk, 0.058 * bulk, 0.034 * bulk, skin, 1.0);
    pec.position.set(s * 0.075 * bulk, 0.2, 0.105 * bulk);
    pec.rotation.z = s * 0.12;
    chest.add(pec);
    const lat = sphere(0.06 * bulk, 0.13, 0.07, skin, 1.0);
    lat.position.set(s * 0.17 * bulk, 0.14, -0.02);
    lat.rotation.z = s * -0.25;
    chest.add(lat);
    const trap = sphere(0.095 * bulk, 0.055 * bulk, 0.065 * bulk, skin, 1.02);
    trap.position.set(s * 0.08 * bulk, 0.335, -0.025);
    trap.rotation.z = s * -0.5;
    chest.add(trap);
    // dentelés sur les côtes
    for (let k = 0; k < 3; k++) {
      const ser = bump(0.02, 0.011, 0.012, skin);
      ser.position.set(s * (0.145 - k * 0.008) * bulk, 0.17 - k * 0.04, 0.078 * bulk);
      ser.rotation.z = s * 0.5;
      chest.add(ser);
    }
    // dos : grands ronds et dorsaux en relief
    const tm = bump(0.07 * bulk, 0.05, 0.03, skin);
    tm.position.set(s * 0.1 * bulk, 0.22, -0.115 * bulk);
    chest.add(tm);
  }
  mark('back', chest, 0, 0.14, -0.13);
  mark('upperBack', chest, 0, 0.24, -0.11);
  mark('chestFront', chest, 0, 0.14, 0.14);

  // Cou de lutteur + tête au visage marqué
  const neck = new THREE.Group();
  neck.position.y = 0.3;
  chest.add(neck);
  joints.neck = neck;
  const neckM = inked(new THREE.CylinderGeometry(0.07 * bulk, 0.092 * bulk, 0.14, 20), skin, 1.03);
  neckM.position.y = 0.04;
  neck.add(neckM);
  for (const s of [-1, 1]) {
    // sterno-cléido-mastoïdiens
    const scm = bump(0.016, 0.07, 0.018, skin);
    scm.position.set(s * 0.034, 0.03, 0.058 * bulk);
    scm.rotation.z = s * 0.35;
    scm.rotation.x = -0.25;
    neck.add(scm);
  }
  const head = new THREE.Group();
  head.position.y = 0.17;
  neck.add(head);
  head.add(sphere(0.094, 0.112, 0.104, skin, 1.03));
  const jaw = sphere(0.08, 0.058, 0.078, skin, 1.0);
  jaw.position.set(0, -0.06, 0.012);
  head.add(jaw);
  const chin = bump(0.034, 0.026, 0.024, skin);
  chin.position.set(0, -0.093, 0.072);
  head.add(chin);
  for (const s of [-1, 1]) {
    const ear = sphere(0.016, 0.028, 0.012, skin, 1.04);
    ear.position.set(s * 0.094, -0.008, -0.008);
    head.add(ear);
  }
  head.add(spikyHair(hair));
  mark('head', head, 0, 0.12, 0);
  mark('face', head, 0, 0, 0.11);
  mark('headBack', head, 0, 0, -0.11);

  // Bras
  const hands = { l: null as unknown as THREE.Object3D, r: null as unknown as THREE.Object3D };
  for (const [side, s] of [['l', 1], ['r', -1]] as const) {
    const sh = new THREE.Group();
    sh.position.set(s * 0.215 * Math.pow(bulk, 0.85), 0.255, 0);
    sh.userData.baseY = 0.255;
    sh.rotation.order = 'XZY';
    chest.add(sh);
    joints[`${side}Sh`] = sh;
    const delt = sphere(0.09 * bulk, 0.086 * bulk, 0.084 * bulk, skin, 1.02);
    delt.position.y = -0.01;
    sh.add(delt);
    sh.add(lathe(limbProfile(0.3, 0.068 * bulk, 0.048 * sb, 0.016 * bulk, 0.42), skin, 0.92));
    const bi = bump(0.048 * bulk, 0.085, 0.045 * bulk, skin);
    bi.position.set(0, -0.15, 0.028 * bulk);
    sh.add(bi);
    const tri = bump(0.05 * bulk, 0.09, 0.042 * bulk, skin);
    tri.position.set(-s * 0.006, -0.12, -0.03 * bulk);
    sh.add(tri);
    const el = new THREE.Group();
    el.position.y = -0.3;
    sh.add(el);
    joints[`${side}El`] = el;
    el.add(lathe(limbProfile(0.265, 0.054 * sb, 0.036, 0.012 * bulk, 0.22), skin, 0.85));
    const fore = bump(0.045 * sb, 0.08, 0.042, skin);
    fore.position.set(s * 0.012, -0.065, 0.008);
    el.add(fore);
    const wrist = new THREE.Group();
    wrist.position.y = -0.265;
    el.add(wrist);
    // poing fermé : paume, deux rangées de phalanges, pouce replié
    const fist = sphere(0.046, 0.052, 0.042, skin, 1.03);
    fist.position.y = -0.045;
    wrist.add(fist);
    for (let f = 0; f < 4; f++) {
      const x = (f - 1.5) * 0.021;
      const k1 = bump(0.012, 0.011, 0.013, skin);
      k1.position.set(x, -0.088 + Math.abs(f - 1.5) * 0.004, 0.01);
      wrist.add(k1);
      const k2 = bump(0.011, 0.012, 0.01, skin);
      k2.position.set(x, -0.068, 0.034);
      wrist.add(k2);
    }
    const thumbG = new THREE.CapsuleGeometry(0.011, 0.026, 4, 8);
    thumbG.rotateZ(Math.PI / 2);
    const thumb = new THREE.Mesh(thumbG, skin);
    thumb.position.set(-s * 0.006, -0.056, 0.04);
    thumb.rotation.y = s * 0.3;
    wrist.add(thumb);
    hands[side] = mark(`${side}Hand`, wrist, 0, -0.06, 0);
    mark(`${side}Elbow`, el, 0, 0, -0.05);
  }

  // Jambes : pantalon ample, pieds nus
  const feet = { l: null as unknown as THREE.Object3D, r: null as unknown as THREE.Object3D };
  for (const [side, s] of [['l', 1], ['r', -1]] as const) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.095, -0.04, 0);
    hip.rotation.order = 'XZY';
    pelvis.add(hip);
    joints[`${side}Hip`] = hip;
    hip.add(lathe(limbProfile(0.45, 0.105 * sb, 0.07, 0.012, 0.3), pants, 0.92));
    const knee = new THREE.Group();
    knee.position.y = -0.45;
    hip.add(knee);
    joints[`${side}Knee`] = knee;
    knee.add(lathe(limbProfile(0.4, 0.074, 0.066, 0.01, 0.3), pants, 0.95));
    const ankle = new THREE.Group();
    ankle.position.y = -0.44;
    knee.add(ankle);
    joints[`${side}Ank`] = ankle;
    const cuff = inked(new THREE.CylinderGeometry(0.06, 0.068, 0.05, 16), pants, 1.03);
    cuff.position.y = 0.05;
    ankle.add(cuff);
    ankle.add(sphere(0.042, 0.045, 0.045, skin, 1.03));
    const footGeo = new THREE.CapsuleGeometry(0.04, 0.15, 6, 14);
    footGeo.rotateX(Math.PI / 2);
    const foot = inked(footGeo, skin, 1.04);
    foot.position.set(0, -0.035, 0.055);
    foot.scale.set(1.08, 0.7, 1);
    ankle.add(foot);
    for (let t = 0; t < 5; t++) {
      const toe = bump(t === 0 ? 0.013 : 0.009, 0.009, 0.012, skin);
      toe.position.set(-s * (0.024 - t * 0.012) * (t === 0 ? 0.9 : 1), -0.052, 0.14 - t * 0.004);
      ankle.add(toe);
    }
    mark(`${side}Heel`, ankle, 0, -0.065, -0.05);
    feet[side] = mark(`${side}Toe`, ankle, 0, -0.065, 0.15);
    mark(`${side}Knee`, knee, 0, 0, 0.07);
  }

  const rig = { root, joints, markers, hands, feet, pelvis };
  attachContactPoints(rig);
  return rig;
}

/* ───────── contacts ───────── */

/** Rayon autour de chaque repère dans lequel on cherche la surface du corps */
const CONTACT_R: Record<string, number> = { back: 0.13, upperBack: 0.13, chestFront: 0.13, butt: 0.11, pelvisLow: 0.11, lHeel: 0.13, rHeel: 0.13 };

/**
 * Chaque repère garde les points de peau voisins (dans son propre repère local) :
 * le calage se fait sur la surface réelle (dessous du poing, talon, dos…) et plus sur un point intérieur.
 */
function attachContactPoints(rig: Rig) {
  const parts = new Set<THREE.Object3D>([rig.root, rig.pelvis, ...Object.values(rig.joints)]);
  const partOf = (o: THREE.Object3D) => {
    let x = o.parent;
    while (x && !parts.has(x)) x = x.parent;
    return x;
  };
  rig.root.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  rig.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !m.userData.outline && !m.userData.noContact) meshes.push(m);
  });
  const v = new THREE.Vector3();
  const center = new THREE.Vector3();
  for (const [name, mk] of Object.entries(rig.markers)) {
    const r = CONTACT_R[name] ?? 0.08;
    const part = partOf(mk);
    mk.getWorldPosition(center);
    const inv = mk.matrixWorld.clone().invert();
    const pts: THREE.Vector3[] = [];
    for (const m of meshes) {
      if (partOf(m) !== part) continue;
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        if (v.distanceTo(center) < r) pts.push(v.clone().applyMatrix4(inv));
      }
    }
    const step = Math.max(1, Math.ceil(pts.length / 60));
    mk.userData.contact = pts.filter((_, i) => i % step === 0);
  }
}

const cp = new THREE.Vector3();
/** Hauteur du point de peau le plus bas autour d'un repère (le repère lui-même s'il n'a pas de surface) */
export function contactY(o: THREE.Object3D) {
  const pts = o.userData.contact as THREE.Vector3[] | undefined;
  if (!pts?.length) return worldY(o);
  let m = Infinity;
  for (const p of pts) m = Math.min(m, cp.copy(p).applyMatrix4(o.matrixWorld).y);
  return m;
}

/* ───────── poses ───────── */

const ZERO: V3 = [0, 0, 0];

export function applyPose(rig: Rig, p: Pose) {
  const j = rig.joints;
  const r = p.root ?? {};
  rig.root.position.set(r.x ?? 0, r.y ?? 0.95, r.z ?? 0);
  rig.root.rotation.set(d2r(r.rx ?? 0), d2r(r.ry ?? 0), d2r(r.rz ?? 0), 'YXZ');
  const sp = p.spine ?? ZERO;
  j.spine.rotation.set(d2r(sp[0]), d2r(sp[2]), d2r(-sp[1]));
  const ch = p.chest ?? ZERO;
  j.chest.rotation.set(d2r(ch[0]), d2r(ch[2]), d2r(-ch[1]));
  const nk = p.neck ?? ZERO;
  j.neck.rotation.set(d2r(nk[0]), d2r(nk[2]), d2r(-nk[1]));
  for (const [side, s] of [['l', 1], ['r', -1]] as const) {
    j[`${side}Sh`].position.y = (j[`${side}Sh`].userData.baseY as number) + (p.shrug ?? 0);
    const sh = (side === 'l' ? p.lSh : p.rSh) ?? [0, 8, 0];
    j[`${side}Sh`].rotation.set(d2r(-sh[0]), d2r(s * sh[2]), d2r(s * sh[1]));
    j[`${side}El`].rotation.set(d2r(-((side === 'l' ? p.lEl : p.rEl) ?? 8)), 0, 0);
    const hp = (side === 'l' ? p.lHip : p.rHip) ?? [0, 3, 0];
    j[`${side}Hip`].rotation.set(d2r(-hp[0]), d2r(s * hp[2]), d2r(s * hp[1]));
    j[`${side}Knee`].rotation.set(d2r((side === 'l' ? p.lKnee : p.rKnee) ?? 0), 0, 0);
    j[`${side}Ank`].rotation.set(d2r(-((side === 'l' ? p.lAnk : p.rAnk) ?? 0)), 0, 0);
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function lerpV(a: V3 | undefined, b: V3 | undefined, t: number, def: V3): V3 {
  const x = a ?? def;
  const y = b ?? def;
  return [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)];
}

export function blendPose(a: Pose, b: Pose, t: number): Pose {
  const ra = a.root ?? {};
  const rb = b.root ?? {};
  const n = (x: number | undefined, y: number | undefined, def: number) => lerp(x ?? def, y ?? def, t);
  return {
    root: { x: n(ra.x, rb.x, 0), y: n(ra.y, rb.y, 0.95), z: n(ra.z, rb.z, 0), rx: n(ra.rx, rb.rx, 0), ry: n(ra.ry, rb.ry, 0), rz: n(ra.rz, rb.rz, 0) },
    spine: lerpV(a.spine, b.spine, t, ZERO),
    chest: lerpV(a.chest, b.chest, t, ZERO),
    neck: lerpV(a.neck, b.neck, t, ZERO),
    lSh: lerpV(a.lSh, b.lSh, t, [0, 8, 0]),
    rSh: lerpV(a.rSh, b.rSh, t, [0, 8, 0]),
    lEl: n(a.lEl, b.lEl, 8),
    rEl: n(a.rEl, b.rEl, 8),
    lHip: lerpV(a.lHip, b.lHip, t, [0, 3, 0]),
    rHip: lerpV(a.rHip, b.rHip, t, [0, 3, 0]),
    lKnee: n(a.lKnee, b.lKnee, 0),
    rKnee: n(a.rKnee, b.rKnee, 0),
    lAnk: n(a.lAnk, b.lAnk, 0),
    rAnk: n(a.rAnk, b.rAnk, 0),
    air: n(a.air, b.air, 0),
    shrug: n(a.shrug, b.shrug, 0),
  };
}

/** Miroir gauche/droite d'une pose (pour les exercices alternés) */
export function mirrorPose(p: Pose): Pose {
  const r = p.root ?? {};
  const flipV = (v?: V3): V3 | undefined => (v ? [v[0], -v[1], -v[2]] : undefined);
  return {
    ...p,
    root: { ...r, x: r.x !== undefined ? -r.x : undefined, ry: r.ry !== undefined ? -r.ry : undefined, rz: r.rz !== undefined ? -r.rz : undefined },
    spine: flipV(p.spine),
    chest: flipV(p.chest),
    neck: flipV(p.neck),
    lSh: p.rSh,
    rSh: p.lSh,
    lEl: p.rEl,
    rEl: p.lEl,
    lHip: p.rHip,
    rHip: p.lHip,
    lKnee: p.rKnee,
    rKnee: p.lKnee,
    lAnk: p.rAnk,
    rAnk: p.lAnk,
  };
}

const tmp = new THREE.Vector3();
export function worldY(o: THREE.Object3D) {
  o.getWorldPosition(tmp);
  return tmp.y;
}
export function worldPos(o: THREE.Object3D, out = new THREE.Vector3()) {
  return o.getWorldPosition(out);
}

export const CONTACTS = ['lHeel', 'rHeel', 'lToe', 'rToe', 'lHand', 'rHand', 'lKnee', 'rKnee', 'pelvisLow', 'butt', 'back', 'upperBack', 'chestFront', 'head', 'headBack', 'face', 'lElbow', 'rElbow'];

export function minY(rig: Rig, names: string[] = CONTACTS) {
  rig.root.updateMatrixWorld(true);
  let m = Infinity;
  for (const n of names) m = Math.min(m, contactY(rig.markers[n]));
  return m;
}
