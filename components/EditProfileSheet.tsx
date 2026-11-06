'use client';

import React, { useState } from 'react';
import { useOnboarding } from '../lib/onboarding-context';
import { useApp } from '../lib/app-context';
import type { Douleur } from '../lib/onboarding-context';

const ACTIVITE_OPTS = [
  { value: 'sedentaire', label: 'Sédentaire' },
  { value: 'actif', label: 'Actif' },
  { value: 'tres_actif', label: 'Très actif' },
];
const EXPERIENCE_OPTS = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
];
const DOULEUR_OPTS = [
  { value: 'none', label: 'Aucune' },
  { value: 'dos', label: 'Dos' },
  { value: 'genoux', label: 'Genoux' },
  { value: 'epaules', label: 'Épaules' },
  { value: 'poignets', label: 'Poignets' },
  { value: 'autre', label: 'Autre' },
];

export function EditProfileSheet({ onClose }: { onClose: () => void }) {
  const { answers, setAnswer } = useOnboarding();
  const { setDouleurs, addWeight } = useApp();
  const [localSexe, setLocalSexe] = useState(answers.sexe);
  const [localAge, setLocalAge] = useState(String(answers.age ?? ''));
  const [localTaille, setLocalTaille] = useState(String(answers.taille ?? ''));
  const [localPoids, setLocalPoids] = useState(String(answers.poids ?? ''));
  const [localPoidsCible, setLocalPoidsCible] = useState(String(answers.poidsCible ?? ''));
  const [localDateObjectif, setLocalDateObjectif] = useState(answers.dateObjectif ?? '');
  const douleursList = answers.douleurs ?? [];

  const handleSave = () => {
    setAnswer('sexe', localSexe);
    setAnswer('age', localAge ? parseInt(localAge, 10) : null);
    setAnswer('taille', localTaille ? parseInt(localTaille, 10) : null);
    const newPoids = localPoids ? parseFloat(localPoids.replace(',', '.')) : null;
    setAnswer('poids', newPoids);
    if (newPoids && newPoids !== answers.poids && newPoids >= 30 && newPoids <= 300) addWeight(newPoids);
    setAnswer('poidsCible', localPoidsCible ? parseFloat(localPoidsCible.replace(',', '.')) : null);
    setAnswer('dateObjectif', localDateObjectif || null);
    setDouleurs(answers.douleurs ?? []);
    onClose();
  };

  const handleDouleur = (value: string) => {
    if (value === 'none') {
      setAnswer('douleurs', []);
      return;
    }
    const list = douleursList.includes(value as Douleur) ? douleursList.filter((x) => x !== value) : [...douleursList, value as Douleur];
    setAnswer('douleurs', list);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 120,
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'linear-gradient(180deg, #17171c 0%, #0c0c0f 100%)',
          borderTop: '1px solid rgba(var(--accent-rgb), 0.4)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: '1.5rem',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="mangaTitle" style={{ fontSize: '1.6rem' }}>Modifier le profil</h2>
          <button type="button" className="btnSecondary" onClick={onClose}>Fermer</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="sectionLabel">Sexe</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
              {(['homme', 'femme'] as const).map((v) => (
                <button key={v} type="button" className={localSexe === v ? 'chipActive' : 'chip'} onClick={() => setLocalSexe(v)}>
                  {v === 'homme' ? 'Homme' : 'Femme'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="sectionLabel">Âge</label>
            <input type="number" value={localAge} onChange={(e) => setLocalAge(e.target.value)} placeholder="Ex: 28" className="input" style={{ width: '100%', marginTop: '0.35rem' }} />
          </div>
          <div>
            <label className="sectionLabel">Taille (cm)</label>
            <input type="number" value={localTaille} onChange={(e) => setLocalTaille(e.target.value)} placeholder="Ex: 175" className="input" style={{ width: '100%', marginTop: '0.35rem' }} />
          </div>
          <div>
            <label className="sectionLabel">Poids actuel (kg)</label>
            <input type="number" value={localPoids} onChange={(e) => setLocalPoids(e.target.value)} placeholder="Ex: 75" className="input" style={{ width: '100%', marginTop: '0.35rem' }} />
          </div>
          <div>
            <label className="sectionLabel">Poids cible (kg)</label>
            <input type="number" value={localPoidsCible} onChange={(e) => setLocalPoidsCible(e.target.value)} placeholder="Ex: 70" className="input" style={{ width: '100%', marginTop: '0.35rem' }} />
          </div>
          <div>
            <label className="sectionLabel">Date objectif</label>
            <input type="date" value={localDateObjectif} onChange={(e) => setLocalDateObjectif(e.target.value)} className="input" style={{ width: '100%', marginTop: '0.35rem' }} />
          </div>
          <div>
            <label className="sectionLabel">Activité</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
              {ACTIVITE_OPTS.map((opt) => (
                <button key={opt.value} type="button" className={answers.activite === opt.value ? 'chipActive' : 'chip'} onClick={() => setAnswer('activite', opt.value as never)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="sectionLabel">Niveau muscu</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
              {EXPERIENCE_OPTS.map((opt) => (
                <button key={opt.value} type="button" className={answers.experience === opt.value ? 'chipActive' : 'chip'} onClick={() => setAnswer('experience', opt.value as never)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="sectionLabel">Séances / semaine</label>
            <input type="number" min={1} max={6} value={String(answers.frequence ?? '')} onChange={(e) => setAnswer('frequence', e.target.value ? parseInt(e.target.value, 10) : null)} placeholder="Ex: 3" className="input" style={{ width: '100%', marginTop: '0.35rem' }} />
          </div>
          <div>
            <label className="sectionLabel">Douleurs / limitations</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
              {DOULEUR_OPTS.map((opt) => {
                const selected = opt.value === 'none' ? !douleursList.length : douleursList.includes(opt.value as Douleur);
                return (
                  <button key={opt.value} type="button" className={selected ? 'chipActive' : 'chip'} onClick={() => handleDouleur(opt.value)}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="button" className="btnFight" style={{ marginTop: '0.5rem', animation: 'none' }} onClick={handleSave}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
