'use client';

import React from 'react';

export type TabId = 'journal' | 'programmes' | 'profil';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'journal', label: 'Journal', icon: '📋' },
  { id: 'programmes', label: 'Programmes', icon: '🏋️' },
  { id: 'profil', label: 'Profil', icon: '👤' },
];

export function BottomTabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        borderTop: '1px solid #27272a',
        background: 'rgba(5,5,9,0.96)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              padding: '0.6rem 0.4rem 0.75rem',
              border: 'none',
              background: 'transparent',
              color: selected ? '#f97373' : '#9ca3af',
              fontSize: '0.8rem',
              fontWeight: selected ? 700 : 500,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.1rem',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

