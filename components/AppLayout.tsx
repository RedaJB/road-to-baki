'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomTabBar, type TabId } from './BottomTabBar';
import { JournalTab } from './JournalTab';
import { GrailleTab } from './GrailleTab';
import { ProgrammesTab } from './ProgrammesTab';
import { ProfilTab } from './ProfilTab';
import { WorkoutSession } from './WorkoutSession';
import { useTodaySession } from '../lib/use-today-session';

const TAB_KEY = 'roadtobaki_active_tab';

export function AppLayout() {
  // AppLayout n'est rendu que côté client (après l'init de l'onboarding) : lecture directe du stockage
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    try {
      const stored = window.localStorage.getItem(TAB_KEY);
      if (stored === 'journal' || stored === 'graille' || stored === 'programmes' || stored === 'profil') return stored;
    } catch {
      // ignore
    }
    return 'journal';
  });
  const [workoutDay, setWorkoutDay] = useState<number | null>(null);
  const session = useTodaySession(workoutDay ?? undefined);

  useEffect(() => {
    try {
      window.localStorage.setItem(TAB_KEY, activeTab);
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0 });
  }, [activeTab]);

  const startWorkout = (dayIndex?: number) => setWorkoutDay(dayIndex ?? session.dayIndex);

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0, transitionEnd: { transform: 'none' } }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {activeTab === 'journal' && (
            <JournalTab onGoToGraille={() => setActiveTab('graille')} onGoToTraining={() => setActiveTab('programmes')} onStartWorkout={() => startWorkout()} />
          )}
          {activeTab === 'graille' && <GrailleTab />}
          {activeTab === 'programmes' && <ProgrammesTab onStartWorkout={startWorkout} />}
          {activeTab === 'profil' && <ProfilTab />}
        </motion.div>
      </AnimatePresence>
      <BottomTabBar active={activeTab} onChange={setActiveTab} />

      <AnimatePresence>
        {workoutDay !== null && (
          <motion.div key="workout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'relative', zIndex: 150 }}>
            <WorkoutSession program={session.program} day={session.day} dayIndex={session.dayIndex} exercises={session.exercises} onClose={() => setWorkoutDay(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
