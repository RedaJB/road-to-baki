'use client';

import React, { useState } from 'react';
import { useApp, FASTING_PLANS_UI } from '../lib/app-context';
import { useOnboarding } from '../lib/onboarding-context';
import type { FastingMode } from '../lib/app-context';

function aggregateWeightByMonth(history: { date: string; weight: number }[]) {
  const byMonth: Record<string, number[]> = {};
  for (const e of history) {
    const month = e.date.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(e.weight);
  }
  return Object.fromEntries(
    Object.entries(byMonth).map(([m, arr]) => [
      m,
      arr.reduce((a, b) => a + b, 0) / arr.length,
    ]),
  );
}

export function ProfilTab() {
  const { weightHistory, addWeight, fastingMode, setFastingMode } = useApp();
  const { answers: onboardingAnswers } = useOnboarding();
  const [newWeight, setNewWeight] = useState('');
  const [showWeightInput, setShowWeightInput] = useState(false);

  const safeHistory = weightHistory.filter((e) => e.weight >= 30 && e.weight <= 300);
  const weightByMonth = aggregateWeightByMonth(safeHistory);
  const currentWeight =
    safeHistory.length > 0
      ? safeHistory[safeHistory.length - 1].weight
      : onboardingAnswers.poids && onboardingAnswers.poids >= 30 && onboardingAnswers.poids <= 300
        ? onboardingAnswers.poids
        : 0;
  const poidsCible = onboardingAnswers.poidsCible ?? 0;
  const dateObjectif = onboardingAnswers.dateObjectif ?? '';

  const handleAddWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(newWeight.replace(',', '.'));
    if (!Number.isNaN(w) && w >= 30 && w <= 300) {
      addWeight(w);
      setNewWeight('');
      setShowWeightInput(false);
    }
  };

  return (
    <section
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '1.25rem 1.25rem 5rem',
      }}
    >
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        Profil
      </h1>
      <p style={{ color: '#9ca3af', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Objectif poids, suivi et mode fasting.
      </p>

      <div
        style={{
          borderRadius: '0.9rem',
          padding: '1rem 1.1rem',
          background: 'linear-gradient(135deg, rgba(248,113,113,0.16), rgba(15,23,42,0.9))',
          border: '1px solid rgba(248,113,113,0.35)',
          marginBottom: '1rem',
        }}
      >
        <p style={{ fontSize: '0.9rem', color: '#e5e7eb' }}>Objectif poids</p>
        <p style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.35rem' }}>
          {poidsCible ? `${poidsCible} kg` : '—'} {dateObjectif ? `avant le ${dateObjectif}` : ''}
        </p>
        <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.25rem' }}>
          Dernier : <strong>{safeHistory.length ? safeHistory[safeHistory.length - 1].weight : '—'} kg</strong>
        </p>
        {!showWeightInput ? (
          <button
            type="button"
            onClick={() => setShowWeightInput(true)}
            style={{
              marginTop: '0.75rem',
              borderRadius: '999px',
              padding: '0.45rem 0.9rem',
              border: '1px solid rgba(248,113,113,0.6)',
              background: 'transparent',
              color: '#fecaca',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            Ajouter mon poids
          </button>
        ) : (
          <form onSubmit={handleAddWeight} style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              inputMode="decimal"
              placeholder="Ex: 78.5"
              style={{
                width: 100,
                borderRadius: '0.6rem',
                border: '1px solid #374151',
                padding: '0.45rem 0.6rem',
                background: '#020617',
                color: '#e5e7eb',
                fontSize: '0.9rem',
              }}
            />
            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>kg</span>
            <button
              type="submit"
              style={{
                borderRadius: '999px',
                border: 'none',
                padding: '0.45rem 0.8rem',
                background: 'linear-gradient(135deg, #f97373, #fb7185)',
                color: '#0b0b10',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              Valider
            </button>
          </form>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#e5e7eb', marginBottom: '0.5rem' }}>Mode fasting</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {(Object.keys(FASTING_PLANS_UI) as FastingMode[]).map((mode) => {
            const selected = fastingMode === mode;
            const plan = FASTING_PLANS_UI[mode];
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setFastingMode(mode)}
                style={{
                  borderRadius: '999px',
                  border: selected ? '1px solid rgba(248,113,113,0.9)' : '1px solid #374151',
                  background: selected ? 'rgba(248,113,113,0.1)' : 'transparent',
                  color: selected ? '#fecaca' : '#e5e7eb',
                  fontSize: '0.8rem',
                  padding: '0.3rem 0.65rem',
                }}
              >
                {plan.label}
              </button>
            );
          })}
        </div>
      </div>

      {Object.keys(weightByMonth).length > 0 && (
        <div
          style={{
            borderRadius: '0.9rem',
            border: '1px solid #27272a',
            padding: '1rem',
            background: 'rgba(15,23,42,0.6)',
          }}
        >
          <p style={{ fontSize: '0.9rem', color: '#e5e7eb', marginBottom: '0.75rem' }}>
            Évolution mensuelle (moyenne)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {Object.entries(weightByMonth)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([month, avg]) => (
                <span
                  key={month}
                  style={{
                    fontSize: '0.85rem',
                    color: '#9ca3af',
                  }}
                >
                  {month} : <strong style={{ color: '#e5e7eb' }}>{avg.toFixed(1)} kg</strong>
                </span>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
