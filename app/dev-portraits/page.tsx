'use client';

import { useEffect, useState } from 'react';
import { ExercisePlayer } from '../../lib/fighter3d/player';
import type { Pose } from '../../lib/fighter3d/rig';
import { loadExternalFighter, loadManifest } from '../../lib/fighter3d/model';

/** Garde de combat : poings hauts, buste légèrement de trois-quarts */
const GUARD: Pose = { lSh: [48, 20, 0], rSh: [40, 34, 0], lEl: 122, rEl: 128, chest: [2, 0, 0], neck: [-4, 0, 0], lHip: [10, 8, 0], rHip: [-6, 8, 0], lKnee: 14, rKnee: 12 };

/** Boîte englobante des pixels visibles */
function bbox(c: HTMLCanvasElement) {
  const { width: w, height: h } = c;
  const data = c.getContext('2d')!.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 8) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  return { x0, y0, x1, y1 };
}

/** Recadre une zone dans un canevas carré (perso centré en largeur, posé en bas) */
function crop(src: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number, size: number, pad: number) {
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const scale = (size - pad * 2) / Math.max(sw, sh);
  const dw = sw * scale;
  const dh = sh * scale;
  out.getContext('2d')!.drawImage(src, sx, sy, sw, sh, (size - dw) / 2, size - dh - pad, dw, dh);
  return out.toDataURL('image/png');
}

/** Rendu du perso 3D en pied et en buste (utilisé par scripts/render-fighters.mjs) */
function DevPortraitsInner() {
  const [shots, setShots] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const canvas = document.createElement('canvas');
      const p = new ExercisePlayer(canvas, { background: null, preserveDrawingBuffer: true, pixelRatio: 1, accent: '#e5484d' });
      p.resize(2200, 2200);
      // même personnage que dans l'appli
      const mf = await loadManifest();
      if (mf) p.attachModel(await loadExternalFighter(mf, p.rig));
      p.renderPortrait(GUARD, 30, 'full');
      const flat = document.createElement('canvas');
      flat.width = flat.height = 2200;
      flat.getContext('2d')!.drawImage(canvas, 0, 0);
      p.dispose();

      const b = bbox(flat);
      const w = b.x1 - b.x0 + 1;
      const h = b.y1 - b.y0 + 1;
      // buste : du haut des cheveux jusqu'à la taille, en carré
      const bustH = Math.round(h * 0.42);
      const out = {
        baki: crop(flat, b.x0, b.y0, w, h, 900, 20),
        'baki-buste': crop(flat, b.x0 + w / 2 - bustH / 2, b.y0 - 8, bustH, bustH + 8, 600, 0),
      };
      setShots(out);
      const g = window as unknown as { __portraits: Record<string, string>; __done: boolean };
      g.__portraits = out;
      g.__done = true;
    })();
  }, []);

  return (
    <div style={{ background: '#111', padding: 8, display: 'flex', gap: 8 }}>
      {Object.entries(shots).map(([id, src]) => (
        <img key={id} src={src} alt={id} style={{ width: 300, display: 'block', background: '#2a1416' }} />
      ))}
    </div>
  );
}

/** Page d'outillage : désactivée en production */
export default function DevPortraits() {
  if (process.env.NODE_ENV === 'production') return null;
  return <DevPortraitsInner />;
}
