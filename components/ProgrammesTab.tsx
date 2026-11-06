'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Clock, ChevronDown, Home, Building2, SlidersHorizontal, History, Repeat, Timer, Dumbbell } from 'lucide-react';
import { useTraining } from '../lib/training-context';
import { useOnboarding } from '../lib/onboarding-context';
import { useCustomization, useFx } from '../lib/customization-context';
import { useStreak } from '../lib/streak-context';
import { estimateMinutes, PLAN_ID, type SessionExercise } from '../lib/programs';
import { useTodaySession } from '../lib/use-today-session';
import { Sheet, WeekStrip } from './ui';
import { Demo3D } from './Demo3D';
import { Narration } from './fx/Manga';

const GOALS = [
  { v: 'prendre_muscle', label: 'Prendre du muscle' },
  { v: 'maigrir', label: 'Perdre du gras' },
  { v: 'recomposition', label: 'Les deux' },
  { v: 'forme', label: 'Être en forme' },
] as const;

const INTENSITIES = [
  { v: 0.8, label: 'Récup', desc: 'Volume réduit' },
  { v: 1, label: 'Normal', desc: 'Le programme tel quel' },
  { v: 1.2, label: 'Intense', desc: '+20 % de répétitions' },
];

function ExerciseRow({ ex, index }: { ex: SessionExercise; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="listRow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0, cursor: 'pointer' }} onClick={() => setOpen((o) => !o)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="rowIcon" style={{ width: 28, height: 28, borderRadius: 8, fontFamily: 'var(--font-impact)', fontSize: '0.9rem', color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.12)' }}>
          {index + 1}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="rowTitle" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.name}</span>
            {ex.swapped && <Repeat size={11} color="var(--accent)" aria-label="Adapté pour toi" />}
          </p>
          <p className="rowSub">
            {ex.muscle}
            {ex.note ? ` · ${ex.note}` : ''}
          </p>
        </div>
        <span className="statNum" style={{ fontSize: '1rem', whiteSpace: 'nowrap' }}>
          {ex.sets}×{ex.repsMax > ex.reps ? `${ex.reps}-${ex.repsMax}` : ex.reps}
          {ex.kind === 'sec' ? 's' : ''}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: 'flex', color: 'var(--text-muted)' }}>
          <ChevronDown size={15} />
        </motion.span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ listStyle: 'none', margin: 0, padding: '0.45rem 0 0.1rem 2.4rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 3 }}
            onClick={(e) => e.stopPropagation()}
          >
            <li style={{ marginLeft: '-2.4rem', marginBottom: 6 }}>
              <Demo3D exerciseId={ex.id} height={170} />
            </li>
            {ex.cues.map((c) => (
              <li key={c} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent)', marginRight: 6 }}>•</span>
                {c}
              </li>
            ))}
            <li style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Timer size={11} /> {ex.rest} s de repos
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ProgrammesTab({ onStartWorkout }: { onStartWorkout: (dayIndex: number) => void }) {
  const { setNextDay, logs } = useTraining();
  const { answers, setAnswer } = useOnboarding();
  const { intensity, update } = useCustomization();
  const { trainingStreak } = useStreak();
  const fx = useFx();
  const [previewDay, setPreviewDay] = useState<number | null>(null);
  const [sheet, setSheet] = useState<'settings' | 'history' | null>(null);

  const { program, dayIndex, days, day, block, exercises, trainedToday } = useTodaySession(previewDay ?? undefined);
  const minutes = estimateMinutes(exercises);
  const totalSets = exercises.reduce((s, e) => s + e.sets, 0);
  const doneDates = Array.from(new Set(logs.map((l) => l.date)));
  const totalMin = Math.round(logs.reduce((s, l) => s + l.durationSec, 0) / 60);
  const totalVolume = logs.reduce((s, l) => s + l.volume, 0);

  return (
    <section className="screen">
      {/* Programme personnalisé */}
      <header className="screenHead" style={{ gap: 12 }}>
        <button type="button" onClick={() => setSheet('settings')} style={{ all: 'unset', display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }}>
          <span className="rowIcon" style={{ width: 52, height: 52, borderRadius: 14, color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.12)' }}>
            <Dumbbell size={24} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="screenHead__title" style={{ display: 'block', fontSize: '1.3rem' }}>
              {program.title}
            </span>
            <span style={{ display: 'block', marginTop: 3, fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{program.tagline}</span>
          </span>
        </button>
        <button type="button" className="iconBtn" onClick={() => setSheet('settings')} aria-label="Réglages de l’entraînement">
          <SlidersHorizontal size={17} />
        </button>
        <button type="button" className="iconBtn" onClick={() => setSheet('history')} aria-label="Carnet d’entraînement">
          <History size={17} />
        </button>
      </header>

      {/* Bloc de 4 semaines */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.55rem 0.75rem', borderRadius: 12, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', gap: 3 }} aria-label={`Semaine ${block.week} sur 4`}>
          {[1, 2, 3, 4].map((w) => (
            <span key={w} style={{ width: 14, height: 5, borderRadius: 3, background: w <= block.week ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
        <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.3, minWidth: 0 }}>
          <Narration style={{ marginRight: 6, verticalAlign: '1px' }}>
            Arc {block.cycle + 1} · {block.label}
          </Narration>
          <strong style={{ color: 'var(--text)' }}>Semaine {block.week}/4</strong> — {block.hint}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`, gap: 6 }}>
        {days.map((d, i) => {
          const sel = i === dayIndex;
          return (
            <motion.button
              key={i}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                fx('tap');
                setPreviewDay(i);
              }}
              style={{
                padding: '0.5rem 0.3rem',
                borderRadius: 12,
                border: sel ? '1.5px solid var(--accent)' : '1px solid rgba(255,255,255,0.07)',
                background: sel ? 'rgba(var(--accent-rgb),0.12)' : 'var(--surface)',
                color: sel ? 'var(--accent)' : 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <span className="jp" style={{ fontSize: '1.05rem', lineHeight: 1.1 }}>{d.kanji}</span>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em' }}>JOUR {i + 1}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Séance */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${program.id}-${dayIndex}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="panel grow mPanel"
          style={{ display: 'flex', flexDirection: 'column', padding: '0.85rem 0.95rem 0.4rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-impact)', fontSize: '1.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{day.name}</h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {day.focus} · <Clock size={10} style={{ verticalAlign: '-1px' }} /> ~{minutes} min · {totalSets} séries
              </p>
            </div>
            {trainedToday && previewDay === null && <span className="tag tag--accent">✓ Fait</span>}
          </div>
          <div className="scrollY" style={{ flex: 1, minHeight: 0, marginTop: 6 }}>
            {exercises.map((ex, i) => (
              <ExerciseRow key={`${ex.id}-${i}`} ex={ex} index={i} />
            ))}
            {day.finisher && (
              <p style={{ margin: '0.5rem 0 0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Finisher · {day.finisher.name}</strong> — {day.finisher.desc}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        className="btnFight"
        onClick={() => {
          if (previewDay !== null) setNextDay(PLAN_ID, dayIndex);
          onStartWorkout(dayIndex);
        }}
      >
        <Play size={18} fill="currentColor" /> {trainedToday ? 'Séance bonus' : 'Lancer la séance'}
      </motion.button>

      {/* ── Réglages ── */}
      <Sheet open={sheet === 'settings'} onClose={() => setSheet(null)} title="Mon programme">
        <p className="tile__label" style={{ marginBottom: 8 }}>Objectif</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: '1.1rem' }}>
          {GOALS.map((g) => (
            <button key={g.v} type="button" className="ob-tile" data-selected={answers.objectifPrincipal === g.v} onClick={() => setAnswer('objectifPrincipal', g.v)} style={{ padding: '0.6rem 0.7rem' }}>
              <span className="ob-option__label" style={{ fontSize: '0.86rem' }}>{g.label}</span>
            </button>
          ))}
        </div>
        <p className="tile__label" style={{ marginBottom: 8 }}>Séances par semaine</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: '1.1rem' }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button key={n} type="button" className="ob-tile" data-selected={(answers.frequence ?? 3) === n} onClick={() => setAnswer('frequence', n)} style={{ padding: '0.55rem 0', alignItems: 'center' }}>
              <span className="ob-option__label">{n}</span>
            </button>
          ))}
        </div>
        <p className="tile__label" style={{ marginBottom: 8 }}>Intensité</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: '1.1rem' }}>
          {INTENSITIES.map((it) => {
            const sel = Math.abs(intensity - it.v) < 0.01;
            return (
              <button key={it.v} type="button" className="ob-tile" data-selected={sel} onClick={() => update({ intensity: it.v })} style={{ padding: '0.7rem 0.6rem' }}>
                <span className="ob-option__label" style={{ fontSize: '0.88rem' }}>{it.label}</span>
                <span className="ob-option__desc">{it.desc}</span>
              </button>
            );
          })}
        </div>
        <p className="tile__label" style={{ marginBottom: 8 }}>Lieu</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {([
            { v: 'salle', label: 'Salle', desc: 'Matériel complet', Icon: Building2 },
            { v: 'maison', label: 'Maison', desc: 'Sans matériel', Icon: Home },
          ] as const).map((l) => (
            <button
              key={l.v}
              type="button"
              className="ob-tile"
              data-selected={(answers.trainingLocation ?? 'salle') === l.v}
              onClick={() => setAnswer('trainingLocation', l.v)}
              style={{ padding: '0.7rem' }}
            >
              <l.Icon size={18} />
              <span className="ob-option__label" style={{ marginTop: 6 }}>{l.label}</span>
              <span className="ob-option__desc">{l.desc}</span>
            </button>
          ))}
        </div>
        <p style={{ margin: '0.9rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Les exercices se mettent à jour tout de suite.</p>
      </Sheet>

      {/* ── Carnet ── */}
      <Sheet open={sheet === 'history'} onClose={() => setSheet(null)} title="Carnet">
        <WeekStrip doneDates={doneDates} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, margin: '0.9rem 0' }}>
          {[
            { v: logs.length, l: 'Séances' },
            { v: `${trainingStreak} j`, l: 'Série' },
            { v: totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)} t` : `${totalMin} min`, l: totalVolume >= 1000 ? 'Volume' : 'Temps' },
          ].map((s) => (
            <div key={s.l} className="tile" style={{ alignItems: 'center' }}>
              <span className="tile__value" style={{ marginTop: 0 }}>{s.v}</span>
              <span className="tile__label">{s.l}</span>
            </div>
          ))}
        </div>
        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: '1rem 0' }}>Aucune séance pour l’instant.</p>
        ) : (
          logs
            .slice(-8)
            .reverse()
            .map((l) => {
              return (
                <div key={l.id} className="listRow">
                  <span className="rowIcon" style={{ width: 36, height: 36, borderRadius: 10, color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.12)' }}>
                    <Dumbbell size={16} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="rowTitle">{l.dayName}</p>
                    <p className="rowSub">
                      {new Date(`${l.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {Math.round(l.durationSec / 60)} min · {l.setsDone}/{l.totalSets} séries
                    </p>
                  </div>
                  {l.volume > 0 && <span className="statNum" style={{ fontSize: '0.95rem' }}>{Math.round(l.volume)} kg</span>}
                </div>
              );
            })
        )}
      </Sheet>
    </section>
  );
}
