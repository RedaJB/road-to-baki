'use client';

import { useMemo } from 'react';
import { useOnboarding } from './onboarding-context';
import { useApp } from './app-context';
import { useTraining } from './training-context';
import { useCustomization } from './customization-context';
import { PLAN_ID, blockWeek, buildPlan, buildSession, scheduleFor, type SessionProfile } from './programs';
import { todayISO } from './streak';

/** Programme personnalisé, prochaine séance et profil d'adaptation */
export function useTodaySession(dayOverride?: number) {
  const { answers } = useOnboarding();
  const { douleurs, trainingDoneDates } = useApp();
  const { nextDayIndex, progress } = useTraining();
  const { intensity } = useCustomization();

  const program = useMemo(
    () => buildPlan({ goal: answers.objectifPrincipal, location: answers.trainingLocation, frequency: answers.frequence }),
    [answers.objectifPrincipal, answers.trainingLocation, answers.frequence],
  );
  const days = scheduleFor(program, answers.frequence);
  const dayIndex = (dayOverride ?? nextDayIndex(PLAN_ID)) % days.length;
  const sessionsDone = progress[PLAN_ID] ?? 0;

  const profile = useMemo<SessionProfile>(
    () => ({
      location: answers.trainingLocation,
      douleurs: douleurs ?? answers.douleurs ?? [],
      experience: answers.experience,
      resilience: answers.resilience,
      goal: answers.objectifPrincipal,
      frequency: answers.frequence,
      sessionsDone,
      intensity,
    }),
    [answers.trainingLocation, answers.douleurs, answers.experience, answers.resilience, answers.objectifPrincipal, answers.frequence, sessionsDone, douleurs, intensity],
  );

  const exercises = useMemo(() => buildSession(program, dayIndex, profile), [program, dayIndex, profile]);

  return {
    program,
    dayIndex,
    days,
    day: days[dayIndex],
    block: blockWeek(sessionsDone, answers.frequence),
    exercises,
    profile,
    trainedToday: trainingDoneDates.includes(todayISO()),
  };
}
