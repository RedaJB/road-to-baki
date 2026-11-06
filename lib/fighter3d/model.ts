/**
 * Personnage 3D externe (FBX / GLB riggé : Mixamo, Unreal, VRM, Blender…).
 * - Normalise la taille, reconnaît les os par leur nom.
 * - Retarget : reproduit les poses du squelette procédural sur les os du modèle.
 * - Clips : joue une animation fournie (ex. Mixamo « Push Up ») si elle existe pour l'exercice.
 *
 * Fichier attendu : public/fighter/manifest.json (le combattant de l'appli)
 *   { "model": "perso.glb", "anims": { "pompe": "anims/push-up.glb" }, "manga": { "ink": "encre.png" } }
 * public/models/ (essais en local, non publié) ne sert que si public/fighter/ est absent.
 */
import * as THREE from 'three';
import { applyPose, spikyHair, worldPos, type Rig } from './rig';
import { addSkinnedOutlines, mangaMaterial } from './manga';

export interface ModelManifest {
  model: string;
  anims?: Record<string, string>;
  /** convertit les matériaux en rendu manga (aplats, hachures, contours) */
  toon?: boolean;
  /** rendu manga avec traits des muscles (carte d'encrage, même dépliage UV que la carte de normales) */
  manga?: { ink?: string };
  /** rotation Y supplémentaire (degrés) si le modèle ne regarde pas vers +Z */
  yaw?: number;
  /** couleur appliquée par nom de matériau (ex. { "MI_Hair_1": "#b8321a" }) */
  tint?: Record<string, string>;
  /** couleur d'une crinière en pointes posée sur l'os de la tête */
  hair?: string;
  /** poings fermés par défaut (false = mains ouvertes) */
  fists?: boolean;
  /** dossier du manifeste (renseigné au chargement) */
  base?: string;
}

export type JointKey = 'pelvis' | 'spine' | 'chest' | 'neck' | 'lSh' | 'lEl' | 'rSh' | 'rEl' | 'lHip' | 'lKnee' | 'lAnk' | 'rHip' | 'rKnee' | 'rAnk';
type ExtraKey = 'head' | 'lHand' | 'rHand' | 'lToe' | 'rToe';

const norm = (n: string) =>
  n
    .toLowerCase()
    .replace(/^.*[:|]/, '')
    .replace(/^(mixamorig|bip0?0?1|j_bip_[clr]_|def_|cc_base_)/, '')
    .replace(/[^a-z0-9]/g, '');

const CANDIDATES: Record<JointKey | ExtraKey, string[]> = {
  pelvis: ['hips', 'pelvis', 'hip'],
  spine: ['spine', 'spine01', 'abdomen', 'spinelower'],
  chest: ['spine2', 'spine02', 'upperchest', 'chest', 'spine1', 'spine03'],
  neck: ['neck', 'neck01'],
  head: ['head'],
  lSh: ['leftarm', 'upperarml', 'leftupperarm', 'larm', 'lupperarm', 'armleft', 'upperarmleft'],
  lEl: ['leftforearm', 'lowerarml', 'leftlowerarm', 'forearml', 'lforearm', 'forearmleft'],
  lHand: ['lefthand', 'handl', 'lhand', 'handleft'],
  rSh: ['rightarm', 'upperarmr', 'rightupperarm', 'rarm', 'rupperarm', 'armright', 'upperarmright'],
  rEl: ['rightforearm', 'lowerarmr', 'rightlowerarm', 'forearmr', 'rforearm', 'forearmright'],
  rHand: ['righthand', 'handr', 'rhand', 'handright'],
  lHip: ['leftupleg', 'thighl', 'leftupperleg', 'lthigh', 'thighleft', 'upperlegl'],
  lKnee: ['leftleg', 'calfl', 'leftlowerleg', 'lcalf', 'shinl', 'calfleft', 'lowerlegl'],
  lAnk: ['leftfoot', 'footl', 'lfoot', 'footleft'],
  lToe: ['lefttoebase', 'balll', 'lefttoes', 'toel', 'ltoe0'],
  rHip: ['rightupleg', 'thighr', 'rightupperleg', 'rthigh', 'thighright', 'upperlegr'],
  rKnee: ['rightleg', 'calfr', 'rightlowerleg', 'rcalf', 'shinr', 'calfright', 'lowerlegr'],
  rAnk: ['rightfoot', 'footr', 'rfoot', 'footright'],
  rToe: ['righttoebase', 'ballr', 'righttoes', 'toer', 'rtoe0'],
};

/** Ordre parent → enfant (indispensable pour le calcul des rotations locales) */
const ORDER: JointKey[] = ['pelvis', 'spine', 'chest', 'neck', 'lSh', 'lEl', 'rSh', 'rEl', 'lHip', 'lKnee', 'lAnk', 'rHip', 'rKnee', 'rAnk'];

export function findBones(root: THREE.Object3D) {
  const byName = new Map<string, THREE.Object3D>();
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone || o.type === 'Bone' || o.type === 'Object3D' || o.type === 'Group') {
      const k = norm(o.name);
      if (k && !byName.has(k)) byName.set(k, o);
    }
  });
  const out: Partial<Record<JointKey | ExtraKey, THREE.Object3D>> = {};
  for (const [key, names] of Object.entries(CANDIDATES) as [JointKey | ExtraKey, string[]][]) {
    for (const n of names) {
      const b = byName.get(n);
      if (b) {
        out[key] = b;
        break;
      }
    }
  }
  const missing = ORDER.filter((k) => !out[k]);
  return { bones: out, missing };
}

const q1 = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const v = new THREE.Vector3();

/** Correspondance entre les articulations du squelette procédural et ses objets */
function srcJoint(rig: Rig, k: JointKey): THREE.Object3D {
  return k === 'pelvis' ? rig.pelvis : rig.joints[k];
}

export type HandPose = 'fist' | 'flat';
type Side = 'l' | 'r';
type MarkerKey = 'lHand' | 'rHand' | 'lPalm' | 'rPalm' | 'lGrip' | 'rGrip' | 'lToe' | 'rToe' | 'lHeel' | 'rHeel' | 'head';
const SIDES: Side[] = ['l', 'r'];

export class ExternalFighter {
  /** conteneur mis à l'échelle (taille normalisée) */
  wrapper = new THREE.Group();
  bones: Partial<Record<JointKey | ExtraKey, THREE.Object3D>>;
  private restWorld: Partial<Record<JointKey, THREE.Quaternion>> = {};
  private srcRef: Partial<Record<JointKey, THREE.Quaternion>> = {};
  mixer: THREE.AnimationMixer;
  clips: Record<string, THREE.AnimationAction> = {};
  /** repères : poignets, paumes, poings, plantes des pieds, tête (accessoires, appuis) */
  markers: Record<MarkerKey, THREE.Object3D>;
  /** position des mains : poing fermé ou paume à plat au sol */
  hands: Record<Side, HandPose> = { l: 'fist', r: 'fist' };
  private fingers: { bone: THREE.Object3D; side: Side; rest: THREE.Quaternion; fist: THREE.Quaternion }[] = [];
  private handFrame: Partial<Record<Side, { finger: THREE.Vector3; palm: THREE.Vector3 }>> = {};
  private clavicles: Partial<Record<Side, { bone: THREE.Object3D; rest: THREE.Quaternion }>> = {};
  /** sommets échantillonnés de la peau (calage au sol exact) */
  private samples: { mesh: THREE.SkinnedMesh; idx: number[] }[] = [];
  /** pose de repos de chaque os (rotation, position) */
  private restPose = new Map<THREE.Object3D, [THREE.Quaternion, THREE.Vector3]>();
  /** hauteur du point de peau le plus bas de chaque clip */
  private clipFloor: Record<string, number> = {};
  private clipPlayed = false;

  constructor(public model: THREE.Object3D, rig: Rig, opts: { yaw?: number; toon?: boolean; manga?: { ink?: THREE.Texture | null }; tint?: Record<string, string>; hair?: string; fists?: boolean } = {}) {
    this.wrapper.add(model);
    model.rotation.y = THREE.MathUtils.degToRad(opts.yaw ?? 0);
    const stylize = !!(opts.toon || opts.manga);
    const skinned: THREE.SkinnedMesh[] = [];
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.frustumCulled = false;
      if ((m as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(m as THREE.SkinnedMesh);
      if (!stylize) return;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[];
      const conv = mats.map((src) => {
        const tint = opts.tint?.[src.name];
        return mangaMaterial({
          color: tint ?? (src.map ? '#ffffff' : (src.color ?? '#ffffff')),
          albedo: src.map ?? null,
          normalMap: src.normalMap ?? null,
          normalScale: src.normalScale,
          ink: src.normalMap ? (opts.manga?.ink ?? null) : null,
        });
      });
      m.material = Array.isArray(m.material) ? conv : conv[0];
    });
    const { bones, missing } = findBones(model);
    if (missing.length) throw new Error(`Os introuvables : ${missing.join(', ')}`);
    this.bones = bones;
    this.mixer = new THREE.AnimationMixer(model);
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) this.restPose.set(o, [o.quaternion.clone(), o.position.clone()]);
    });

    // Taille normalisée : hanches à 0,95 m du sol (comme le squelette procédural)
    this.wrapper.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const hipsY = worldPos(bones.pelvis!, v).y - box.min.y;
    const s = 0.95 / Math.max(0.01, hipsY);
    this.wrapper.scale.setScalar(s);
    this.wrapper.updateMatrixWorld(true);

    // Pose de repos du modèle (T-pose, A-pose…) → pose de référence équivalente du squelette procédural
    for (const k of ORDER) this.restWorld[k] = bones[k]!.getWorldQuaternion(new THREE.Quaternion());
    const armAbd = (sh: THREE.Object3D, el: THREE.Object3D) => {
      const a = worldPos(sh, new THREE.Vector3());
      const b = worldPos(el, new THREE.Vector3());
      const d = b.sub(a).normalize();
      return 90 - THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(-d.y, -1, 1)));
    };
    const legAbd = (hip: THREE.Object3D, knee: THREE.Object3D) => {
      const a = worldPos(hip, new THREE.Vector3());
      const b = worldPos(knee, new THREE.Vector3());
      const d = b.sub(a).normalize();
      return THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(Math.abs(d.x), 0, 1)));
    };
    applyPose(rig, {
      root: { y: 0.95 },
      lSh: [0, armAbd(bones.lSh!, bones.lEl!), 0],
      rSh: [0, armAbd(bones.rSh!, bones.rEl!), 0],
      lEl: 0,
      rEl: 0,
      lHip: [0, legAbd(bones.lHip!, bones.lKnee!), 0],
      rHip: [0, legAbd(bones.rHip!, bones.rKnee!), 0],
    });
    rig.root.updateMatrixWorld(true);
    for (const k of ORDER) this.srcRef[k] = srcJoint(rig, k).getWorldQuaternion(new THREE.Quaternion());

    // Repères posés au repos : plantes des pieds au niveau du sol, paumes et poings d'après la main
    const sole = box.min.y * s;
    const at = (bone: THREE.Object3D | undefined, world: THREE.Vector3, contact = false) => {
      const parent = bone ?? bones.pelvis!;
      const o = new THREE.Object3D();
      parent.add(o);
      o.position.copy(parent.worldToLocal(world.clone()));
      if (contact) o.userData.contact = [new THREE.Vector3()];
      return o;
    };
    const foot = (ank: THREE.Object3D, toe: THREE.Object3D | undefined, heel: boolean) => {
      const bone = heel || !toe ? ank : toe;
      const p = worldPos(bone, new THREE.Vector3());
      if (heel) p.z -= 0.03 * s;
      p.y = sole;
      return at(bone, p, true);
    };
    this.initHands();
    const palm = (side: Side, grip: boolean) => {
      const hand = bones[`${side}Hand`] ?? bones[`${side}El`]!;
      const fr = this.handFrame[side];
      const p = worldPos(hand, new THREE.Vector3());
      if (fr) {
        const q = hand.getWorldQuaternion(new THREE.Quaternion());
        p.addScaledVector(fr.finger.clone().applyQuaternion(q), (grip ? 0.065 : 0.05) * s);
        p.addScaledVector(fr.palm.clone().applyQuaternion(q), (grip ? 0.03 : 0.018) * s);
      }
      return at(hand, p, !grip);
    };
    this.markers = {
      lHand: at(bones.lHand ?? bones.lEl, worldPos(bones.lHand ?? bones.lEl!, new THREE.Vector3())),
      rHand: at(bones.rHand ?? bones.rEl, worldPos(bones.rHand ?? bones.rEl!, new THREE.Vector3())),
      lPalm: palm('l', false),
      rPalm: palm('r', false),
      lGrip: palm('l', true),
      rGrip: palm('r', true),
      lToe: foot(bones.lAnk!, bones.lToe, false),
      rToe: foot(bones.rAnk!, bones.rToe, false),
      lHeel: foot(bones.lAnk!, bones.lToe, true),
      rHeel: foot(bones.rAnk!, bones.rToe, true),
      head: at(bones.head ?? bones.neck, worldPos(bones.head ?? bones.neck!, new THREE.Vector3())),
    };
    for (const side of SIDES) {
      const up = bones[`${side}Sh`]!;
      const c = up.parent;
      if (c && c !== bones.chest && /clav|shoulder/.test(norm(c.name))) this.clavicles[side] = { bone: c, rest: c.quaternion.clone() };
    }
    if (opts.hair && bones.head) this.addHair(bones.head, box, opts.hair);
    const def: HandPose = opts.fists === false ? 'flat' : 'fist';
    this.setHands(def, def);
    // échantillon de la peau (~1 400 sommets par maillage)
    for (const m of skinned) {
      const count = m.geometry.attributes.position.count;
      const step = Math.max(1, Math.round(count / 1400));
      const idx: number[] = [];
      for (let i = 0; i < count; i += step) idx.push(i);
      this.samples.push({ mesh: m, idx });
    }
    if (stylize) addSkinnedOutlines(model);
  }

  /** Doigts : pose de repos (main ouverte) et poing fermé ; repère de la paume */
  private initHands() {
    this.wrapper.updateMatrixWorld(true);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const handOf = (o: THREE.Object3D): Side | null => {
      for (let p: THREE.Object3D | null = o; p; p = p.parent) {
        if (p === this.bones.lHand) return 'l';
        if (p === this.bones.rHand) return 'r';
      }
      return null;
    };
    for (const side of SIDES) {
      const hand = this.bones[`${side}Hand`];
      const find = (k: string) => hand?.children.find((c) => norm(c.name).includes(k));
      const mid = find('middle');
      const idx = find('index');
      const pin = find('pinky');
      if (!hand || !mid || !idx || !pin) continue;
      const hp = worldPos(hand, new THREE.Vector3());
      const F = worldPos(mid, new THREE.Vector3()).sub(hp).normalize();
      const across = worldPos(idx, new THREE.Vector3()).sub(worldPos(pin, new THREE.Vector3()));
      const P = new THREE.Vector3().crossVectors(F, across).multiplyScalar(side === 'l' ? 1 : -1).normalize();
      const inv = hand.getWorldQuaternion(new THREE.Quaternion()).invert();
      this.handFrame[side] = { finger: F.applyQuaternion(inv), palm: P.applyQuaternion(inv) };
    }
    const list: { bone: THREE.Object3D; side: Side }[] = [];
    this.model.traverse((o) => {
      const n = norm(o.name);
      const side = handOf(o);
      if (side && /index|middle|ring|pinky|thumb/.test(n) && !/leaf|end|4$/.test(n) && o.children.length) list.push({ bone: o, side });
    });
    const rest = list.map((f) => f.bone.quaternion.clone());
    for (const f of list) {
      const thumb = norm(f.bone.name).includes('thumb');
      const dir = worldPos(f.bone.children[0], b).sub(worldPos(f.bone, a)).normalize();
      // le pouce se rabat sur les doigts repliés, les autres phalanges vers la paume
      const hand = this.bones[`${f.side}Hand`];
      const fr = this.handFrame[f.side];
      let toward = new THREE.Vector3(0, -1, 0);
      if (fr && hand) toward = fr.palm.clone().applyQuaternion(hand.getWorldQuaternion(q1));
      if (thumb) {
        const mid = hand?.children.find((c) => norm(c.name).includes('middle'));
        if (mid?.children[0]) toward = worldPos(mid.children[0], new THREE.Vector3()).sub(a).normalize();
      }
      const axis = new THREE.Vector3().crossVectors(dir, toward);
      if (axis.lengthSq() < 1e-6) continue;
      axis.normalize().applyQuaternion(f.bone.getWorldQuaternion(q1).invert());
      f.bone.quaternion.multiply(q2.setFromAxisAngle(axis, THREE.MathUtils.degToRad(thumb ? 40 : 88)));
      f.bone.updateMatrixWorld(true);
    }
    this.fingers = list.map((f, i) => ({ ...f, rest: rest[i], fist: f.bone.quaternion.clone() }));
    for (const f of this.fingers) f.bone.quaternion.copy(f.rest);
    this.wrapper.updateMatrixWorld(true);
  }

  /** Poing fermé ou main ouverte, par côté */
  setHands(l: HandPose, r: HandPose) {
    this.hands = { l, r };
    for (const f of this.fingers) f.bone.quaternion.copy((f.side === 'l' ? l : r) === 'fist' ? f.fist : f.rest);
  }

  /** Crinière posée sur le crâne : centrée et mise à l'échelle d'après les sommets de la tête (pose de repos) */
  private addHair(head: THREE.Object3D, box: THREE.Box3, color: string) {
    this.wrapper.updateMatrixWorld(true);
    const top = box.max.y * this.wrapper.scale.x;
    const neckY = worldPos(head, new THREE.Vector3()).y;
    const skullY = neckY + (top - neckY) * 0.45;
    const skull = new THREE.Box3();
    const p = new THREE.Vector3();
    this.model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        if (p.y > skullY) skull.expandByPoint(p);
      }
    });
    if (skull.isEmpty()) return;
    const c = skull.getCenter(new THREE.Vector3());
    const k = (skull.max.x - skull.min.x) / 2 / 0.094; // demi-largeur du crâne procédural
    const hair = spikyHair(mangaMaterial({ color }));
    hair.traverse((o) => (o.userData.noContact = true));
    hair.scale.setScalar(k * 1.02);
    hair.position.set(c.x, skull.max.y - 0.112 * k, c.z + 0.004 * k);
    this.wrapper.add(hair);
    head.attach(hair);
  }

  addClip(id: string, clip: THREE.AnimationClip) {
    // « sur place » : on retire le déplacement net des hanches sur le cycle (à l'horizontale), les balancements restent
    const hips = this.bones.pelvis!;
    this.wrapper.updateMatrixWorld(true);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(hips.parent!.getWorldQuaternion(q1).invert()).normalize();
    for (const t of clip.tracks) {
      if (t.name !== `${hips.name}.position` || t.times.length < 2) continue;
      const vals = t.values;
      const n = t.times.length;
      const drift = new THREE.Vector3().fromArray(vals, (n - 1) * 3).sub(new THREE.Vector3().fromArray(vals, 0));
      drift.addScaledVector(up, -drift.dot(up));
      const t0 = t.times[0];
      const span = t.times[n - 1] - t0 || 1;
      for (let i = 0; i < n; i++) {
        const k = (t.times[i] - t0) / span;
        vals[i * 3] -= drift.x * k;
        vals[i * 3 + 1] -= drift.y * k;
        vals[i * 3 + 2] -= drift.z * k;
      }
    }
    const action = this.mixer.clipAction(clip);
    action.play();
    action.enabled = false;
    this.clips[id] = action;
  }

  hasClip(id: string) {
    return !!this.clips[id];
  }

  /** Joue le clip de l'exercice à l'instant t, posé au sol (point le plus bas du cycle) */
  playClip(id: string, t: number) {
    for (const [k, a] of Object.entries(this.clips)) a.enabled = k === id;
    const a = this.clips[id];
    const dur = a.getClip().duration;
    this.clipPlayed = true;
    this.wrapper.position.set(0, 0, 0);
    if (this.clipFloor[id] === undefined) {
      // calage constant sur tout le cycle : les sauts et phases aériennes restent visibles
      let low = Infinity;
      for (let i = 0; i < 24; i++) {
        a.time = (dur * i) / 24;
        this.mixer.update(0);
        this.wrapper.updateMatrixWorld(true);
        low = Math.min(low, this.lowestSkin());
      }
      this.clipFloor[id] = low;
    }
    a.time = ((t % dur) + dur) % dur;
    this.mixer.update(0);
    this.wrapper.position.y = -this.clipFloor[id];
    this.wrapper.updateMatrixWorld(true);
  }

  /** Pose de repos de tous les os (après un clip, avant de reprendre les poses clés) */
  private restoreRest() {
    for (const [bone, [q, p]] of this.restPose) {
      bone.quaternion.copy(q);
      bone.position.copy(p);
    }
    this.setHands(this.hands.l, this.hands.r);
  }

  /** Reproduit la pose courante du squelette procédural sur le modèle */
  retarget(rig: Rig) {
    for (const a of Object.values(this.clips)) a.enabled = false;
    if (this.clipPlayed) {
      this.restoreRest();
      this.clipPlayed = false;
    }
    this.wrapper.position.set(0, 0, 0);
    this.wrapper.updateMatrixWorld(true);
    rig.root.updateMatrixWorld(true);
    for (const k of ORDER) {
      if (k === 'lSh' || k === 'rSh') this.liftClavicle(rig, k === 'lSh' ? 'l' : 'r');
      const bone = this.bones[k]!;
      // delta = rotation monde actuelle / rotation de référence
      srcJoint(rig, k).getWorldQuaternion(q1);
      q1.multiply(q2.copy(this.srcRef[k]!).invert());
      const targetWorld = q1.multiply(this.restWorld[k]!);
      bone.parent!.getWorldQuaternion(q2);
      bone.quaternion.copy(q2.invert().multiply(targetWorld));
      bone.updateMatrixWorld(true);
    }
    // position des hanches = celle du bassin procédural
    const p = worldPos(rig.pelvis, new THREE.Vector3());
    this.bones.pelvis!.parent!.worldToLocal(p);
    this.bones.pelvis!.position.copy(p);
    this.wrapper.updateMatrixWorld(true);
    for (const side of SIDES) if (this.hands[side] === 'flat') this.flattenHand(rig, side);
  }

  /** Les clavicules montent avec les bras levés (et avec le haussement d'épaules) */
  private liftClavicle(rig: Rig, side: Side) {
    const c = this.clavicles[side];
    if (!c) return;
    c.bone.quaternion.copy(c.rest);
    c.bone.updateMatrixWorld(true);
    const sh = rig.joints[`${side}Sh`];
    const el = rig.joints[`${side}El`];
    const d = worldPos(el, v).sub(worldPos(sh, new THREE.Vector3())).normalize();
    rig.joints.chest.getWorldQuaternion(q1);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q1);
    const elev = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(-d.dot(up), -1, 1)));
    const shrug = sh.position.y - ((sh.userData.baseY as number | undefined) ?? sh.position.y);
    const lift = Math.max(0, elev - 75) * 0.24 + Math.max(0, shrug) * 320;
    if (lift <= 0.01) return;
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q1);
    const target = q2.setFromAxisAngle(fwd, THREE.MathUtils.degToRad(side === 'l' ? lift : -lift)).multiply(c.bone.getWorldQuaternion(new THREE.Quaternion()));
    c.bone.parent!.getWorldQuaternion(q1);
    c.bone.quaternion.copy(q1.invert().multiply(target));
    c.bone.updateMatrixWorld(true);
  }

  /** Paume à plat au sol, doigts vers la tête (corps allongé) ou vers l'avant, légèrement ouverts */
  private flattenHand(rig: Rig, side: Side) {
    const hand = this.bones[`${side}Hand`];
    const fr = this.handFrame[side];
    if (!hand || !fr) return;
    const F = worldPos(this.markers.head, v).sub(worldPos(this.bones.pelvis!, new THREE.Vector3())).setY(0);
    if (F.lengthSq() < 0.15) F.set(0, 0, 1).applyQuaternion(rig.joints.chest.getWorldQuaternion(q1)).setY(0);
    if (F.lengthSq() < 1e-6) return;
    F.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(side === 'l' ? 12 : -12));
    const P = new THREE.Vector3(0, -1, 0);
    const world = new THREE.Matrix4().makeBasis(F, P, new THREE.Vector3().crossVectors(F, P));
    const local = new THREE.Matrix4().makeBasis(fr.finger, fr.palm, new THREE.Vector3().crossVectors(fr.finger, fr.palm));
    const target = new THREE.Quaternion().setFromRotationMatrix(world.multiply(local.transpose()));
    hand.parent!.getWorldQuaternion(q1);
    hand.quaternion.copy(q1.invert().multiply(target));
    hand.updateMatrixWorld(true);
  }

  /** Point de peau le plus bas (monde) */
  lowestSkin() {
    let low = Infinity;
    for (const { mesh, idx } of this.samples) {
      for (const i of idx) {
        mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld);
        if (v.y < low) low = v.y;
      }
    }
    return low;
  }

  /** Pose le point de peau le plus bas à la hauteur y */
  groundTo(y: number) {
    this.wrapper.updateMatrixWorld(true);
    this.wrapper.position.y += y - this.lowestSkin();
    this.wrapper.updateMatrixWorld(true);
  }

  /** Suspendu : la barre passe dans les poings */
  hangFrom(h: number) {
    this.wrapper.updateMatrixWorld(true);
    const y = (worldPos(this.markers.lGrip, v).y + worldPos(this.markers.rGrip, new THREE.Vector3()).y) / 2;
    this.wrapper.position.y += h - y;
    this.wrapper.updateMatrixWorld(true);
  }

  /** Repère du modèle équivalent à un repère du squelette procédural (appuis) */
  marker(name: string): THREE.Object3D | undefined {
    const b = this.bones;
    switch (name) {
      case 'lHand':
      case 'rHand': {
        const s: Side = name === 'lHand' ? 'l' : 'r';
        return this.hands[s] === 'flat' ? this.markers[`${s}Palm`] : this.markers[`${s}Grip`];
      }
      case 'lToe':
      case 'rToe':
      case 'lHeel':
      case 'rHeel':
      case 'head':
        return this.markers[name];
      case 'lElbow':
        return b.lEl;
      case 'rElbow':
        return b.rEl;
      case 'lKnee':
        return b.lKnee;
      case 'rKnee':
        return b.rKnee;
      case 'upperBack':
      case 'back':
      case 'chestFront':
        return b.chest;
      case 'butt':
      case 'pelvisLow':
        return b.pelvis;
      case 'headBack':
      case 'face':
        return this.markers.head;
    }
    return undefined;
  }
}

/* ───────── chargement ───────── */

async function loadAny(url: string): Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }> {
  if (/\.fbx$/i.test(url)) {
    const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
    const obj = await new FBXLoader().loadAsync(url);
    return { scene: obj, animations: obj.animations };
  }
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const g = await new GLTFLoader().loadAsync(url);
  return { scene: g.scene, animations: g.animations };
}

/** Combattant de l'appli (public/fighter/), sinon personnage d'essai local (public/models/) */
export async function loadManifest(bases = ['/fighter/', '/models/']): Promise<ModelManifest | null> {
  for (const base of bases) {
    try {
      const res = await fetch(`${base}manifest.json`, { cache: 'force-cache' });
      if (res.ok) return { ...((await res.json()) as ModelManifest), base };
    } catch {
      // dossier suivant
    }
  }
  return null;
}

export async function loadExternalFighter(manifest: ModelManifest, rig: Rig, base = manifest.base ?? '/models/'): Promise<ExternalFighter> {
  const { scene } = await loadAny(base + manifest.model);
  let manga: { ink: THREE.Texture | null } | undefined;
  if (manifest.manga) {
    let ink: THREE.Texture | null = null;
    if (manifest.manga.ink) {
      try {
        ink = await new THREE.TextureLoader().loadAsync(base + manifest.manga.ink);
        ink.flipY = false; // même convention que les textures glTF
        ink.colorSpace = THREE.NoColorSpace;
        ink.needsUpdate = true;
      } catch {
        // sans traits des muscles
      }
    }
    manga = { ink };
  }
  const fighter = new ExternalFighter(scene, rig, { yaw: manifest.yaw, toon: manifest.toon, manga, tint: manifest.tint, hair: manifest.hair, fists: manifest.fists });
  for (const [id, file] of Object.entries(manifest.anims ?? {})) {
    try {
      const { animations } = await loadAny(base + file);
      if (animations[0]) fighter.addClip(id, animations[0]);
    } catch {
      // clip illisible : l'exercice reste animé par le squelette procédural
    }
  }
  return fighter;
}

/* ───────── modèle de test (squelette Mixamo synthétique en T-pose) ───────── */

export function buildSyntheticMixamo(): THREE.Object3D {
  const root = new THREE.Group();
  const mat = new THREE.MeshToonMaterial({ color: '#8fb3d9' });
  const bone = (name: string, parent: THREE.Object3D, x: number, y: number, z: number, len = 0) => {
    const b = new THREE.Bone();
    b.name = `mixamorig:${name}`;
    b.position.set(x, y, z);
    parent.add(b);
    if (len) {
      const dir = new THREE.Vector3(x, y, z);
      void dir;
    }
    return b;
  };
  const seg = (b: THREE.Object3D, to: THREE.Vector3, r: number) => {
    const len = to.length();
    const g = new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 4, 8);
    const m = new THREE.Mesh(g, mat);
    m.position.copy(to.clone().multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().normalize());
    b.add(m);
  };
  // Échelle « centimètres » comme Mixamo
  const hips = bone('Hips', root, 0, 100, 0);
  const spine = bone('Spine', hips, 0, 10, 0);
  const spine1 = bone('Spine1', spine, 0, 12, 0);
  const spine2 = bone('Spine2', spine1, 0, 12, 0);
  const neck = bone('Neck', spine2, 0, 16, 0);
  const head = bone('Head', neck, 0, 10, 0);
  seg(hips, new THREE.Vector3(0, 10, 0), 12);
  seg(spine, new THREE.Vector3(0, 12, 0), 12);
  seg(spine1, new THREE.Vector3(0, 12, 0), 14);
  seg(spine2, new THREE.Vector3(0, 16, 0), 15);
  seg(neck, new THREE.Vector3(0, 10, 0), 5);
  const headM = new THREE.Mesh(new THREE.SphereGeometry(11, 16, 12), mat);
  headM.position.y = 10;
  head.add(headM);
  for (const [side, s] of [['Left', 1], ['Right', -1]] as const) {
    const sh = bone(`${side}Shoulder`, spine2, s * 6, 13, 0);
    const arm = bone(`${side}Arm`, sh, s * 14, 0, 0);
    const fore = bone(`${side}ForeArm`, arm, s * 28, 0, 0);
    const hand = bone(`${side}Hand`, fore, s * 26, 0, 0);
    seg(arm, new THREE.Vector3(s * 28, 0, 0), 5.5);
    seg(fore, new THREE.Vector3(s * 26, 0, 0), 4.5);
    seg(hand, new THREE.Vector3(s * 9, 0, 0), 4);
    const up = bone(`${side}UpLeg`, hips, s * 10, -5, 0);
    const leg = bone(`${side}Leg`, up, 0, -45, 0);
    const foot = bone(`${side}Foot`, leg, 0, -44, 0);
    const toe = bone(`${side}ToeBase`, foot, 0, -6, 14);
    seg(up, new THREE.Vector3(0, -45, 0), 7.5);
    seg(leg, new THREE.Vector3(0, -44, 0), 6);
    seg(foot, new THREE.Vector3(0, -6, 14), 4);
    void toe;
  }
  return root;
}
