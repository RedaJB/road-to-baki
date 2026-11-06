'use client';

import React, { useState } from 'react';
import { Lock, Play } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { useTraining } from '../lib/training-context';
import { FREE_3D_SESSIONS, PRICING } from '../lib/pricing';
import { Exercise3D } from './Exercise3D';
import { PaywallBottomSheet } from './PaywallBottomSheet';

/**
 * Démo 3D : offerte pendant les premières séances (compteur visible dès le départ),
 * puis réservée à Pro. Le plan, les séances et les records restent gratuits.
 */
export function Demo3D({ exerciseId, height = 190 }: { exerciseId: string; height?: number }) {
  const { isPremium, setPremium } = useApp();
  const { logs } = useTraining();
  const [paywall, setPaywall] = useState(false);
  const left = FREE_3D_SESSIONS - logs.length;

  if (isPremium) return <Exercise3D exerciseId={exerciseId} height={height} />;

  const paywallSheet = <PaywallBottomSheet isOpen={paywall} onClose={() => setPaywall(false)} onUnlock={() => setPremium(true)} />;

  if (left > 0)
    return (
      <div>
        <Exercise3D exerciseId={exerciseId} height={height} />
        <button
          type="button"
          onClick={() => setPaywall(true)}
          style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center', marginTop: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}
        >
          Démo 3D offerte · {left === 1 ? 'dernière séance' : `encore ${left} séances`} · <span style={{ color: 'var(--accent)', fontWeight: 700 }}>illimitée avec Pro</span>
        </button>
        {paywallSheet}
      </div>
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setPaywall(true)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          boxSizing: 'border-box',
          width: '100%',
          height: Math.min(height, 120),
          padding: '0 16px',
          borderRadius: 14,
          border: '1px dashed rgba(var(--accent-rgb),0.4)',
          background: 'radial-gradient(circle at 50% 30%, rgba(var(--accent-rgb),0.12), transparent 70%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          textAlign: 'center',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.9rem' }}>
          <Play size={15} fill="currentColor" /> Garder les démos 3D
        </span>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Tes {FREE_3D_SESSIONS} séances découverte sont terminées. Ton plan et tes séances restent gratuits.
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent)' }}>
          <Lock size={12} /> Pro · {PRICING.trialDays} jours offerts
        </span>
      </button>
      {paywallSheet}
    </>
  );
}
