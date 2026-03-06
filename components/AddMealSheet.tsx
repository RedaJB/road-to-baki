'use client';

import React, { useState } from 'react';
import { useNutrition, MealType } from '../lib/nutrition-context';

interface AddMealSheetProps {
  onClose: () => void;
}

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  petit_dej: 'Petit-déjeuner',
  dej: 'Déjeuner',
  diner: 'Dîner',
  snack: 'Snack',
};

export function AddMealSheet({ onClose }: AddMealSheetProps) {
  const today = new Date().toISOString().split('T')[0];
  const { addMeal } = useNutrition();
  const [mealType, setMealType] = useState<MealType>('dej');
  const [label, setLabel] = useState('');
  const [kcal, setKcal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const calories = parseInt(kcal.replace(',', '.'), 10);
    if (!label.trim() || Number.isNaN(calories) || calories <= 0) return;
    addMeal({
      date: today,
      type: mealType,
      label: label.trim(),
      calories,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 40,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#020617',
          borderTopLeftRadius: '1.25rem',
          borderTopRightRadius: '1.25rem',
          borderTop: '1px solid #27272a',
          borderInline: '1px solid #27272a',
          padding: '1.2rem 1.3rem 1.6rem',
          boxShadow: '0 -18px 45px rgba(0,0,0,0.7)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 600,
            }}
          >
            Ajouter un repas
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: '999px',
              border: '1px solid #374151',
              background: 'transparent',
              color: '#9ca3af',
              padding: '0.2rem 0.6rem',
              fontSize: '0.8rem',
            }}
          >
            Fermer
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
        >
          <div>
            <p
              style={{
                fontSize: '0.85rem',
                color: '#9ca3af',
                marginBottom: '0.35rem',
              }}
            >
              Type de repas
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(Object.keys(MEAL_TYPE_LABEL) as MealType[]).map((type) => {
                const selected = mealType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMealType(type)}
                    style={{
                      borderRadius: '999px',
                      border: selected
                        ? '1px solid rgba(248,113,113,0.9)'
                        : '1px solid #374151',
                      background: selected ? 'rgba(248,113,113,0.1)' : 'transparent',
                      color: selected ? '#fecaca' : '#e5e7eb',
                      fontSize: '0.8rem',
                      padding: '0.28rem 0.7rem',
                    }}
                  >
                    {MEAL_TYPE_LABEL[type]}
                  </button>
                );
              })}
            </div>
          </div>

          <label style={{ display: 'block' }}>
            <span
              style={{
                fontSize: '0.85rem',
                color: '#9ca3af',
                display: 'block',
                marginBottom: '0.25rem',
              }}
            >
              Nom du plat
            </span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Escalope + riz, Bowl, McDo..."
              style={{
                width: '100%',
                borderRadius: '0.75rem',
                border: '1px solid #374151',
                padding: '0.6rem 0.75rem',
                background: '#020617',
                color: '#e5e7eb',
                fontSize: '0.9rem',
              }}
            />
          </label>

          <label style={{ display: 'block' }}>
            <span
              style={{
                fontSize: '0.85rem',
                color: '#9ca3af',
                display: 'block',
                marginBottom: '0.25rem',
              }}
            >
              Calories estimées
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <input
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                inputMode="decimal"
                placeholder="Ex: 650"
                style={{
                  flex: 1,
                  borderRadius: '0.75rem',
                  border: '1px solid #374151',
                  padding: '0.6rem 0.75rem',
                  background: '#020617',
                  color: '#e5e7eb',
                  fontSize: '0.9rem',
                }}
              />
              <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>kcal</span>
            </div>
          </label>

          <button
            type="submit"
            style={{
              marginTop: '0.5rem',
              width: '100%',
              borderRadius: '0.9rem',
              border: 'none',
              padding: '0.7rem 1.1rem',
              background:
                'linear-gradient(135deg, #f97373, #fb7185)',
              color: '#0b0b10',
              fontWeight: 700,
              fontSize: '0.95rem',
            }}
          >
            Valider le repas
          </button>
        </form>
      </div>
    </div>
  );
}

