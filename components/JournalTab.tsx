'use client';

import React, { useState } from 'react';
import { useNutrition } from '../lib/nutrition-context';
import { AddMealSheet } from './AddMealSheet';

export function JournalTab() {
  const today = new Date().toISOString().split('T')[0];
  const { getMealsForDate, getTotalCaloriesForDate } = useNutrition();
  const meals = getMealsForDate(today);
  const totalKcal = getTotalCaloriesForDate(today);
  const [open, setOpen] = useState(false);

  return (
    <section
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '1.25rem 1.25rem 5rem',
      }}
    >
      <h1
        style={{
          fontSize: '1.6rem',
          fontWeight: 700,
          marginBottom: '0.25rem',
        }}
      >
        Journal
      </h1>
      <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>
        Aujourd&apos;hui&nbsp;: {today}
      </p>

      <div
        style={{
          borderRadius: '0.9rem',
          padding: '1rem 1.1rem',
          background:
            'linear-gradient(135deg, rgba(248,113,113,0.16), rgba(15,23,42,0.9))',
          border: '1px solid rgba(248,113,113,0.35)',
          marginBottom: '1.5rem',
        }}
      >
        <p style={{ fontSize: '0.9rem', color: '#e5e7eb' }}>
          Calories totales du jour
        </p>
        <p
          style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            marginTop: '0.35rem',
          }}
        >
          {Math.round(totalKcal)} <span style={{ fontSize: '0.9rem' }}>kcal</span>
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            marginTop: '0.9rem',
            borderRadius: '999px',
            padding: '0.55rem 1.1rem',
            border: 'none',
            background:
              'linear-gradient(135deg, #f97373, #fb7185)',
            color: '#0b0b10',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          + Ajouter un repas
        </button>
      </div>

      <h2
        style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          marginBottom: '0.75rem',
        }}
      >
        Repas du jour
      </h2>

      {meals.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Aucun repas encore. Ajoute ton premier repas de la journée.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {meals.map((m) => (
            <li
              key={m.id}
              style={{
                borderRadius: '0.85rem',
                border: '1px solid #27272a',
                padding: '0.8rem 0.9rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.6rem',
              }}
            >
              <div>
                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  {m.label}
                </p>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: '#9ca3af',
                    textTransform: 'capitalize',
                  }}
                >
                  {m.type.replace('_', ' ')}
                </p>
              </div>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                {Math.round(m.calories)} kcal
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && <AddMealSheet onClose={() => setOpen(false)} />}
    </section>
  );
}

