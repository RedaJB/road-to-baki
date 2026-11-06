'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface SetLog {
  reps: number;
  weight?: number;
}

export interface ExerciseLog {
  id: string;
  name: string;
  kind: 'reps' | 'sec';
  sets: SetLog[];
}

export interface SessionLog {
  id: string;
  date: string;
  programId: string;
  dayIndex: number;
  dayName: string;
  durationSec: number;
  setsDone: number;
  totalSets: number;
  volume: number;
  xp: number;
  exercises: ExerciseLog[];
}

export interface PersonalRecord {
  weight: number;
  reps: number;
  date: string;
}

interface TrainingState {
  activeProgramId: string | null;
  setActiveProgram: (id: string) => void;
  /** Nombre de séances complétées par programme (fait avancer le bloc de 4 semaines) */
  progress: Record<string, number>;
  /** Prochaine séance dans la rotation (à ramener au nombre de séances de la semaine) */
  nextDayIndex: (programId: string) => number;
  setNextDay: (programId: string, dayIndex: number) => void;
  logs: SessionLog[];
  prs: Record<string, PersonalRecord>;
  completeSession: (log: Omit<SessionLog, 'id'>) => { newPrs: string[] };
  lastWeightFor: (exerciseId: string) => number | undefined;
}

const STORAGE_KEY = 'roadtobaki_training_v1';
const TrainingContext = createContext<TrainingState | undefined>(undefined);

export function TrainingProvider({ children }: { children: React.ReactNode }) {
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [dayOverride, setDayOverride] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [prs, setPrs] = useState<Record<string, PersonalRecord>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.activeProgramId === 'string') setActiveProgramId(p.activeProgramId);
        if (p.progress && typeof p.progress === 'object') setProgress(p.progress);
        if (p.dayOverride && typeof p.dayOverride === 'object') setDayOverride(p.dayOverride);
        if (Array.isArray(p.logs)) setLogs(p.logs);
        if (p.prs && typeof p.prs === 'object') setPrs(p.prs);
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeProgramId, progress, dayOverride, logs, prs }));
    } catch {
      // ignore
    }
  }, [loaded, activeProgramId, progress, dayOverride, logs, prs]);

  const setActiveProgram = useCallback((id: string) => setActiveProgramId(id), []);

  const nextDayIndex = useCallback(
    (programId: string) => {
      if (typeof dayOverride[programId] === 'number') return dayOverride[programId];
      return progress[programId] ?? 0;
    },
    [progress, dayOverride],
  );

  const setNextDay = useCallback((programId: string, dayIndex: number) => {
    setDayOverride((prev) => ({ ...prev, [programId]: dayIndex }));
  }, []);

  const completeSession = useCallback(
    (log: Omit<SessionLog, 'id'>) => {
      const newPrs: string[] = [];
      const nextPrs = { ...prs };
      for (const ex of log.exercises) {
        for (const s of ex.sets) {
          if (!s.weight || s.weight <= 0) continue;
          const cur = nextPrs[ex.id];
          if (!cur || s.weight > cur.weight || (s.weight === cur.weight && s.reps > cur.reps)) {
            nextPrs[ex.id] = { weight: s.weight, reps: s.reps, date: log.date };
            if (!newPrs.includes(ex.name)) newPrs.push(ex.name);
          }
        }
      }
      setPrs(nextPrs);
      setLogs((prev) => [...prev, { ...log, id: `${Date.now()}-${Math.random().toString(16).slice(2)}` }].slice(-300));
      setProgress((prev) => ({ ...prev, [log.programId]: (prev[log.programId] ?? 0) + 1 }));
      setDayOverride((prev) => ({ ...prev, [log.programId]: log.dayIndex + 1 }));
      return { newPrs };
    },
    [prs],
  );

  const lastWeightFor = useCallback(
    (exerciseId: string) => {
      for (let i = logs.length - 1; i >= 0; i--) {
        const ex = logs[i].exercises.find((e) => e.id === exerciseId);
        const w = ex?.sets.map((s) => s.weight ?? 0).filter((x) => x > 0);
        if (w && w.length) return Math.max(...w);
      }
      return undefined;
    },
    [logs],
  );

  const value = useMemo<TrainingState>(
    () => ({ activeProgramId, setActiveProgram, progress, nextDayIndex, setNextDay, logs, prs, completeSession, lastWeightFor }),
    [activeProgramId, setActiveProgram, progress, nextDayIndex, setNextDay, logs, prs, completeSession, lastWeightFor],
  );

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>;
}

export function useTraining() {
  const ctx = useContext(TrainingContext);
  if (!ctx) throw new Error('useTraining must be used within TrainingProvider');
  return ctx;
}
