'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useXp } from '../lib/xp-context';

const RANKS = ['Rookie', 'Combattant', 'Gladiateur', 'Predator', 'Hanma', 'Ogre'];

export function BakiXpHud() {
  const { level, rank, xp, currentLevelXp, nextLevelXp, progressPct } = useXp();
  const rankIdx = Math.max(0, RANKS.indexOf(rank));

  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 16,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--accent-gradient)',
            boxShadow: 'none',
            color: 'var(--on-accent)',
          }}
        >
          <div style={{ textAlign: 'center', lineHeight: 1 }}>
            <div style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.1em' }}>NIV</div>
            <div className="statNum" style={{ fontSize: '1.7rem' }}>{level}</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p className="eyebrow">Puissance</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{xp.toLocaleString('fr-FR')} XP</span>
          </div>
          <p style={{ margin: '0.1rem 0 0.45rem', fontFamily: 'var(--font-impact)', fontSize: '1.25rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{rank}</p>
          <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
                            style={{ height: '100%', borderRadius: 999, background: 'var(--accent)' }}
            />
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            {currentLevelXp} / {nextLevelXp} XP · prochain niveau
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: '0.85rem' }}>
        {RANKS.map((r, i) => (
          <div key={r} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: 3, borderRadius: 999, background: i <= rankIdx ? 'var(--accent)' : 'rgba(255,255,255,0.08)', boxShadow: 'none' }} />
            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: i === rankIdx ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
