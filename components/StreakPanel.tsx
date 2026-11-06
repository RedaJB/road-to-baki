'use client';

import React from 'react';
import { Flame } from 'lucide-react';
import { useStreak } from '../lib/streak-context';

interface StreakPanelProps {
  /** Jour affiché dans le journal (YYYY-MM-DD) */
  viewDate: string;
  todayISO: string;
}

export function StreakPanel({ viewDate, todayISO: today }: StreakPanelProps) {
  const { warriorStreak, trainingStreak, nutritionStreak, longestWarrior, todayWarrior, getWarriorForDate } = useStreak();
  const isViewingToday = viewDate === today;
  const dayCheck = isViewingToday ? todayWarrior : getWarriorForDate(viewDate);

  return (
    <div className="panel streakPanel">
      <div className="streakPanelHeader">
        <div>
          <p className="sectionLabel" style={{ marginBottom: 4 }}>Streak discipline</p>
          <p className="streakPanelSubtitle">
            Jours d&apos;affilée où tu tiens repas + eau + mouvement
          </p>
        </div>
        <div className="streakPanelFire" aria-hidden>
          <Flame size={20} color={warriorStreak > 0 ? 'var(--accent)' : 'var(--text-muted)'} />
          <span className="streakPanelFireValue">{warriorStreak}</span>
        </div>
      </div>

      <div className="streakPanelMeta">
        <span>Record : {longestWarrior} j</span>
        <span className="streakPanelDot" aria-hidden>·</span>
        <span>Séance {trainingStreak}j</span>
        <span className="streakPanelDot" aria-hidden>·</span>
        <span>Repas {nutritionStreak}j</span>
      </div>

      {isViewingToday ? (
        <div className="streakPills" role="list">
          <StreakPill ok={dayCheck.foodOk} label="Repas" />
          <StreakPill ok={dayCheck.waterOk} label="Eau" />
          <StreakPill ok={dayCheck.moveOk} label="Mouvement" />
        </div>
      ) : (
        <p className="streakPanelHint">Ce jour-là : {dayCheck.complete ? 'Jour validé ✓' : 'Objectifs non tous atteints'}</p>
      )}
    </div>
  );
}

function StreakPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`streakPill ${ok ? 'streakPill--ok' : ''}`} role="listitem">
      <span className="streakPillMark">{ok ? '✓' : '○'}</span>
      {label}
    </div>
  );
}
