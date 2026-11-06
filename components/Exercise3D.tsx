'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Démo 3D d'un exercice. Le moteur three.js est chargé à la demande.
 * Personnage : le combattant manga de public/fighter/ (voir lib/fighter3d/model.ts).
 */
export function Exercise3D({ exerciseId, height = 220, orbit = 8 }: { exerciseId: string; height?: number; orbit?: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let disposed = false;
    let player: import('../lib/fighter3d/player').ExercisePlayer | null = null;
    let observer: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;

    (async () => {
      try {
        const [{ ExercisePlayer }, { motionFor }, model] = await Promise.all([
          import('../lib/fighter3d/player'),
          import('../lib/fighter3d/motions'),
          import('../lib/fighter3d/model'),
        ]);
        if (disposed || !canvas.current || !wrap.current) return;
        const accent = getComputedStyle(wrap.current).getPropertyValue('--accent').trim() || '#e5484d';
        player = new ExercisePlayer(canvas.current, { background: null, accent });
        const manifest = await model.loadManifest();
        if (manifest && !disposed) {
          try {
            player.attachModel(await model.loadExternalFighter(manifest, player.rig));
          } catch (e) {
            console.warn('Modèle 3D ignoré :', e);
          }
        }
        if (disposed) return;
        player.setMotion(motionFor(exerciseId), exerciseId);
        const size = () => {
          const w = wrap.current?.clientWidth ?? 300;
          player?.resize(w, height);
        };
        size();
        ro = new ResizeObserver(size);
        ro.observe(wrap.current);
        observer = new IntersectionObserver(([e]) => (e.isIntersecting ? player?.start(orbit) : player?.stop()), { threshold: 0.05 });
        observer.observe(wrap.current);
        setState('ready');
      } catch (e) {
        console.error(e);
        if (!disposed) setState('error');
      }
    })();

    return () => {
      disposed = true;
      observer?.disconnect();
      ro?.disconnect();
      player?.dispose();
    };
  }, [exerciseId, height, orbit]);

  return (
    <div ref={wrap} style={{ position: 'relative', width: '100%', height, borderRadius: 14, overflow: 'hidden', background: 'radial-gradient(circle at 50% 35%, rgba(var(--accent-rgb),0.12), transparent 65%)' }}>
      <canvas ref={canvas} style={{ width: '100%', height: '100%', display: 'block' }} aria-label="Démonstration 3D de l’exercice" />
      {state !== 'ready' && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          {state === 'loading' ? 'Chargement de la démo…' : 'Démo 3D indisponible sur cet appareil'}
        </div>
      )}
    </div>
  );
}
