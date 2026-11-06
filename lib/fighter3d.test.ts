import { describe, expect, it } from 'vitest';
import { EXERCISES } from './programs';
import { MOTIONS } from './fighter3d/motions';
import { poseAt } from './fighter3d/player';
import { buildSyntheticMixamo, findBones } from './fighter3d/model';
import { applyPose, buildFighter, minY } from './fighter3d/rig';

describe('animations 3D', () => {
  it('chaque exercice de la banque a son animation', () => {
    const missing = Object.keys(EXERCISES).filter((id) => !MOTIONS[id]);
    expect(missing).toEqual([]);
  });

  it('interpole entre deux poses clés', () => {
    const m = { keys: [{ lEl: 0 }, { lEl: 100 }], dur: 2 };
    expect(poseAt(m, 0).lEl).toBeCloseTo(0);
    expect(poseAt(m, 0.5).lEl).toBeCloseTo(50);
    expect(poseAt(m, 1).lEl).toBeCloseTo(100);
  });

  it('enchaîne les poses clés sans à-coup ni dépassement', () => {
    const m = { keys: [{ lEl: 0 }, { lEl: 50 }, { lEl: 100 }], dur: 3 };
    expect(poseAt(m, 1).lEl).toBeCloseTo(50);
    expect(poseAt(m, 2).lEl).toBeCloseTo(100);
    // le mouvement continue : vitesse non nulle sur la clé intermédiaire
    expect((poseAt(m, 1.01).lEl! - poseAt(m, 0.99).lEl!) / 0.02).toBeGreaterThan(20);
    for (let t = 0; t <= 3; t += 0.05) {
      expect(poseAt(m, t).lEl!).toBeGreaterThanOrEqual(-1e-6);
      expect(poseAt(m, t).lEl!).toBeLessThanOrEqual(100 + 1e-6);
    }
  });

  it('le combattant debout a les pieds au niveau du sol', () => {
    const rig = buildFighter();
    applyPose(rig, {});
    const feet = minY(rig, ['lHeel', 'rHeel', 'lToe', 'rToe']);
    expect(Math.abs(feet)).toBeLessThan(0.08);
  });
});

describe('modèle externe', () => {
  it('reconnaît tous les os d’un squelette Mixamo', () => {
    const { missing, bones } = findBones(buildSyntheticMixamo());
    expect(missing).toEqual([]);
    expect(bones.lSh?.name).toBe('mixamorig:LeftArm');
    expect(bones.rKnee?.name).toBe('mixamorig:RightLeg');
  });
});
