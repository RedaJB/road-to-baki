'use client';

import React, { useMemo } from 'react';
import { FighterIllustration } from './Fighters';

/* ─── Avatar d'un combattant : silhouette sans visage ─── */

export function FighterAvatar({ id, size = 64, rounded = '16px' }: { id: string; size?: number; rounded?: string }) {
  return <FighterIllustration id={id} size={size} rounded={rounded} />;
}

/* ─── Badges (sprite 3×2 : public/baki/badges.png, 1024×1024) ─── */

export type BadgeId = 'first_workout' | 'streak' | 'heavy' | 'back_day' | 'fasting' | 'champion';

const BADGE_CENTERS: Record<BadgeId, [number, number]> = {
  first_workout: [182, 206],
  streak: [512, 206],
  heavy: [842, 206],
  back_day: [182, 718],
  fasting: [512, 718],
  champion: [842, 718],
};
const BADGE_D = 296;

export function BadgeIcon({ id, size = 72, locked = false }: { id: BadgeId; size?: number; locked?: boolean }) {
  const [cx, cy] = BADGE_CENTERS[id];
  const scale = size / BADGE_D;
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        backgroundImage: 'url(/baki/badges.png)',
        backgroundSize: `${1024 * scale}px ${1024 * scale}px`,
        backgroundPosition: `${-(cx - BADGE_D / 2) * scale}px ${-(cy - BADGE_D / 2) * scale}px`,
        filter: locked ? 'grayscale(1) brightness(0.35)' : 'none',
        transition: 'filter 0.4s ease',
      }}
    />
  );
}

/* ─── Fond d'ambiance animé ─── */

export function AuraBackground({
  effect,
  aura,
  motto,
}: {
  effect: 'braises' | 'lignes' | 'kanji' | 'aucun';
  aura: 'off' | 'calme' | 'demon';
  motto: string;
}) {
  const embers = useMemo(
    () =>
      Array.from({ length: aura === 'demon' ? 34 : 20 }, (_, i) => {
        // pseudo-aléatoire déterministe
        const r = (n: number) => {
          const x = Math.sin(i * 9301 + n * 49297) * 233280;
          return x - Math.floor(x);
        };
        return {
          left: `${r(1) * 100}%`,
          size: 2 + r(2) * 4,
          duration: 6 + r(3) * 9,
          delay: -r(4) * 15,
          drift: (r(5) - 0.5) * 120,
          opacity: 0.35 + r(6) * 0.6,
        };
      }),
    [aura],
  );

  return (
    <div className={`auraBg auraBg--${aura}`} aria-hidden>
      {aura !== 'off' && <div className="auraBg__glow" />}
      {aura === 'demon' && <div className="auraBg__hero" />}
      {effect === 'lignes' && <div className="auraBg__speed" />}
      {effect === 'kanji' && (
        <div className="auraBg__kanji">
          {motto.split('').map((c, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.6}s` }}>
              {c}
            </span>
          ))}
        </div>
      )}
      {effect === 'braises' &&
        embers.map((e, i) => (
          <span
            key={i}
            className="ember"
            style={
              {
                left: e.left,
                width: e.size,
                height: e.size,
                animationDuration: `${e.duration}s`,
                animationDelay: `${e.delay}s`,
                '--drift': `${e.drift}px`,
                '--o': e.opacity,
              } as React.CSSProperties
            }
          />
        ))}
      <div className="auraBg__vignette" />
    </div>
  );
}

/* ─── Anneau de progression ─── */

export function Ring({
  pct,
  size = 120,
  stroke = 10,
  color = 'var(--accent)',
  track = 'rgba(255,255,255,0.07)',
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  );
}
