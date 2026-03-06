'use client';

import React from 'react';
import type { OnboardingAnswers } from '../lib/onboarding-context';
import type { Douleur } from '../lib/onboarding-context';

const QUESTION_STEPS: Array<{
  key: keyof OnboardingAnswers;
  label: string;
  type: 'options' | 'number' | 'text';
  multi?: boolean;
  options?: { value: string; label: string }[];
}> = [
  { key: 'sexe', label: 'Tu es ?', type: 'options', options: [{ value: 'homme', label: 'Homme' }, { value: 'femme', label: 'Femme' }] },
  { key: 'age', label: 'Ton âge ?', type: 'number' },
  { key: 'taille', label: 'Taille (cm) ?', type: 'number' },
  { key: 'poids', label: 'Poids actuel (kg) ?', type: 'number' },
  { key: 'poidsCible', label: 'Poids cible (kg) ?', type: 'number' },
  { key: 'dateObjectif', label: "Date à laquelle tu veux l'atteindre (AAAA-MM-JJ) ?", type: 'text' },
  {
    key: 'activite',
    label: "Niveau d'activité ?",
    type: 'options',
    options: [
      { value: 'sedentaire', label: 'Sédentaire' },
      { value: 'actif', label: 'Actif' },
      { value: 'tres_actif', label: 'Très actif' },
    ],
  },
  {
    key: 'experience',
    label: 'Niveau en muscu ?',
    type: 'options',
    options: [
      { value: 'debutant', label: 'Débutant' },
      { value: 'intermediaire', label: 'Intermédiaire' },
      { value: 'avance', label: 'Avancé' },
    ],
  },
  { key: 'frequence', label: 'Séances par semaine (1-6) ?', type: 'number' },
  {
    key: 'douleurs',
    label: 'Des douleurs ou limitations ?',
    type: 'options',
    multi: true,
    options: [
      { value: 'none', label: 'Aucune douleur' },
      { value: 'dos', label: 'Dos' },
      { value: 'genoux', label: 'Genoux' },
      { value: 'epaules', label: 'Épaules' },
      { value: 'poignets', label: 'Poignets' },
      { value: 'autre', label: 'Autre' },
    ],
  },
];

type OnboardingFormProps = {
  answers: OnboardingAnswers;
  setAnswer: (key: keyof OnboardingAnswers, value: OnboardingAnswers[keyof OnboardingAnswers]) => void;
  step: number;
  nextStep: () => void;
  prevStep: () => void;
  completeOnboarding: () => void;
};

export function OnboardingForm(props: OnboardingFormProps) {
  const { answers, setAnswer, step, nextStep, prevStep, completeOnboarding } = props;
  const totalSteps = QUESTION_STEPS.length;
  const current = QUESTION_STEPS[step];
  const currentAnswer = current ? (answers[current.key] as unknown) : undefined;

  const handleSelect = (key: keyof OnboardingAnswers, value: string) => {
    if (key === 'douleurs') {
      const prev = answers.douleurs;
      const list = Array.isArray(prev) ? prev : [];
      if (value === 'none') {
        setAnswer('douleurs', []);
        return;
      }
      const next = list.includes(value as Douleur) ? list.filter((x) => x !== value) : [...list, value as Douleur];
      setAnswer('douleurs', next);
      return;
    }
    setAnswer(key, value as never);
  };

  const handleNext = () => {
    if (step >= totalSteps - 1) {
      completeOnboarding();
    } else {
      nextStep();
    }
  };

  if (!current) {
    return null;
  }

  const containerStyle = { maxWidth: 520, margin: '0 auto', padding: '1.5rem 1.25rem' };

  const questionLabel = React.createElement(
    'p',
    { style: { color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' } },
    `Question ${step + 1} / ${totalSteps}`,
  );
  const title = React.createElement(
    'h2',
    { style: { fontSize: '1.35rem', fontWeight: 700, marginBottom: '1.25rem' } },
    current.label,
  );

  let inputBlock: React.ReactNode = null;
  if (current.type === 'number') {
    inputBlock = React.createElement('input', {
      type: 'number',
      value: currentAnswer != null ? String(currentAnswer) : '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        const num = v === '' ? null : parseFloat(v.replace(',', '.'));
        setAnswer(current.key, (Number.isNaN(num) ? null : num) as never);
      },
      placeholder: 'Ex: 75',
      style: {
        width: '100%',
        borderRadius: '0.75rem',
        border: '1px solid #374151',
        padding: '0.7rem 0.9rem',
        background: '#020617',
        color: '#e5e7eb',
        fontSize: '1rem',
      },
    });
  } else if (current.type === 'text') {
    inputBlock = React.createElement('input', {
      type: 'text',
      value: currentAnswer != null ? String(currentAnswer) : '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAnswer(current.key, e.target.value as never),
      placeholder: 'Ex: 2025-06-01',
      style: {
        width: '100%',
        borderRadius: '0.75rem',
        border: '1px solid #374151',
        padding: '0.7rem 0.9rem',
        background: '#020617',
        color: '#e5e7eb',
        fontSize: '1rem',
      },
    });
  } else if (current.type === 'options' && current.options) {
    const buttons = current.options.map((opt) => {
      const selected =
        current.key === 'douleurs'
          ? Array.isArray(currentAnswer)
            ? opt.value === 'none'
              ? (currentAnswer as Douleur[]).length === 0
              : (currentAnswer as Douleur[]).includes(opt.value as Douleur)
            : currentAnswer === opt.value
          : currentAnswer === opt.value;
      return React.createElement(
        'button',
        {
          key: opt.value,
          type: 'button',
          onClick: () => handleSelect(current.key, opt.value),
          style: {
            borderRadius: '0.75rem',
            border: selected ? '1px solid rgba(248,113,113,0.9)' : '1px solid #374151',
            background: selected ? 'rgba(248,113,113,0.1)' : 'transparent',
            color: selected ? '#fecaca' : '#e5e7eb',
            padding: '0.65rem 0.9rem',
            fontSize: '0.95rem',
            textAlign: 'left',
          },
        },
        current.key === 'douleurs' ? `${selected ? '✓' : '○'} ${opt.label}` : opt.label,
      );
    });
    inputBlock = React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' } },
      ...buttons,
    );
  }

  const prevButton =
    step > 0
      ? React.createElement(
          'button',
          {
            type: 'button',
            onClick: prevStep,
            style: {
              borderRadius: '0.75rem',
              border: '1px solid #374151',
              background: 'transparent',
              color: '#9ca3af',
              padding: '0.6rem 1rem',
              fontSize: '0.9rem',
            },
          },
          'Précédent',
        )
      : null;
  const nextButton = React.createElement(
    'button',
    {
      type: 'button',
      onClick: handleNext,
      style: {
        flex: 1,
        borderRadius: '0.75rem',
        border: 'none',
        padding: '0.6rem 1rem',
        background: 'linear-gradient(135deg, #f97373, #fb7185)',
        color: '#0b0b10',
        fontWeight: 700,
        fontSize: '0.9rem',
      },
    },
    step >= totalSteps - 1 ? "C'est parti" : 'Suivant',
  );
  const buttonsRow = React.createElement(
    'div',
    { style: { display: 'flex', gap: '0.75rem', marginTop: '1.5rem' } },
    prevButton,
    nextButton,
  );

  return React.createElement(
    'div',
    { style: containerStyle },
    questionLabel,
    title,
    inputBlock,
    buttonsRow,
  );
}
