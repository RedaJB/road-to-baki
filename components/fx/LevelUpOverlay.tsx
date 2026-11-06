'use client';

import React from 'react';
import { motion } from 'framer-motion';

/** Éclats radiaux (écran de victoire de fin de séance) */
export function Burst({ count = 26, color = 'var(--accent)' }: { count?: number; color?: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'grid', placeItems: 'center' }} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = 120 + (i % 4) * 30;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 0.9, scale: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0.3 }}
            transition={{ duration: 1 + (i % 3) * 0.2, ease: [0.1, 0.8, 0.3, 1], delay: 0.15 }}
            style={{ position: 'absolute', width: i % 2 ? 5 : 8, height: i % 2 ? 5 : 3, borderRadius: 4, background: color, rotate: `${(angle * 180) / Math.PI}deg` }}
          />
        );
      })}
    </div>
  );
}
