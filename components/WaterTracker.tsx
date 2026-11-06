'use client';

import React from 'react';
import { useApp } from '../lib/app-context';
import { useToast } from '../lib/toast-context';
import { useOnboarding } from '../lib/onboarding-context';
import { useXp } from '../lib/xp-context';
import { getRecommendedWaterMl, VERRE_ML, BOUTEILLE_ML } from '../lib/water';

export function WaterTracker({ date }: { date: string }) {
  const { waterIntakeByDate, addWater, weightHistory } = useApp();
  const { toast } = useToast();
  const { addXp } = useXp();
  const { answers } = useOnboarding();

  const lastWeight = weightHistory.filter((e) => e.weight >= 30 && e.weight <= 300).pop()?.weight;
  const poids = lastWeight ?? answers.poids ?? 0;
  const taille = answers.taille ?? undefined;
  const safeWeight = poids >= 30 && poids <= 300 ? poids : 70;
  const goalMl = getRecommendedWaterMl(safeWeight, taille);
  const currentMl = waterIntakeByDate[date] ?? 0;
  const pct = Math.min(100, (currentMl / goalMl) * 100);
  const done = currentMl >= goalMl;

  return (
    <div className="panel" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <p className="sectionLabel" style={{ marginBottom: 0 }}>
          <span style={{ color: 'var(--water-blue)', marginRight: '0.35rem' }}>💧</span>
          Hydratation
        </p>
        <span style={{ fontSize: '1rem', fontWeight: 700, color: done ? 'var(--success)' : 'var(--water-blue)' }}>
          {(currentMl / 1000).toFixed(1)} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.85rem' }}>/ {(goalMl / 1000).toFixed(1)} L</span>
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 10, borderRadius: 999, background: 'var(--border)', overflow: 'hidden', marginBottom: '0.75rem' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 999,
            background: done
              ? 'linear-gradient(90deg, var(--water-blue), var(--success))'
              : 'linear-gradient(90deg, #60a5fa, var(--water-blue))',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className="btnSecondary"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
          onClick={() => {
            addWater(date, VERRE_ML);
            const levelUp = addXp(4);
            toast(levelUp.leveledUp ? `+4 XP · Niveau ${levelUp.newLevel} !` : '+250 ml · +4 XP');
          }}
        >
          <span style={{ color: 'var(--water-blue)' }}>+</span> 250 ml
        </button>
        <button
          type="button"
          className="btnSecondary"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
          onClick={() => {
            addWater(date, BOUTEILLE_ML);
            const levelUp = addXp(10);
            toast(levelUp.leveledUp ? `+10 XP · Niveau ${levelUp.newLevel} !` : '+1.5 L · +10 XP');
          }}
        >
          <span style={{ color: 'var(--water-blue)' }}>+</span> 1.5 L
        </button>
      </div>

      {done && (
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600, marginTop: '0.5rem', marginBottom: 0 }}>
          Objectif atteint !
        </p>
      )}
    </div>
  );
}
