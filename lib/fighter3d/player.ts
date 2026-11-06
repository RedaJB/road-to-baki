/**
 * Lecteur d'animations d'exercices : scène three.js, accessoires, calage au sol, caméra auto.
 * Indépendant de React : utilisé dans l'appli (aperçu des exos) et pour générer les pubs.
 */
import * as THREE from 'three';
import { applyPose, buildFighter, contactY, inked, minY, toon, worldPos, type FighterStyle, type Palette, type Pose, type Rig, type V3, DEFAULT_PALETTE } from './rig';
import type { ExternalFighter, HandPose } from './model';
import { halftoneShadowMaterial, setMangaViewport } from './manga';

export type PropType =
  | 'mat'
  | 'barbell'
  | 'dumbbells'
  | 'dumbbellR'
  | 'dumbbellHands'
  | 'kettlebell'
  | 'pullBar'
  | 'dipBars'
  | 'bench'
  | 'blockHands'
  | 'blockFeet'
  | 'blockRFoot'
  | 'blockLHand'
  | 'step'
  | 'wall'
  | 'table'
  | 'jumpRope'
  | 'cable'
  | 'plateBelt'
  | 'sled'
  | 'seatBack'
  | 'towelsBar'
  | 'towelHands'
  | 'towelFoot';

export interface PropSpec {
  type: PropType;
  /** position [x, y, z] (accessoires fixes) */
  pos?: [number, number, number];
  /** rotation Y en degrés */
  ry?: number;
  /** taille [largeur, hauteur, longueur] pour bancs / blocs / murs */
  size?: [number, number, number];
}

export interface TwoContact {
  /** axe résolu (rotation racine) */
  axis?: 'rx' | 'rz';
  range: [number, number];
  a: string[];
  b: string[];
  /** hauteur du groupe b par rapport au groupe a */
  dy?: number;
}

export interface Motion {
  keys: Pose[];
  /** durée d'un cycle (s) */
  dur: number;
  /** pondération du temps de chaque segment (sinon égal) */
  weights?: number[];
  /** calage au sol : contacts + hauteur */
  ground?: { y?: number; contacts?: string[] } | false;
  /** solveur à deux appuis (pompes, gainage, ponts…) */
  two?: TwoContact;
  /** hauteur de la barre : les mains y sont accrochées */
  hang?: number;
  /** pieds à plat automatiques */
  flatFeet?: boolean | 'l' | 'r';
  props?: PropSpec[];
  view?: 'three4' | 'side' | 'front' | 'sideL';
  /** respiration légère pour les exercices statiques */
  breathe?: boolean;
  /** recul de caméra supplémentaire */
  zoom?: number;
  /** appuis qui restent fixes au sol (glissement horizontal corrigé) ; false = aucun */
  anchor?: string[] | false;
  /** mains : poing fermé ou paume à plat (déduit des appuis si absent) */
  hands?: HandPose | { l: HandPose; r: HandPose };
}

const d2r = THREE.MathUtils.degToRad;

/* ───────── interpolation ───────── */

const ZERO3: V3 = [0, 0, 0];

/** Pose → canaux numériques (valeurs par défaut comprises) */
function toChannels(p: Pose): number[] {
  const r = p.root ?? {};
  return [
    r.x ?? 0,
    r.y ?? 0.95,
    r.z ?? 0,
    r.rx ?? 0,
    r.ry ?? 0,
    r.rz ?? 0,
    ...(p.spine ?? ZERO3),
    ...(p.chest ?? ZERO3),
    ...(p.neck ?? ZERO3),
    ...(p.lSh ?? [0, 8, 0]),
    ...(p.rSh ?? [0, 8, 0]),
    p.lEl ?? 8,
    p.rEl ?? 8,
    ...(p.lHip ?? [0, 3, 0]),
    ...(p.rHip ?? [0, 3, 0]),
    p.lKnee ?? 0,
    p.rKnee ?? 0,
    p.lAnk ?? 0,
    p.rAnk ?? 0,
    p.air ?? 0,
    p.shrug ?? 0,
  ];
}

function fromChannels(c: number[]): Pose {
  const v3 = (i: number): V3 => [c[i], c[i + 1], c[i + 2]];
  return {
    root: { x: c[0], y: c[1], z: c[2], rx: c[3], ry: c[4], rz: c[5] },
    spine: v3(6),
    chest: v3(9),
    neck: v3(12),
    lSh: v3(15),
    rSh: v3(18),
    lEl: c[21],
    rEl: c[22],
    lHip: v3(23),
    rHip: v3(26),
    lKnee: c[29],
    rKnee: c[30],
    lAnk: c[31],
    rAnk: c[32],
    air: c[33],
    shrug: c[34],
  };
}

interface Curve {
  keys: number[][];
  tangents: number[][];
  times: number[];
  w: number[];
  total: number;
}
const curves = new WeakMap<Motion, Curve>();

/**
 * Courbe cubique monotone (Fritsch–Butland) passant par les poses clés, bouclée :
 * vitesse nulle aux extrêmes d'un mouvement (amorti naturel), continue quand il se poursuit (pas d'à-coups).
 */
function curveOf(m: Motion): Curve {
  const hit = curves.get(m);
  if (hit) return hit;
  const n = m.keys.length;
  const w = m.weights ?? m.keys.map(() => 1);
  const times = [0];
  for (let i = 0; i < n; i++) times.push(times[i] + w[i]);
  const keys = m.keys.map(toChannels);
  const tangents = keys.map((k, i) => {
    const prev = keys[(i - 1 + n) % n];
    const next = keys[(i + 1) % n];
    const h0 = w[(i - 1 + n) % n];
    const h1 = w[i];
    return k.map((y, c) => {
      const d0 = (y - prev[c]) / h0;
      const d1 = (next[c] - y) / h1;
      if (d0 * d1 <= 0) return 0;
      return (3 * (h0 + h1)) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1);
    });
  });
  const c: Curve = { keys, tangents, times, w, total: times[n] };
  curves.set(m, c);
  return c;
}

export function poseAt(m: Motion, t: number): Pose {
  const n = m.keys.length;
  if (n === 1) return m.keys[0];
  const c = curveOf(m);
  const x = ((((t / m.dur) % 1) + 1) % 1) * c.total;
  let i = 0;
  while (i < n - 1 && x >= c.times[i + 1]) i++;
  const h = c.w[i];
  const s = Math.min(1, Math.max(0, (x - c.times[i]) / h));
  const s2 = s * s;
  const s3 = s2 * s;
  const a = c.keys[i];
  const b = c.keys[(i + 1) % n];
  const ta = c.tangents[i];
  const tb = c.tangents[(i + 1) % n];
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  return fromChannels(a.map((y, k) => h00 * y + h10 * h * ta[k] + h01 * b[k] + h11 * h * tb[k]));
}

/** Appuis maintenus fixes au sol pendant l'exercice */
function anchorNames(m: Motion): string[] | null {
  if (m.anchor === false) return null;
  if (m.anchor) return m.anchor;
  if (m.hang) return ['lHand', 'rHand'];
  if (m.two) return m.two.a;
  if (m.ground && m.ground.contacts) return m.ground.contacts;
  return ['lHeel', 'rHeel', 'lToe', 'rToe'];
}

/** Paumes à plat quand les mains portent le corps au sol (pompes, gainage…), poings fermés sinon */
function handsFor(m: Motion): { l: HandPose; r: HandPose } {
  if (m.hands) return typeof m.hands === 'string' ? { l: m.hands, r: m.hands } : m.hands;
  const props = (m.props ?? []).map((p) => p.type);
  const onFloor = (s: 'l' | 'r') => {
    const names = [`${s}Hand`, `${s}Elbow`];
    return names.some((n) => m.two?.a.includes(n) || (m.ground && m.ground.contacts?.includes(n)));
  };
  return {
    l: onFloor('l') || props.includes('blockHands') || props.includes('blockLHand') ? 'flat' : 'fist',
    r: onFloor('r') || props.includes('blockHands') ? 'flat' : 'fist',
  };
}

/* ───────── accessoires ───────── */

const METAL = '#9aa0aa';
const DARK = '#24242a';
const WOOD = '#3a3a42';

function plate(r: number, w: number) {
  const g = new THREE.CylinderGeometry(r, r, w, 24);
  g.rotateZ(Math.PI / 2);
  return inked(g, toon(DARK), 1.04);
}

function makeBarbell() {
  const g = new THREE.Group();
  const barG = new THREE.CylinderGeometry(0.014, 0.014, 1.7, 10);
  barG.rotateZ(Math.PI / 2);
  g.add(inked(barG, toon(METAL), 1.3));
  for (const s of [-1, 1]) {
    const p = plate(0.2, 0.05);
    p.position.x = s * 0.62;
    g.add(p);
    const p2 = plate(0.15, 0.04);
    p2.position.x = s * 0.67;
    g.add(p2);
  }
  return g;
}

function makeDumbbell(len = 0.3) {
  const g = new THREE.Group();
  const h = new THREE.CylinderGeometry(0.016, 0.016, len, 8);
  h.rotateZ(Math.PI / 2);
  g.add(inked(h, toon(METAL), 1.3));
  for (const s of [-1, 1]) {
    const p = plate(0.06, 0.07);
    p.position.x = (s * len) / 2;
    g.add(p);
  }
  return g;
}

function makeKettlebell() {
  const g = new THREE.Group();
  const body = inked(new THREE.SphereGeometry(0.11, 18, 14), toon(DARK), 1.05);
  body.position.y = -0.13;
  g.add(body);
  const handle = inked(new THREE.TorusGeometry(0.06, 0.013, 8, 16, Math.PI), toon(DARK), 1.2);
  handle.position.y = -0.04;
  g.add(handle);
  return g;
}

function box(w: number, h: number, l: number, color = WOOD) {
  const m = inked(new THREE.BoxGeometry(w, h, l), toon(color), 1.02);
  m.receiveShadow = true;
  return m;
}

function bar(len: number, axis: 'x' | 'z', r = 0.018) {
  const g = new THREE.CylinderGeometry(r, r, len, 10);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  else g.rotateX(Math.PI / 2);
  return inked(g, toon(METAL), 1.2);
}

function post(h: number) {
  const m = inked(new THREE.CylinderGeometry(0.025, 0.025, h, 8), toon(DARK), 1.15);
  m.position.y = h / 2;
  return m;
}

/** Tube souple entre des points (corde, câble, serviette) */
function tube(points: THREE.Vector3[], r: number, mesh: THREE.Mesh | null, color: string) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 24, r, 6, false);
  if (mesh) {
    mesh.geometry.dispose();
    mesh.geometry = geo;
    return mesh;
  }
  const m = new THREE.Mesh(geo, toon(color));
  return m;
}

interface LiveProp {
  spec: PropSpec;
  obj: THREE.Object3D;
  update?: (rig: Rig, phase: number) => void;
}

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const vc = new THREE.Vector3();

/** Barycentre de repères (monde) */
function centroid(objs: THREE.Object3D[], out: THREE.Vector3) {
  out.set(0, 0, 0);
  for (const o of objs) out.add(worldPos(o, vc));
  return out.multiplyScalar(1 / Math.max(1, objs.length));
}

function createProp(spec: PropSpec, rig: Rig, scene: THREE.Scene): LiveProp {
  const [px, py, pz] = spec.pos ?? [0, 0, 0];
  const [sw, sh, sl] = spec.size ?? [0.42, 0.45, 1.2];
  switch (spec.type) {
    case 'mat': {
      const m = new THREE.Mesh(new THREE.BoxGeometry(spec.size?.[0] ?? 0.7, 0.012, spec.size?.[2] ?? 1.9), toon('#2a2a33'));
      m.position.set(px, 0.006, pz);
      m.rotation.y = d2r(spec.ry ?? 0);
      m.receiveShadow = true;
      scene.add(m);
      return { spec, obj: m };
    }
    case 'barbell': {
      const g = makeBarbell();
      scene.add(g);
      return {
        spec,
        obj: g,
        update: (r) => {
          worldPos(r.hands.l, v1);
          worldPos(r.hands.r, v2);
          g.position.copy(v1).add(v2).multiplyScalar(0.5);
          const dir = v1.clone().sub(v2).normalize();
          g.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
        },
      };
    }
    case 'dumbbells':
    case 'dumbbellR': {
      const sides = spec.type === 'dumbbells' ? (['l', 'r'] as const) : (['r'] as const);
      const g = new THREE.Group();
      for (const s of sides) {
        const db = makeDumbbell();
        r(s).add(db);
      }
      return { spec, obj: g };
      function r(s: 'l' | 'r') {
        return rig.hands[s];
      }
    }
    case 'dumbbellHands': {
      const db = makeDumbbell(0.26);
      scene.add(db);
      return {
        spec,
        obj: db,
        update: (r) => {
          worldPos(r.hands.l, v1);
          worldPos(r.hands.r, v2);
          db.position.copy(v1).add(v2).multiplyScalar(0.5);
          db.rotation.set(0, 0, Math.PI / 2);
        },
      };
    }
    case 'kettlebell': {
      const k = makeKettlebell();
      scene.add(k);
      return {
        spec,
        obj: k,
        update: (r) => {
          worldPos(r.hands.l, v1);
          worldPos(r.hands.r, v2);
          k.position.copy(v1).add(v2).multiplyScalar(0.5);
          // l'anse suit les mains, la cloche pend dans l'axe des avant-bras
          const q = new THREE.Quaternion();
          r.hands.l.getWorldQuaternion(q);
          k.quaternion.copy(q);
        },
      };
    }
    case 'pullBar': {
      const g = new THREE.Group();
      const h = py || 2.3;
      const b = bar(1.4, 'x', 0.02);
      b.position.y = h;
      g.add(b);
      for (const s of [-1, 1]) {
        const p = post(h + 0.05);
        p.position.x = s * 0.7;
        g.add(p);
      }
      g.position.set(px, 0, pz);
      scene.add(g);
      return { spec, obj: g };
    }
    case 'dipBars': {
      const g = new THREE.Group();
      const h = py || 1.1;
      for (const s of [-1, 1]) {
        const b = bar(0.9, 'z', 0.022);
        b.position.set(s * 0.29, h, 0.05);
        g.add(b);
        for (const z of [-0.35, 0.45]) {
          const p = post(h);
          p.position.set(s * 0.29, 0, z);
          g.add(p);
        }
      }
      g.position.set(px, 0, pz);
      scene.add(g);
      return { spec, obj: g };
    }
    case 'bench': {
      const g = new THREE.Group();
      const top = box(sw, 0.08, sl, '#2e2e36');
      top.position.y = sh - 0.04;
      g.add(top);
      for (const z of [-sl / 2 + 0.12, sl / 2 - 0.12]) {
        const leg = box(sw * 0.8, sh - 0.08, 0.06, DARK);
        leg.position.set(0, (sh - 0.08) / 2, z);
        g.add(leg);
      }
      g.position.set(px, 0, pz);
      g.rotation.y = d2r(spec.ry ?? 0);
      scene.add(g);
      return { spec, obj: g };
    }
    case 'step':
    case 'wall':
    case 'table': {
      const g = new THREE.Group();
      if (spec.type === 'wall') {
        const w = box(spec.size?.[0] ?? 2, spec.size?.[1] ?? 2.4, 0.08, '#1f1f25');
        w.position.y = (spec.size?.[1] ?? 2.4) / 2;
        g.add(w);
      } else if (spec.type === 'table') {
        const h = py || 0.75;
        const top = box(1.0, 0.05, 0.7, '#2e2e36');
        top.position.y = h;
        g.add(top);
        for (const sx of [-0.45, 0.45])
          for (const sz of [-0.3, 0.3]) {
            const leg = box(0.05, h, 0.05, DARK);
            leg.position.set(sx, h / 2, sz);
            g.add(leg);
          }
      } else {
        const st = box(sw, sh, sl, '#2e2e36');
        st.position.y = sh / 2;
        g.add(st);
      }
      g.position.set(px, 0, pz);
      g.rotation.y = d2r(spec.ry ?? 0);
      scene.add(g);
      if (spec.type === 'table')
        return {
          spec,
          obj: g,
          update: (r) => {
            // les mains agrippent le bord du plateau, la table s'étend au-dessus du buste
            worldPos(r.hands.l, v1);
            worldPos(r.hands.r, v2);
            const hx = (v1.x + v2.x) / 2;
            const hz = (v1.z + v2.z) / 2;
            worldPos(r.markers.lHeel, v1);
            const dx = hx - v1.x;
            const dz = hz - v1.z;
            const len = Math.hypot(dx, dz) || 1;
            g.position.set(hx + (dx / len) * 0.33, 0, hz + (dz / len) * 0.33);
          },
        };
      return { spec, obj: g };
    }
    case 'blockHands':
    case 'blockFeet':
    case 'blockRFoot':
    case 'blockLHand': {
      const b = box(spec.size?.[0] ?? 0.55, 1, spec.size?.[2] ?? 0.4, '#2e2e36');
      scene.add(b);
      return {
        spec,
        obj: b,
        update: (r) => {
          // dessus du bloc = peau la plus basse de l'appui (repli sur le repère pour un modèle externe)
          const skinY = (o: THREE.Object3D, pad: number) => (o.userData.contact ? contactY(o) : worldPos(o, v2).y - pad);
          let y: number;
          if (spec.type === 'blockHands') {
            worldPos(r.hands.l, v1);
            worldPos(r.hands.r, v2);
            v1.add(v2).multiplyScalar(0.5);
            y = Math.min(skinY(r.hands.l, 0.05), skinY(r.hands.r, 0.05));
          } else if (spec.type === 'blockFeet') {
            worldPos(r.feet.l, v1);
            worldPos(r.feet.r, v2);
            v1.add(v2).multiplyScalar(0.5);
            y = Math.min(skinY(r.feet.l, 0), skinY(r.feet.r, 0));
          } else if (spec.type === 'blockLHand') {
            worldPos(r.hands.l, v1);
            y = skinY(r.hands.l, 0.05);
          } else {
            // pied arrière posé par le dessus : le bloc s'étend derrière le pied, le genou descend devant
            worldPos(r.feet.r, v1).add(worldPos(r.markers.rHeel, v2)).multiplyScalar(0.5);
            const away = v1.clone().sub(worldPos(r.pelvis, v2)).setY(0).normalize();
            v1.addScaledVector(away, (spec.size?.[2] ?? 0.4) / 2 - 0.07);
            let low = Math.min(skinY(r.feet.r, 0), skinY(r.markers.rHeel, 0));
            r.markers.rHeel.parent?.traverse((c) => {
              const mesh = c as THREE.Mesh;
              if (!mesh.isMesh || (mesh.material as THREE.Material).side === THREE.BackSide) return;
              const pos = mesh.geometry.attributes.position;
              for (let i = 0; i < pos.count; i += 3) low = Math.min(low, v2.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).y);
            });
            y = low;
          }
          y = Math.max(0.05, y);
          b.scale.y = y;
          b.position.set(v1.x, y / 2, v1.z);
        },
      };
    }
    case 'jumpRope': {
      const holder = new THREE.Group();
      scene.add(holder);
      let mesh: THREE.Mesh | null = null;
      return {
        spec,
        obj: holder,
        update: (r, phase) => {
          worldPos(r.hands.l, v1);
          worldPos(r.hands.r, v2);
          const a = phase * Math.PI * 2;
          const cx = (v1.x + v2.x) / 2;
          const mid = new THREE.Vector3(cx, 0.95 + Math.cos(a) * 1.0, Math.sin(a) * 0.45);
          const pts = [v1.clone(), new THREE.Vector3(v1.x * 1.1, (v1.y + mid.y) / 2, (v1.z + mid.z) / 2), mid, new THREE.Vector3(v2.x * 1.1, (v2.y + mid.y) / 2, (v2.z + mid.z) / 2), v2.clone()];
          mesh = tube(pts, 0.008, mesh, '#e6e1d6');
          if (!mesh.parent) holder.add(mesh);
        },
      };
    }
    case 'cable': {
      const holder = new THREE.Group();
      const anchor = new THREE.Vector3(px, py || 1.65, pz || 1.6);
      const p = post(2.1);
      p.position.set(anchor.x, 0, anchor.z + 0.05);
      holder.add(p);
      scene.add(holder);
      let mesh: THREE.Mesh | null = null;
      const strands: (THREE.Mesh | null)[] = [null, null];
      return {
        spec,
        obj: holder,
        update: (r) => {
          worldPos(r.hands.l, v1);
          worldPos(r.hands.r, v2);
          // câble jusqu'à la corde, puis un brin par main (ne traverse plus la tête)
          const split = anchor.clone().lerp(v1.clone().add(v2).multiplyScalar(0.5), 0.72);
          mesh = tube([anchor, anchor.clone().lerp(split, 0.5), split], 0.01, mesh, '#c9c9cf');
          if (!mesh.parent) holder.add(mesh);
          [v1, v2].forEach((v, i) => {
            strands[i] = tube([split, split.clone().lerp(v, 0.5), v.clone()], 0.014, strands[i], '#e6e1d6');
            if (!strands[i]!.parent) holder.add(strands[i]!);
          });
        },
      };
    }
    case 'plateBelt': {
      const pl = plate(0.16, 0.04);
      pl.rotation.set(0, Math.PI / 2, Math.PI / 2);
      pl.position.set(0, -0.32, 0.06);
      rig.pelvis.add(pl);
      return { spec, obj: pl };
    }
    case 'sled': {
      const g = new THREE.Group();
      const plateMesh = box(0.6, 0.6, 0.05, '#2e2e36');
      g.add(plateMesh);
      for (const sx of [-0.26, 0.26]) {
        const rail = bar(1.1, 'z', 0.016);
        rail.position.set(sx, 0, 0.58);
        g.add(rail);
      }
      scene.add(g);
      const z = new THREE.Vector3(0, 0, 1);
      return {
        spec,
        obj: g,
        update: (r) => {
          // plateau collé sous les semelles, perpendiculaire à l'axe hanches → pieds
          const sole = new THREE.Vector3();
          for (const n of ['lHeel', 'rHeel', 'lToe', 'rToe']) sole.add(worldPos(r.markers[n], v1));
          sole.multiplyScalar(0.25);
          const hips = worldPos(r.pelvis, v2);
          const n = sole.clone().sub(hips).normalize();
          g.quaternion.setFromUnitVectors(z, n);
          g.position.copy(sole).addScaledVector(n, 0.04);
        },
      };
    }
    case 'seatBack': {
      const b = box(0.44, 0.75, 0.08, '#2e2e36');
      scene.add(b);
      const up = new THREE.Vector3(0, 1, 0);
      return {
        spec,
        obj: b,
        update: (r) => {
          // dossier incliné qui épouse le dos
          const lo = worldPos(r.markers.butt, v1);
          const hi = worldPos(r.markers.upperBack, v2);
          const axis = hi.clone().sub(lo).normalize();
          b.quaternion.setFromUnitVectors(up, axis);
          const back = new THREE.Vector3(0, 0, -1).applyQuaternion(b.quaternion);
          b.position.copy(lo).addScaledVector(axis, 0.36).addScaledVector(back, 0.05);
        },
      };
    }
    case 'towelsBar':
    case 'towelHands':
    case 'towelFoot': {
      const holder = new THREE.Group();
      scene.add(holder);
      const meshes: (THREE.Mesh | null)[] = [null, null];
      return {
        spec,
        obj: holder,
        update: (r) => {
          worldPos(r.hands.l, v1);
          worldPos(r.hands.r, v2);
          if (spec.type === 'towelsBar') {
            const h = py || 2.3;
            [v1, v2].forEach((v, i) => {
              meshes[i] = tube([new THREE.Vector3(v.x, h, v.z), new THREE.Vector3(v.x, (h + v.y) / 2, v.z + 0.01), v.clone()], 0.025, meshes[i], '#e6e1d6');
              if (!meshes[i]!.parent) holder.add(meshes[i]!);
            });
          } else if (spec.type === 'towelHands') {
            meshes[0] = tube([v1.clone(), v1.clone().lerp(v2, 0.5).add(new THREE.Vector3(0, -0.04, 0)), v2.clone()], 0.03, meshes[0], '#e6e1d6');
            if (!meshes[0].parent) holder.add(meshes[0]);
          } else {
            // la serviette passe sous la semelle du pied droit levé
            const heel = worldPos(r.markers.rHeel, new THREE.Vector3());
            const toe = worldPos(r.markers.rToe, new THREE.Vector3());
            const sole = heel.clone().lerp(toe, 0.5);
            sole.y = Math.min(heel.y, toe.y) - 0.025;
            const a = sole.clone().add(new THREE.Vector3(Math.sign(v1.x - v2.x) * 0.05, 0, 0));
            const b = sole.clone().add(new THREE.Vector3(Math.sign(v2.x - v1.x) * 0.05, 0, 0));
            meshes[0] = tube([v1.clone(), v1.clone().lerp(a, 0.5), a, b, v2.clone().lerp(b, 0.5), v2.clone()], 0.025, meshes[0], '#e6e1d6');
            if (!meshes[0].parent) holder.add(meshes[0]);
          }
        },
      };
    }
  }
}

/* ───────── lecteur ───────── */

export interface PlayerOptions {
  palette?: Palette;
  style?: FighterStyle;
  /** couleur de fond (null = transparent) */
  background?: string | null;
  /** couleur d'accent (liseré du sol) */
  accent?: string;
  preserveDrawingBuffer?: boolean;
  pixelRatio?: number;
}

const VIEWS: Record<NonNullable<Motion['view']>, [number, number, number]> = {
  three4: [1, 0.32, 1.1],
  side: [1, 0.22, 0.12],
  sideL: [-1, 0.22, 0.12],
  front: [0.18, 0.2, 1],
};

export class ExercisePlayer {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
  rig: Rig;
  motion: Motion | null = null;
  motionId = '';
  props: LiveProp[] = [];
  /** personnage externe (FBX/GLB) affiché à la place du squelette procédural */
  external: ExternalFighter | null = null;
  private raf = 0;
  private t0 = 0;
  private frame = { target: new THREE.Vector3(0, 0.9, 0), dist: 4 };
  private anchorRef: { proc: THREE.Vector3 | null; ext: THREE.Vector3 | null } | null = null;
  private disc: THREE.Mesh;
  private shadowCatcher: THREE.Mesh;
  private ring: THREE.Mesh;

  constructor(public canvas: HTMLCanvasElement, opts: PlayerOptions = {}) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: opts.background == null, preserveDrawingBuffer: !!opts.preserveDrawingBuffer });
    this.renderer.setPixelRatio(opts.pixelRatio ?? Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio : 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (opts.background) this.scene.background = new THREE.Color(opts.background);

    this.scene.add(new THREE.HemisphereLight('#ffffff', '#3a3440', 1.6));
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(-2.5, 4, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -2.5;
    key.shadow.camera.right = 2.5;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -2;
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.03;
    this.scene.add(key);

    this.disc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.04 }));
    this.disc.rotation.x = -Math.PI / 2;
    this.scene.add(this.disc);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.58, 1.62, 64), new THREE.MeshBasicMaterial({ color: opts.accent ?? '#e5484d', transparent: true, opacity: 0.55 }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.002;
    this.scene.add(this.ring);
    // ombre portée en trame de points (screentone)
    const shadowCatcher = (this.shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), halftoneShadowMaterial(0.5)));
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = 0.004;
    shadowCatcher.receiveShadow = true;
    (shadowCatcher.material as THREE.ShadowMaterial).depthWrite = false;
    shadowCatcher.renderOrder = 2;
    this.scene.add(shadowCatcher);

    this.rig = buildFighter(opts.palette ?? DEFAULT_PALETTE, opts.style ?? { hair: 'band' });
    this.scene.add(this.rig.root);
  }

  /** Portrait (buste ou en pied) : fond transparent, sans sol décoratif */
  renderPortrait(pose: Pose, orbit = 28, framing: 'bust' | 'full' = 'bust') {
    this.disc.visible = false;
    this.ring.visible = false;
    this.shadowCatcher.visible = false;
    this.setMotion({ keys: [pose], dur: 1, flatFeet: true });
    this.pose(0);
    const chest = worldPos(this.rig.markers.chestFront, new THREE.Vector3());
    const head = worldPos(this.rig.markers.head, new THREE.Vector3());
    const target = framing === 'full' ? new THREE.Vector3(chest.x, (head.y + 0.08) / 2, chest.z) : chest.clone().lerp(head, 0.6);
    const dir = new THREE.Vector3(0.2, 0.12, 1).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), d2r(orbit));
    this.camera.position.copy(target).addScaledVector(dir, framing === 'full' ? 4.3 : 2.05);
    this.camera.lookAt(target);
    setMangaViewport(this.renderer);
    this.renderer.render(this.scene, this.camera);
  }

  setAccent(color: string) {
    (this.ring.material as THREE.MeshBasicMaterial).color.set(color);
  }

  /** Remplace le combattant procédural par un modèle riggé */
  attachModel(f: ExternalFighter) {
    if (this.external) this.scene.remove(this.external.wrapper);
    this.external = f;
    this.scene.add(f.wrapper);
    this.rig.root.visible = false;
    if (this.motion) this.setMotion(this.motion, this.motionId);
  }

  /** Repères utilisés par les accessoires (mains/pieds du modèle affiché) */
  private propRig(): Rig {
    const e = this.external;
    if (!e) return this.rig;
    return {
      ...this.rig,
      hands: { l: e.marker('lHand')!, r: e.marker('rHand')! },
      feet: { l: e.markers.lToe, r: e.markers.rToe },
      markers: { ...this.rig.markers, lHeel: e.markers.lHeel, rHeel: e.markers.rHeel, lToe: e.markers.lToe, rToe: e.markers.rToe },
      pelvis: e.bones.pelvis!,
    };
  }

  setMotion(m: Motion, id = '') {
    this.motionId = id;
    for (const p of this.props) {
      p.obj.parent?.remove(p.obj);
    }
    // retire les haltères éventuellement accrochés aux mains
    const pr = this.propRig();
    for (const h of [pr.hands.l, pr.hands.r]) [...h.children].forEach((c) => h.remove(c));
    pr.pelvis.children.filter((c) => c.userData.prop).forEach((c) => pr.pelvis.remove(c));
    this.motion = m;
    if (this.external) {
      const h = handsFor(m);
      this.external.setHands(h.l, h.r);
    }
    const rig = this.propRig();
    this.props = (m.props ?? []).map((s) => {
      const lp = createProp(s, rig, this.scene);
      if (s.type === 'plateBelt') lp.obj.userData.prop = true;
      return lp;
    });
    // position de référence des appuis (début du cycle), puis cadrage
    this.anchorRef = null;
    this.pose(0);
    const names = anchorNames(m);
    if (names) {
      const ext = this.external;
      const proc = names.map((n) => this.rig.markers[n]).filter(Boolean);
      const extObjs = ext ? names.map((n) => ext.marker(n)).filter((o): o is THREE.Object3D => !!o) : [];
      this.anchorRef = {
        proc: proc.length ? centroid(proc, new THREE.Vector3()) : null,
        ext: extObjs.length ? centroid(extObjs, new THREE.Vector3()) : null,
      };
    }
    this.computeFraming();
  }

  /** Pose + calage au sol pour l'instant t (s) */
  pose(t: number) {
    const m = this.motion;
    if (!m) return;
    let p = poseAt(m, t);
    if (m.keys.length > 1) {
      // la tête suit le mouvement avec un léger retard (mouvement secondaire)
      p = { ...p, neck: poseAt(m, t - Math.min(0.12, m.dur * 0.06)).neck };
    }
    // respiration : marquée sur les exercices statiques, discrète sinon
    const b = Math.sin((t / 3.2) * Math.PI * 2) * (m.breathe ? 1 : 0.4);
    p = { ...p, chest: [(p.chest?.[0] ?? 0) - b * 1.5, p.chest?.[1] ?? 0, p.chest?.[2] ?? 0], shrug: (p.shrug ?? 0) + b * 0.006 };
    applyPose(this.rig, p);
    const root = this.rig.root;

    if (m.two) {
      const tw = m.two;
      const axis = tw.axis ?? 'rx';
      const f = (deg: number) => {
        if (axis === 'rx') root.rotation.x = d2r(deg);
        else root.rotation.z = d2r(deg);
        this.flatten(m);
        return minY(this.rig, tw.b) - minY(this.rig, tw.a) - (tw.dy ?? 0);
      };
      let [lo, hi] = tw.range;
      // échantillonnage puis dichotomie
      let best = lo;
      let bestV = Infinity;
      let prevX = lo;
      let prevV = f(lo);
      let bracket: [number, number] | null = null;
      for (let i = 1; i <= 24; i++) {
        const x = lo + ((hi - lo) * i) / 24;
        const v = f(x);
        if (Math.abs(v) < bestV) {
          bestV = Math.abs(v);
          best = x;
        }
        if (!bracket && Math.sign(v) !== Math.sign(prevV)) bracket = [prevX, x];
        prevX = x;
        prevV = v;
      }
      if (bracket) {
        [lo, hi] = bracket;
        let vlo = f(lo);
        for (let i = 0; i < 18; i++) {
          const mid = (lo + hi) / 2;
          const vm = f(mid);
          if (Math.sign(vm) === Math.sign(vlo)) {
            lo = mid;
            vlo = vm;
          } else hi = mid;
        }
        best = (lo + hi) / 2;
      }
      f(best);
      const lower = (tw.dy ?? 0) >= 0 ? tw.a : tw.b;
      root.position.y -= minY(this.rig, lower);
    } else if (m.hang) {
      this.flatten(m);
      root.updateMatrixWorld(true);
      const yl = worldPos(this.rig.hands.l, v1).y;
      const yr = worldPos(this.rig.hands.r, v2).y;
      root.position.y += m.hang - (yl + yr) / 2;
    } else if (m.ground !== false) {
      this.flatten(m);
      const g = m.ground ?? {};
      root.position.y -= minY(this.rig, g.contacts) - (g.y ?? 0);
    } else {
      this.flatten(m);
    }
    // aucune partie du corps sous le sol (sauf suspendu à une barre : les mains restent accrochées)
    if (!m.hang) {
      const low = minY(this.rig);
      if (low < 0) root.position.y -= low;
    }
    root.position.y += p.air ?? 0;
    root.updateMatrixWorld(true);
    // appuis fixes : on annule le glissement horizontal des mains / pieds au sol
    const names = anchorNames(m);
    if (names && this.anchorRef?.proc) {
      const c = centroid(names.map((n) => this.rig.markers[n]).filter(Boolean), v1);
      root.position.x += this.anchorRef.proc.x - c.x;
      root.position.z += this.anchorRef.proc.z - c.z;
      root.updateMatrixWorld(true);
    }
    if (this.external) this.driveExternal(m, t);
    const phase = (((t / m.dur) % 1) + 1) % 1;
    const prig = this.propRig();
    for (const pr of this.props) pr.update?.(prig, phase);
  }

  /** Anime le modèle externe : clip dédié si fourni, sinon retarget du squelette procédural */
  private driveExternal(m: Motion, t: number) {
    const e = this.external!;
    if (this.motionId && e.hasClip(this.motionId)) {
      // capture de mouvement : déjà posée au sol sur l'ensemble du cycle
      e.playClip(this.motionId, t);
      return;
    }
    e.retarget(this.rig);
    // suspendu : la barre dans les poings ; sinon la peau la plus basse à la hauteur de celle du squelette procédural
    if (m.hang) e.hangFrom(m.hang);
    else e.groundTo(minY(this.rig));
    const names = anchorNames(m);
    if (names && this.anchorRef?.ext) {
      const objs = names.map((n) => e.marker(n)).filter((o): o is THREE.Object3D => !!o);
      const c = centroid(objs, v1);
      e.wrapper.position.x += this.anchorRef.ext.x - c.x;
      e.wrapper.position.z += this.anchorRef.ext.z - c.z;
      e.wrapper.updateMatrixWorld(true);
    }
  }

  /** Pieds à plat : la cheville compense l'orientation de la jambe */
  private flatten(m: Motion) {
    if (!m.flatFeet) return;
    const root = this.rig.root;
    root.updateMatrixWorld(true);
    const yaw = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, root.rotation.y, 0));
    const sides = m.flatFeet === true ? (['l', 'r'] as const) : ([m.flatFeet] as const);
    for (const s of sides) {
      const ank = this.rig.joints[`${s}Ank`];
      const parentQ = new THREE.Quaternion();
      ank.parent!.getWorldQuaternion(parentQ);
      ank.quaternion.copy(parentQ.invert().multiply(yaw));
    }
    root.updateMatrixWorld(true);
  }

  private computeFraming() {
    const m = this.motion;
    if (!m) return;
    const box3 = new THREE.Box3();
    const p = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      this.pose((m.dur * i) / 8);
      for (const k of ['head', 'lHand', 'rHand', 'lToe', 'rToe', 'lHeel', 'rHeel', 'pelvisLow', 'back', 'chestFront', 'lKnee', 'rKnee']) {
        box3.expandByPoint(worldPos(this.rig.markers[k], p));
      }
    }
    box3.expandByPoint(new THREE.Vector3(0, 0, 0));
    if (m.hang) box3.expandByPoint(new THREE.Vector3(0, m.hang + 0.1, 0));
    const center = box3.getCenter(new THREE.Vector3());
    const size = box3.getSize(new THREE.Vector3());
    const radius = Math.max(0.75, size.length() / 2);
    this.frame.target.copy(center);
    this.frame.dist = (radius / Math.sin(d2r(this.camera.fov / 2))) * 1.2 * (m.zoom ?? 1);
    this.disc.position.set(center.x, 0.0005, center.z);
    this.ring.position.set(center.x, 0.002, center.z);
  }

  /** Rendu déterministe à l'instant t (s) ; orbit = rotation caméra en degrés */
  renderAt(t: number, orbit = 0) {
    if (!this.motion) return;
    this.pose(t);
    const dir = new THREE.Vector3(...VIEWS[this.motion.view ?? 'three4']).normalize();
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), d2r(orbit));
    this.camera.position.copy(this.frame.target).addScaledVector(dir, this.frame.dist);
    this.camera.lookAt(this.frame.target);
    setMangaViewport(this.renderer);
    this.renderer.render(this.scene, this.camera);
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start(orbitSpeed = 6) {
    this.stop();
    this.t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - this.t0) / 1000;
      this.renderAt(t, Math.sin(t * 0.25) * orbitSpeed);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.stop();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
    this.renderer.dispose();
  }
}
