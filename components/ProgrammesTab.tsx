'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '../lib/app-context';
import { useOnboarding } from '../lib/onboarding-context';
import { getExercisesForDay } from '../lib/exercises';
import { ExerciseCard } from './ExerciseCard';

const DAY_LABELS: Record<number, string> = {
  1: 'Full body A',
  2: 'Bas du corps',
  3: 'Haut du corps',
  4: 'Full body B',
};

export function ProgrammesTab() {
  const todayStr = new Date().toISOString().split('T')[0];
  const { douleurs: appDouleurs, trainingDoneDates, setTrainingDoneForDate } = useApp();
  const { answers } = useOnboarding();
  const douleurs = appDouleurs ?? answers.douleurs ?? null;
  const [selectedDay, setSelectedDay] = useState<number>(1);

  const isTrainingDoneToday = useMemo(
    () => trainingDoneDates.includes(todayStr),
    [trainingDoneDates, todayStr],
  );

  const exercises = getExercisesForDay({
    objectif: 'perte',
    day: selectedDay,
    douleurs,
  });

  return (
    <section
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '1.25rem 1.25rem 5rem',
      }}
    >
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        Programmes
      </h1>
      <p style={{ color: '#9ca3af', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Séances prêtes à l&apos;emploi, adaptées à tes douleurs.
      </p>

      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', overflowX: 'auto' }}>
        {[1, 2, 3, 4].map((day) => {
          const selected = day === selectedDay;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              style={{
                minWidth: 80,
                borderRadius: '0.9rem',
                padding: '0.5rem 0.7rem',
                border: selected ? '1px solid rgba(248,113,113,0.9)' : '1px solid #374151',
                background: selected ? 'rgba(248,113,113,0.12)' : 'rgba(15,23,42,0.95)',
                color: '#e5e7eb',
                fontSize: '0.85rem',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Jour {day}</span>
              <br />
              <span style={{ fontWeight: 600 }}>{DAY_LABELS[day]}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
          Jour {selectedDay} — {DAY_LABELS[selectedDay] ?? 'Sport'}
        </h2>
        <button
          type="button"
          onClick={() => setTrainingDoneForDate(todayStr, !isTrainingDoneToday)}
          style={{
            borderRadius: '999px',
            border: 'none',
            padding: '0.45rem 0.9rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            background: isTrainingDoneToday ? 'rgba(34,197,94,0.15)' : 'rgba(15,23,42,0.95)',
            color: isTrainingDoneToday ? '#bbf7d0' : '#e5e7eb',
          }}
        >
          {isTrainingDoneToday ? '✓ Séance faite' : 'Marquer comme fait'}
        </button>
      </div>

      {exercises.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Aucune séance prévue ce jour. Choisis un autre jour.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {exercises.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      )}
    </section>
  );
}
