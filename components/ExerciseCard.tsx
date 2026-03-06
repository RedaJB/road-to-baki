'use client';

import React from 'react';
import type { Exercise } from '../lib/exercises';

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <div
      style={{
        borderRadius: '0.9rem',
        border: '1px solid #27272a',
        padding: '0.9rem 1rem',
        background: 'rgba(15,23,42,0.6)',
      }}
    >
      <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
        {exercise.name}
      </p>
      <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
        {exercise.muscle}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: '#d1d5db' }}>
        <span>🧱 {exercise.sets} séries</span>
        <span>🎯 {exercise.reps} reps</span>
        {exercise.rest !== '—' && <span>⏱️ Repos {exercise.rest}</span>}
      </div>
    </div>
  );
}
