'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Minus, Plus, SkipForward, Check, ChevronDown, Trophy, Timer, Flame, Dumbbell, Play, Pause } from 'lucide-react';
import { sessionXp, suggestWeight, type Program, type ProgramDay, type SessionExercise } from '../lib/programs';
import { useTraining, type SetLog } from '../lib/training-context';
import { useApp } from '../lib/app-context';
import { useFx, useCustomization } from '../lib/customization-context';
import { todayISO } from '../lib/streak';
import { Ring, FighterAvatar } from './fx/Visuals';
import { getLook } from '../lib/fighters';
import { Burst } from './fx/LevelUpOverlay';
import { Demo3D } from './Demo3D';
import { Bubble, Narration, Ono, SpeedLines, useImpact } from './fx/Manga';

type Phase = 'countdown' | 'work' | 'rest' | 'done';

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function WorkoutSession({
  program,
  day,
  dayIndex,
  exercises,
  onClose,
}: {
  program: Program;
  day: ProgramDay;
  dayIndex: number;
  exercises: SessionExercise[];
  onClose: () => void;
}) {
  const { completeSession, lastWeightFor, prs, logs: history } = useTraining();
  const { setTrainingDoneForDate } = useApp();
  const avatarId = getLook(useCustomization().avatar).id;
  const fx = useFx();
  const { impact, impactNode } = useImpact();

  const [phase, setPhase] = useState<Phase>('countdown');
  const [count, setCount] = useState(3);
  const [exIdx, setExIdx] = useState(0);
  const [logs, setLogs] = useState<SetLog[][]>(() => exercises.map(() => []));
  const [reps, setReps] = useState(exercises[0]?.reps ?? 10);
  // charge de départ : double progression d'après la dernière séance de cet exercice
  const [weights, setWeights] = useState<number[]>(() =>
    exercises.map((e) => {
      if (!e.weighted) return 0;
      const last = [...history].reverse().find((l) => l.exercises.some((x) => x.id === e.id))?.exercises.find((x) => x.id === e.id);
      return suggestWeight(last?.sets, e.repsMax) ?? lastWeightFor(e.id) ?? 0;
    }),
  );
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(60);
  const [holdEndsAt, setHoldEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showCues, setShowCues] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const startedAt = useRef(Date.now());
  const [result, setResult] = useState<{ xp: number; newPrs: string[]; duration: number; volume: number; setsDone: number; totalSets: number } | null>(null);
  const lastTick = useRef<number>(-1);

  const ex = exercises[exIdx];
  const setsDoneHere = logs[exIdx]?.length ?? 0;
  const totalSets = useMemo(() => exercises.reduce((s, e) => s + e.sets, 0), [exercises]);
  const setsDone = logs.reduce((s, l) => s + l.length, 0);

  // Bloque le scroll de la page derrière
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Horloge commune
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);

  // Compte à rebours d'entrée
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) {
      fx('go');
      const t = window.setTimeout(() => {
        startedAt.current = Date.now();
        setPhase('work');
      }, 700);
      return () => window.clearTimeout(t);
    }
    fx('tick');
    const t = window.setTimeout(() => setCount((c) => c - 1), 800);
    return () => window.clearTimeout(t);
  }, [phase, count, fx]);

  const restLeft = restEndsAt ? (restEndsAt - now) / 1000 : 0;
  const holdLeft = holdEndsAt ? (holdEndsAt - now) / 1000 : 0;

  const finish = useCallback(
    (finalLogs: SetLog[][]) => {
      const done = finalLogs.reduce((s, l) => s + l.length, 0);
      const volume = finalLogs.reduce(
        (s, l) => s + l.reduce((a, set) => a + (set.weight ?? 0) * set.reps, 0),
        0,
      );
      const duration = Math.round((Date.now() - startedAt.current) / 1000);
      const xp = done > 0 ? sessionXp(done, totalSets) : 0;
      let newPrs: string[] = [];
      if (done > 0) {
        newPrs = completeSession({
          date: todayISO(),
          programId: program.id,
          dayIndex,
          dayName: day.name,
          durationSec: duration,
          setsDone: done,
          totalSets,
          volume,
          xp,
          exercises: exercises.map((e, i) => ({ id: e.id, name: e.name, kind: e.kind, sets: finalLogs[i] })).filter((e) => e.sets.length > 0),
        }).newPrs;
        setTrainingDoneForDate(todayISO(), true);
      }
      setResult({ xp, newPrs, duration, volume, setsDone: done, totalSets });
      setPhase('done');
      fx('victory');
    },
    [program, dayIndex, day, exercises, totalSets, completeSession, setTrainingDoneForDate, fx],
  );

  const goNextExercise = useCallback(
    (fromLogs: SetLog[][], withRest: boolean) => {
      const next = exIdx + 1;
      if (next >= exercises.length) {
        finish(fromLogs);
        return;
      }
      setExIdx(next);
      setReps(exercises[next].reps);
      setShowCues(false);
      if (withRest) {
        const r = exercises[exIdx].rest;
        setRestTotal(r);
        setRestEndsAt(Date.now() + r * 1000);
        setPhase('rest');
      }
    },
    [exIdx, exercises, finish],
  );

  const logSet = useCallback(
    (repsDone: number) => {
      if (!ex) return;
      const set: SetLog = { reps: repsDone, weight: ex.weighted && weights[exIdx] > 0 ? weights[exIdx] : undefined };
      const nextLogs = logs.map((l, i) => (i === exIdx ? [...l, set] : l));
      setLogs(nextLogs);
      fx('set');
      impact();
      setHoldEndsAt(null);
      if (nextLogs[exIdx].length >= ex.sets) {
        goNextExercise(nextLogs, true);
      } else {
        setRestTotal(ex.rest);
        setRestEndsAt(Date.now() + ex.rest * 1000);
        setPhase('rest');
      }
    },
    [ex, exIdx, logs, weights, fx, impact, goNextExercise],
  );

  // Fin du repos
  useEffect(() => {
    if (phase !== 'rest' || !restEndsAt) return;
    const left = Math.ceil((restEndsAt - now) / 1000);
    if (left <= 3 && left > 0 && lastTick.current !== left) {
      lastTick.current = left;
      fx('tick');
    }
    if (now >= restEndsAt) {
      lastTick.current = -1;
      fx('rest_end');
      setRestEndsAt(null);
      setPhase('work');
    }
  }, [phase, restEndsAt, now, fx]);

  // Fin d'un exercice tenu (secondes)
  useEffect(() => {
    if (!holdEndsAt || phase !== 'work') return;
    if (now >= holdEndsAt) logSet(ex.reps);
  }, [holdEndsAt, now, phase, ex, logSet]);

  const elapsed = phase === 'countdown' ? 0 : ((result ? startedAt.current + result.duration * 1000 : now) - startedAt.current) / 1000;
  const nextUp = setsDoneHere >= (ex?.sets ?? 0) ? exercises[exIdx] : ex;

  return (
    <div className="workout">
      {impactNode}
      {/* ── Compte à rebours ── */}
      <AnimatePresence>
        {phase === 'countdown' && (
          <motion.div className="countdown" exit={{ opacity: 0, scale: 1.4 }} transition={{ duration: 0.4 }}>
            <SpeedLines className="mSpeed--burst" style={{ opacity: 0.3 }} />
            <div style={{ position: 'relative', textAlign: 'center' }}>
              {count === 0 && <Ono text="ドン！" size="3.4rem" accent style={{ position: 'absolute', top: '-4.2rem', right: '-0.5rem' }} />}
              <p className="levelUp__jp" style={{ marginBottom: '0.5rem', letterSpacing: '0.08em', fontSize: '1.3rem', padding: '0 1rem' }}>{day.kanji} · {day.name}</p>
              <AnimatePresence mode="popLayout">
                <motion.p
                  key={count}
                  className="countdown__n"
                  initial={{ scale: 2.5, opacity: 0, rotate: -8 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                  style={{ margin: 0 }}
                >
                  {count > 0 ? count : 'FIGHT!'}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="workout__inner">
        {/* ── Barre du haut ── */}
        {phase !== 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <button type="button" className="iconBtn" onClick={() => setConfirmQuit(true)} aria-label="Quitter la séance">
              <X size={20} />
            </button>
            <div style={{ flex: 1, display: 'flex', gap: 4 }}>
              {exercises.map((e, i) => {
                const pct = Math.min(1, (logs[i]?.length ?? 0) / e.sets);
                return (
                  <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <motion.div
                      animate={{ width: `${pct * 100}%` }}
                      style={{ height: '100%', background: 'var(--accent)' }}
                    />
                  </div>
                );
              })}
            </div>
            <span style={{ fontFamily: 'var(--font-impact)', fontSize: '1rem', color: 'var(--text-secondary)', minWidth: 48, textAlign: 'right' }}>
              {fmt(elapsed)}
            </span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── TRAVAIL ── */}
          {phase === 'work' && ex && (
            <motion.div
              key={`work-${exIdx}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <p className="eyebrow">Exercice {exIdx + 1} / {exercises.length}</p>
              <h1 className="mangaTitle" style={{ fontSize: 'clamp(1.8rem, 8vw, 2.4rem)', margin: '0.3rem 0 0.5rem' }}>{ex.name}</h1>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
                <span className="tag">{ex.muscle}</span>
                {ex.swapped && <span className="tag tag--accent">Adapté pour toi</span>}
                {ex.note && <span className="tag">{ex.note}</span>}
                {prs[ex.id] && <span className="tag" style={{ color: '#fbbf24' }}>🏆 PR {prs[ex.id].weight} kg × {prs[ex.id].reps}</span>}
              </div>

              <div style={{ marginBottom: '0.8rem' }}>
                <Demo3D exerciseId={ex.id} height={190} />
              </div>

              {/* Cible */}
              <div className="panel panel--accent" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.1rem' }}>
                {ex.kind === 'sec' ? (
                  <Ring pct={holdEndsAt ? 1 - holdLeft / ex.reps : 0} size={118} stroke={10}>
                    <div>
                      <div className="statNum" style={{ fontSize: '2rem' }}>{holdEndsAt ? Math.ceil(holdLeft) : ex.reps}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>secondes</div>
                    </div>
                  </Ring>
                ) : (
                  <div style={{ textAlign: 'center', minWidth: 110 }}>
                    <div className="statNum accentText" style={{ fontSize: '3.4rem' }}>{ex.reps}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>reps cible</div>
                    {ex.repsMax > ex.reps && <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 2 }}>jusqu’à {ex.repsMax} si ça passe</div>}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Série {Math.min(setsDoneHere + 1, ex.sets)} / {ex.sets}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ex.sets}, 1fr)`, gap: 5 }}>
                    {Array.from({ length: ex.sets }, (_, i) => {
                      const done = i < setsDoneHere;
                      const current = i === setsDoneHere;
                      return (
                        <motion.div
                          key={i}
                          animate={done ? { scale: [1, 1.25, 1] } : {}}
                          style={{
                            height: 34,
                            borderRadius: 10,
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            background: done ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                            border: current ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                            color: done ? 'var(--on-accent)' : 'var(--text-muted)',
                            boxShadow: 'none',
                          }}
                        >
                          {done ? <Check size={16} strokeWidth={3} /> : i + 1}
                        </motion.div>
                      );
                    })}
                  </div>
                  <p style={{ margin: '0.55rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Timer size={13} /> Repos {ex.rest}s
                  </p>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {ex.rir >= 4 ? 'Facile : tu en garderais 4 sous le coude' : `Arrête-toi à ${ex.rir} rep${ex.rir > 1 ? 's' : ''} de l’échec`}
                  </p>
                </div>
              </div>

              {/* Réglages */}
              {ex.kind === 'reps' && (
                <div style={{ display: 'grid', gridTemplateColumns: ex.weighted ? '1fr 1fr' : '1fr', gap: '0.6rem', marginBottom: '1rem' }}>
                  <Stepper label="Reps faites" value={reps} step={1} min={0} onChange={setReps} suffix="" fx={() => fx('tap')} />
                  {ex.weighted && (
                    <Stepper
                      label="Charge"
                      value={weights[exIdx]}
                      step={2.5}
                      min={0}
                      onChange={(v) => setWeights((w) => w.map((x, i) => (i === exIdx ? v : x)))}
                      suffix="kg"
                      fx={() => fx('tap')}
                    />
                  )}
                </div>
              )}

              {/* Technique */}
              <button
                type="button"
                onClick={() => setShowCues((s) => !s)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                <motion.span animate={{ rotate: showCues ? 0 : -90 }} style={{ display: 'flex' }}><ChevronDown size={16} /></motion.span>
                Technique du maître
              </button>
              <AnimatePresence initial={false}>
                {showCues && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden', padding: '0 4px 4px 0', marginBottom: '1rem' }}
                  >
                    <Bubble who="Le maître">
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {ex.cues.map((c, i) => (
                          <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <span className="jp" style={{ color: 'var(--accent)', fontSize: '0.8rem', marginTop: 2 }}>{['一', '二', '三', '四'][i] ?? '・'}</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </Bubble>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {ex.kind === 'sec' ? (
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      type="button"
                      className="btnFight"
                      onClick={() => {
                        if (holdEndsAt) {
                          setHoldEndsAt(null);
                        } else {
                          fx('go');
                          setHoldEndsAt(Date.now() + ex.reps * 1000);
                        }
                      }}
                    >
                      {holdEndsAt ? <><Pause size={20} /> Pause</> : <><Play size={20} /> Lancer {ex.reps}s</>}
                    </button>
                    <button type="button" className="iconBtn" style={{ width: 58, height: 'auto', borderRadius: 16 }} onClick={() => logSet(holdEndsAt ? Math.round(ex.reps - holdLeft) : ex.reps)} aria-label="Valider la série">
                      <Check size={22} />
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btnFight" onClick={() => logSet(reps)}>
                    <Check size={22} strokeWidth={3} /> Série validée
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => goNextExercise(logs, false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.5rem' }}
                >
                  <SkipForward size={14} /> Passer cet exercice
                </button>
              </div>
            </motion.div>
          )}

          {/* ── REPOS ── */}
          {phase === 'rest' && (
            <motion.div
              key="rest"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
            >
              <p className="jp accentText" style={{ fontSize: '3rem', margin: 0, lineHeight: 1 }}>休</p>
              <Narration style={{ margin: '0.6rem 0 1.5rem' }}>Récupération · le corps se reforge</Narration>
              <Ring pct={restLeft / restTotal} size={230} stroke={14}>
                <div>
                  <motion.div key={Math.ceil(restLeft)} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="statNum" style={{ fontSize: '4.2rem' }}>
                    {fmt(restLeft)}
                  </motion.div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>sur {fmt(restTotal)}</div>
                </div>
              </Ring>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.6rem' }}>
                <button type="button" className="btnSecondary" onClick={() => setRestEndsAt((t) => (t ? Math.max(Date.now() + 1000, t - 15000) : t))}>−15s</button>
                <button type="button" className="btnSecondary" onClick={() => { setRestEndsAt((t) => (t ? t + 15000 : t)); setRestTotal((r) => r + 15); }}>+15s</button>
                <button type="button" className="btnPrimary" onClick={() => { setRestEndsAt(null); setPhase('work'); fx('go'); }}>
                  <SkipForward size={16} /> Go
                </button>
              </div>
              {nextUp && (
                <div className="panel" style={{ marginTop: '2rem', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <Dumbbell size={20} color="var(--accent)" />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>À suivre</p>
                    <p style={{ margin: 0, fontWeight: 700 }}>{nextUp.name}</p>
                  </div>
                  <span className="tag tag--accent">
                    Série {Math.min((logs[exIdx]?.length ?? 0) + 1, nextUp.sets)}/{nextUp.sets}
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* ── VICTOIRE ── */}
          {phase === 'done' && result && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '2rem', position: 'relative' }}
            >
              {result.setsDone > 0 && <Narration style={{ marginBottom: '0.8rem' }}>Fin du chapitre {history.length}</Narration>}
              <div style={{ position: 'relative', isolation: 'isolate', width: 140, height: 140, display: 'grid', placeItems: 'center', marginBottom: '1rem' }}>
                <SpeedLines className="mSpeed--ring" style={{ inset: -110 }} />
                <Burst count={30} />
                <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
                  <FighterAvatar id={avatarId} size={130} />
                </motion.div>
              </div>
              <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="levelUp__jp">
                勝利
              </motion.p>
              <motion.h1
                initial={{ scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 220, damping: 14 }}
                className="mangaTitle"
                style={{ fontSize: '3rem' }}
              >
                {result.setsDone >= result.totalSets ? 'Victoire totale' : result.setsDone > 0 ? 'Victoire' : 'Repli'}
              </motion.h1>
              <p style={{ color: 'var(--text-secondary)', margin: '0.4rem 0 1.5rem', fontSize: '0.92rem', maxWidth: 320 }}>
                {result.setsDone > 0 ? `${day.name} terminé. Une séance de plus vers le plus fort.` : 'Aucune série validée. Le combattant revient toujours.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', width: '100%' }}>
                <ResultStat icon={<Timer size={16} />} label="Durée" value={fmt(result.duration)} delay={0.4} />
                <ResultStat icon={<Check size={16} />} label="Séries" value={`${result.setsDone}/${result.totalSets}`} delay={0.5} />
                <ResultStat icon={<Dumbbell size={16} />} label="Volume" value={result.volume > 0 ? `${Math.round(result.volume)} kg` : '—'} delay={0.6} />
                <ResultStat icon={<Flame size={16} />} label="Records" value={String(result.newPrs.length)} delay={0.7} accent />
              </div>

              {result.newPrs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="panel"
                  style={{ width: '100%', marginTop: '0.8rem', borderColor: 'rgba(251,191,36,0.4)', textAlign: 'left' }}
                >
                  <p style={{ margin: '0 0 0.4rem', color: '#fbbf24', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trophy size={16} /> Nouveaux records !
                  </p>
                  {result.newPrs.map((n) => (
                    <p key={n} style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>· {n}</p>
                  ))}
                </motion.div>
              )}

              <div style={{ marginTop: 'auto', paddingTop: '1rem', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Narration style={{ alignSelf: 'flex-end' }}>À suivre…</Narration>
                <button type="button" className="btnFight" style={{ animation: 'none' }} onClick={onClose}>
                  Retour au dojo
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation de sortie */}
      <AnimatePresence>
        {confirmQuit && (
          <>
            <motion.div className="sheetBackdrop" style={{ zIndex: 170 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmQuit(false)} />
            <motion.div className="sheet" style={{ zIndex: 171 }} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 260 }}>
              <div className="sheet__grip" />
              <h3 className="mangaTitle" style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>Abandonner le combat ?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 0 }}>
                {setsDone > 0 ? `Tu as validé ${setsDone} série${setsDone > 1 ? 's' : ''}. Tu peux enregistrer ce que tu as fait.` : 'Rien ne sera enregistré.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btnFight" style={{ animation: 'none' }} onClick={() => setConfirmQuit(false)}>Continuer à me battre</button>
                {setsDone > 0 && (
                  <button type="button" className="btnSecondary" style={{ padding: '0.8rem' }} onClick={() => { setConfirmQuit(false); finish(logs); }}>
                    Terminer et enregistrer
                  </button>
                )}
                <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '0.6rem', fontSize: '0.88rem' }}>
                  Quitter sans enregistrer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stepper({
  label,
  value,
  step,
  min,
  onChange,
  suffix,
  fx,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  onChange: (v: number) => void;
  suffix: string;
  fx: () => void;
}) {
  return (
    <div className="panel" style={{ padding: '0.7rem', marginBottom: 0 }}>
      <p style={{ margin: '0 0 0.4rem', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <button type="button" className="iconBtn" style={{ width: 36, height: 36 }} onClick={() => { fx(); onChange(Math.max(min, Math.round((value - step) * 10) / 10)); }} aria-label={`Diminuer ${label}`}>
          <Minus size={16} />
        </button>
        <span className="statNum" style={{ fontSize: '1.5rem' }}>
          {value}
          {suffix && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 3 }}>{suffix}</span>}
        </span>
        <button type="button" className="iconBtn" style={{ width: 36, height: 36 }} onClick={() => { fx(); onChange(Math.round((value + step) * 10) / 10); }} aria-label={`Augmenter ${label}`}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function ResultStat({ icon, label, value, delay, accent }: { icon: React.ReactNode; label: string; value: string; delay: number; accent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`panel ${accent ? 'panel--accent' : ''}`}
      style={{ marginBottom: 0, padding: '0.85rem', textAlign: 'left' }}
    >
      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        <span style={{ color: 'var(--accent)', display: 'flex' }}>{icon}</span> {label}
      </p>
      <p className={`statNum ${accent ? 'accentText' : ''}`} style={{ margin: '0.3rem 0 0' }}>{value}</p>
    </motion.div>
  );
}
