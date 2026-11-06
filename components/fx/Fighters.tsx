'use client';

import React from 'react';
import { getLook } from '../../lib/fighters';

/**
 * Baki, rendu depuis le perso 3D des démos (scripts/render-fighters.mjs → public/fighters/).
 * - `bust` (par défaut) : buste en garde, pour l'Arène et les pastilles
 * - `full` : en pied, pour l'accueil
 */
export function FighterIllustration({
  id,
  size = 64,
  rounded = '16px',
  bare = false,
  variant = 'bust',
  style,
}: {
  id: string;
  size?: number | string;
  rounded?: string;
  /** Sans fond (pour les compositions) */
  bare?: boolean;
  variant?: 'bust' | 'full';
  style?: React.CSSProperties;
}) {
  const look = getLook(id);
  return (
    <div
      role="img"
      aria-label={look.name}
      style={{
        width: size,
        aspectRatio: '1 / 1',
        flexShrink: 0,
        borderRadius: rounded,
        overflow: 'hidden',
        background: bare ? 'transparent' : `radial-gradient(circle at 50% 35%, ${look.color}55, ${look.color2}33 55%, #141416 100%)`,
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={variant === 'full' ? '/fighters/baki.png?v=4' : '/fighters/baki-buste.png?v=4'} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', display: 'block' }} />
    </div>
  );
}
