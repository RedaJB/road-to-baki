'use client';

import React, { useState, useCallback } from 'react';
import type { BakiAnswers } from '../lib/baki-flow-context';

const BAKI_QUESTIONS: Array<
  | { key: 'pointFaible' | 'objectif' | 'tempsMax'; label: string; options: { value: string; label: string }[] }
  | { key: 'poids' | 'taille'; label: string; type: 'number'; placeholder: string; min: number; max: number }
> = [
  {
    key: 'pointFaible' as const,
    label: 'Point faible actuel ?',
    options: [
      { value: 'pectoraux' as const, label: 'Pectoraux' },
      { value: 'dos' as const, label: 'Dos / Epaisseur' },
      { value: 'jambes' as const, label: 'Jambes' },
      { value: 'bras' as const, label: 'Bras' },
    ],
  },
  {
    key: 'objectif' as const,
    label: 'Objectif ultime ?',
    options: [
      { value: 'force' as const, label: 'Force pure' },
      { value: 'hypertrophie' as const, label: 'Hypertrophie' },
      { value: 'seche' as const, label: 'Seche' },
    ],
  },
  {
    key: 'tempsMax',
    label: 'Temps max par seance ?',
    options: [
      { value: '45min', label: '45 min' },
      { value: '1h15', label: '1h15' },
      { value: '2h+', label: '2h+' },
    ],
  },
  { key: 'poids', label: 'Ton poids (kg) ?', type: 'number', placeholder: '75', min: 30, max: 300 },
  { key: 'taille', label: 'Ta taille (cm) ?', type: 'number', placeholder: '175', min: 100, max: 250 },
];

type Props = {
  answers: BakiAnswers;
  setAnswer: <K extends keyof BakiAnswers>(key: K, value: BakiAnswers[K]) => void;
  step: number;
  nextStep: () => void;
  prevStep: () => void;
  onLaunchAnalysis: () => void;
};

export function BakiOnboardingForm(props: Props) {
  const { answers, setAnswer, step, nextStep, prevStep, onLaunchAnalysis } = props;
  const [shake, setShake] = useState(false);
  const totalSteps = BAKI_QUESTIONS.length;
  const current = BAKI_QUESTIONS[step];
  const currentAnswer = current ? answers[current.key] : undefined;
  const isNumStep = current && 'type' in current && current.type === 'number';
  const numVal = typeof currentAnswer === 'number' ? currentAnswer : null;
  const isValid = isNumStep ? (numVal != null && numVal >= (current as { min: number }).min && numVal <= (current as { max: number }).max) : !!currentAnswer;
  const isLastStep = step >= totalSteps - 1;

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }, []);

  const handleNext = useCallback(() => {
    if (!isValid && !isLastStep) {
      triggerShake();
      return;
    }
    if (isLastStep) {
      onLaunchAnalysis();
    } else {
      nextStep();
    }
  }, [isValid, isLastStep, nextStep, onLaunchAnalysis, triggerShake]);

  if (!current) return null;

  return (
    <div
      className={shake ? 'animate-shake' : ''}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem',
        background: 'var(--bg)',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: 'var(--border)',
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${((step + 1) / totalSteps) * 100}%`,
            background: 'var(--accent)',
            borderRadius: '0 4px 4px 0',
            transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 400, margin: '0 auto', width: '100%', paddingTop: '2rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-impact)',
            fontSize: '1.4rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '1.5rem',
            lineHeight: 1.3,
            textAlign: 'center',
            color: 'var(--text)',
          }}
        >
          {current.label}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
          {isNumStep ? (
            <input
              type="number"
              inputMode="decimal"
              value={numVal ?? ''}
              onChange={(e) => {
                const v = e.target.value ? parseFloat(e.target.value.replace(',', '.')) : null;
                setAnswer(current.key as 'poids' | 'taille', v);
              }}
              placeholder={(current as { placeholder: string }).placeholder}
              min={(current as { min: number }).min}
              max={(current as { max: number }).max}
              className="input"
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
              autoFocus
            />
          ) : (
            (current as { options: { value: string; label: string }[] }).options.map((opt) => {
              const selected = currentAnswer === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAnswer(current.key as 'pointFaible' | 'objectif' | 'tempsMax', opt.value)}
                  className={selected ? 'chipActive' : 'chip'}
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    fontSize: '0.95rem',
                    textAlign: 'left',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {opt.label}
                </button>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {step > 0 && (
            <button type="button" className="btnSecondary" onClick={prevStep} style={{ padding: '1rem 1.5rem', fontSize: '1rem', flex: 0 }}>
              Retour
            </button>
          )}
          <button
            type="button"
            className="btnPrimary"
            onClick={handleNext}
            style={{ flex: 1, padding: '1rem 1.5rem', fontSize: '1rem', opacity: isValid ? 1 : 0.6, cursor: 'pointer' }}
          >
            {isLastStep ? "Lancer l'Analyse IA" : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  );
}
