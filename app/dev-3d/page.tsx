'use client';

import { useEffect, useRef, useState } from 'react';
import { ExercisePlayer } from '../../lib/fighter3d/player';
import { MOTIONS } from '../../lib/fighter3d/motions';
import { ExternalFighter, buildSyntheticMixamo, loadExternalFighter, loadManifest } from '../../lib/fighter3d/model';

function Dev3DInner() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [shots, setShots] = useState<{ id: string; imgs: string[] }[]>([]);
  const [only, setOnly] = useState<string | null>(null);
  const [cols, setCols] = useState(8);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const filter = q.get('ids')?.split(',');
    setOnly(q.get('ids'));
    setCols(Number(q.get('cols') ?? (q.get('ids') ? 4 : 8)));
    const p = new ExercisePlayer(canvas.current!, { background: '#141417', preserveDrawingBuffer: true, pixelRatio: 1 });
    const size = Number(q.get('size') ?? 220);
    p.resize(size, size);
    let cancelled = false;
    const run = () => {
      const out: { id: string; imgs: string[] }[] = [];
      const phases = Number(q.get('phases') ?? 2);
      for (const [id, m] of Object.entries(MOTIONS)) {
        if (filter && !filter.includes(id)) continue;
        p.setMotion(m, id);
        const imgs: string[] = [];
        for (let k = 0; k < phases; k++) {
          p.renderAt((m.dur * k) / phases + 0.001);
          imgs.push(canvas.current!.toDataURL('image/jpeg', 0.8));
        }
        out.push({ id, imgs });
      }
      setShots(out);
      (window as unknown as { __done: boolean }).__done = true;
    };
    if (q.get('model') === 'synthetic') {
      p.attachModel(new ExternalFighter(buildSyntheticMixamo(), p.rig));
      run();
    } else if (q.get('model') === 'manifest') {
      // personnage de public/models/manifest.json, comme dans l'appli
      loadManifest()
        .then((mf) => (mf ? loadExternalFighter(mf, p.rig) : null))
        .then((f) => {
          if (cancelled) return;
          if (f) p.attachModel(f);
          run();
        });
    } else run();
    return () => {
      cancelled = true;
      p.dispose();
    };
  }, []);

  return (
    <div style={{ background: '#000', color: '#aaa', fontSize: 10, padding: 6 }}>
      <canvas ref={canvas} style={{ display: 'none' }} />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4 }}>
        {shots.map((s) => (
          <div key={s.id}>
            <div style={{ display: 'flex' }}>
              {s.imgs.map((src, k) => (
                <img key={k} src={src} alt="" style={{ width: `${100 / s.imgs.length}%` }} />
              ))}
            </div>
            {s.id}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Page d'outillage : désactivée en production */
export default function Dev3D() {
  if (process.env.NODE_ENV === 'production') return null;
  return <Dev3DInner />;
}
