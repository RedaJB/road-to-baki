'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Footprints, Droplets, Timer, Play, RotateCcw, Plus, Clock } from 'lucide-react';
import { useNutrition } from '../lib/nutrition-context';
import { useOnboarding } from '../lib/onboarding-context';
import { useApp, FASTING_PLANS_UI } from '../lib/app-context';
import { useStreak } from '../lib/streak-context';
import { useTraining } from '../lib/training-context';
import { useCustomization } from '../lib/customization-context';
import { useToast } from '../lib/toast-context';
import { useTodaySession } from '../lib/use-today-session';
import { useGoals } from '../lib/use-goals';
import { estimateMinutes } from '../lib/programs';
import { getLook } from '../lib/fighters';
import { todayISO } from '../lib/streak';
import { VERRE_ML } from '../lib/water';
import { FighterIllustration } from './fx/Fighters';
import { FighterAvatar } from './fx/Visuals';
import { StepsSyncHint } from './StepsSyncHint';
import { Menace, SpeedLines } from './fx/Manga';
import { Sheet, Tile, WeekStrip } from './ui';
import { FastingTimer } from './FastingTimer';
import { PaywallBottomSheet } from './PaywallBottomSheet';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Encore debout';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Salut';
  return 'Bonsoir';
}

function fmtHours(h: number) {
  const m = Math.max(0, Math.floor(h * 60));
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}

interface JournalTabProps {
  onGoToGraille?: () => void;
  onGoToTraining?: () => void;
  onStartWorkout?: () => void;
}

export function JournalTab({ onGoToGraille, onGoToTraining, onStartWorkout }: JournalTabProps) {
  const today = todayISO();
  const { getTotalCaloriesForDate } = useNutrition();
  const { answers } = useOnboarding();
  const { waterIntakeByDate, addWater, stepsByDate, setSteps, isPremium, setPremium, fastingStartedAt, fastingMode } = useApp();
  const { trainingStreak } = useStreak();
  const { logs } = useTraining();
  const custom = useCustomization();
  const { toast } = useToast();
  const { day, block, exercises, trainedToday } = useTodaySession();
  const goals = useGoals();

  const [stepsOpen, setStepsOpen] = useState(false);
  const [stepsDraft, setStepsDraft] = useState('');
  const [fastOpen, setFastOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const kcal = getTotalCaloriesForDate(today);
  const water = waterIntakeByDate[today] ?? 0;
  const steps = stepsByDate[today] ?? 0;
  const fastGoal = FASTING_PLANS_UI[fastingMode === 'none' ? '16-8' : fastingMode].hoursFast;
  const fastElapsed = fastingStartedAt ? (Date.now() - fastingStartedAt) / 3_600_000 : 0;
  const avatarId = getLook(custom.avatar ?? answers.shonenArchetype).id;
  const doneDates = Array.from(new Set(logs.map((l) => l.date)));
  // chaque séance est un chapitre, chaque bloc de 4 semaines un arc
  const chapter = logs.length + (trainedToday ? 0 : 1);

  const saveSteps = () => {
    const n = parseInt(stepsDraft, 10);
    if (!Number.isNaN(n) && n >= 0) {
      setSteps(today, n);
      setStepsOpen(false);
    }
  };

  return (
    <section className="screen">
      {/* En-tête */}
      <header className="screenHead">
        <FighterAvatar id={avatarId} size={42} rounded="50%" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="screenHead__title" style={{ fontSize: '1.25rem' }}>
            {greeting()}
            {custom.pseudo ? `, ${custom.pseudo}` : ''}
          </p>
          <p className="screenHead__sub" style={{ textTransform: 'capitalize' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {trainingStreak > 0 && (
          <span className="tag tag--accent" title="Jours d’entraînement d’affilée">
            <Flame size={12} /> {trainingStreak} j
          </span>
        )}
      </header>

      {/* Séance du jour */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel grow mPanel"
        style={{ padding: 0, overflow: 'hidden', display: 'flex', minHeight: 190, maxHeight: 260 }}
      >
        <SpeedLines at="78% 58%" />
        {trainingStreak >= 2 && !trainedToday && <Menace style={{ top: 12, right: 14 }} />}
        <div style={{ flex: 1, minWidth: 0, padding: '1rem 0 1rem 1rem', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          <button type="button" onClick={onGoToTraining} style={{ all: 'unset', cursor: 'pointer' }}>
            <p className="eyebrow">
              Arc {block.cycle + 1} · Chapitre {chapter}
            </p>
            <h1 className="mangaTitle" style={{ fontSize: 'clamp(1.45rem, 6.6vw, 1.85rem)', margin: '0.35rem 0 0.3rem' }}>
              {day.name}
            </h1>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={12} /> ~{estimateMinutes(exercises)} min · {exercises.length} exercices
            </p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{day.focus}</p>
          </button>
          <div style={{ marginTop: 'auto', paddingTop: '0.8rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onStartWorkout}
              className="btnFight"
              style={{
                width: 'auto',
                padding: '0.75rem 1.1rem',
                fontSize: '0.95rem',
                background: trainedToday ? 'rgba(255,255,255,0.08)' : undefined,
                color: trainedToday ? 'var(--text)' : undefined,
              }}
            >
              {trainedToday ? (
                <>
                  <RotateCcw size={16} /> Refaire
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" /> Lancer
                </>
              )}
            </motion.button>
            {trainedToday && <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>✓ Faite</span>}
          </div>
        </div>
        <div style={{ width: '46%', maxWidth: 200, alignSelf: 'flex-end', marginLeft: -12, flexShrink: 0 }}>
          <FighterIllustration id={avatarId} size="100%" bare rounded="0" />
        </div>
      </motion.div>

      {/* Tuiles du jour */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Tile
          icon={<Flame size={15} />}
          label="Calories"
          value={
            <>
              {Math.round(kcal)}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> / {goals.calories}</span>
            </>
          }
          pct={kcal / goals.calories}
          onClick={onGoToGraille}
        />
        <Tile
          icon={<Droplets size={15} />}
          label="Eau"
          color="#4d9fe0"
          value={
            <>
              {(water / 1000).toFixed(1).replace('.', ',')}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> / {(goals.waterMl / 1000).toFixed(1).replace('.', ',')} L</span>
            </>
          }
          pct={water / goals.waterMl}
          action={
            <button
              type="button"
              className="tileBtn"
              aria-label="Ajouter un verre d’eau"
              onClick={() => {
                addWater(today, VERRE_ML);
                toast('+250 ml');
              }}
            >
              <Plus size={14} />
            </button>
          }
        />
        <Tile
          icon={<Footprints size={15} />}
          label="Pas"
          color="#4caf7d"
          value={steps.toLocaleString('fr-FR')}
          pct={steps / goals.steps}
          onClick={() => {
            setStepsDraft(String(steps || ''));
            setStepsOpen(true);
          }}
        />
        <Tile
          icon={<Timer size={15} />}
          label="Jeûne"
          color="#e09a45"
          value={fastingStartedAt ? fmtHours(fastElapsed) : `${fastGoal}h`}
          sub={fastingStartedAt ? (fastElapsed >= fastGoal ? 'Objectif atteint' : `objectif ${fastGoal}h`) : 'Appuie pour démarrer'}
          pct={fastingStartedAt ? fastElapsed / fastGoal : undefined}
          onClick={() => setFastOpen(true)}
        />
      </div>

      {/* Semaine */}
      <div className="panel" style={{ padding: '0.75rem 0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="tile__label">Cette semaine</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>objectif {answers.frequence ?? 3} séances</span>
        </div>
        <WeekStrip doneDates={doneDates} />
      </div>

      <Sheet open={stepsOpen} onClose={() => setStepsOpen(false)} title="Pas du jour">
        <input
          className="input ob-input"
          inputMode="numeric"
          autoFocus
          value={stepsDraft}
          onChange={(e) => setStepsDraft(e.target.value.replace(/[^\d]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && saveSteps()}
          placeholder="Ex : 8500"
        />
        <div style={{ display: 'flex', gap: 6, margin: '0.7rem 0 1rem' }}>
          {[1000, 2000, 5000].map((n) => (
            <button key={n} type="button" className="chip" onClick={() => setStepsDraft(String((parseInt(stepsDraft || '0', 10) || 0) + n))}>
              +{n.toLocaleString('fr-FR')}
            </button>
          ))}
        </div>
        <button type="button" className="btnFight" onClick={saveSteps}>
          Enregistrer
        </button>
        <StepsSyncHint />
      </Sheet>

      <Sheet open={fastOpen} onClose={() => setFastOpen(false)} title="Jeûne">
        <FastingTimer isPremium={isPremium} onUnlockPremium={() => setPaywallOpen(true)} />
      </Sheet>

      <PaywallBottomSheet isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} onUnlock={() => setPremium(true)} />
    </section>
  );
}
