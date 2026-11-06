'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Home, UtensilsCrossed, Swords, User } from 'lucide-react';
import { useFx } from '../lib/customization-context';

export type TabId = 'journal' | 'graille' | 'programmes' | 'profil';

const TABS: { id: TabId; label: string; jp: string; Icon: typeof Home }[] = [
  { id: 'journal', label: 'Arène', jp: '闘', Icon: Home },
  { id: 'graille', label: 'Graille', jp: '食', Icon: UtensilsCrossed },
  { id: 'programmes', label: 'Training', jp: '鍛', Icon: Swords },
  { id: 'profil', label: 'Dojo', jp: '道', Icon: User },
];

export function BottomTabBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  const fx = useFx();
  return (
    <nav
      aria-label="Navigation principale"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(0.6rem + env(safe-area-inset-bottom))',
        zIndex: 80,
        width: 'min(440px, calc(100% - 1.6rem))',
        display: 'flex',
        padding: 6,
        borderRadius: 22,
        background: 'rgba(14,14,18,0.82)',
        backdropFilter: 'blur(22px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(var(--accent-rgb),0.08)',
      }}
    >
      {TABS.map(({ id, label, jp, Icon }) => {
        const selected = id === active;
        return (
          <button
            key={id}
            type="button"
            aria-current={selected ? 'page' : undefined}
            onClick={() => {
              if (!selected) fx('tap');
              onChange(id);
            }}
            style={{
              flex: 1,
              position: 'relative',
              border: 'none',
              background: 'transparent',
              padding: '0.5rem 0 0.4rem',
              color: selected ? 'var(--on-accent)' : 'rgba(255,255,255,0.45)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              transition: 'color 0.2s',
            }}
          >
            {selected && (
              <motion.div
                layoutId="tabPill"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 16,
                  background: 'var(--accent-gradient)',
                  boxShadow: '0 6px 20px rgba(var(--accent-rgb),0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
                }}
              />
            )}
            <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon size={20} strokeWidth={selected ? 2.6 : 1.9} />
              {selected && (
                <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="jp" style={{ fontSize: '0.85rem' }}>
                  {jp}
                </motion.span>
              )}
            </span>
            <span style={{ position: 'relative', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
