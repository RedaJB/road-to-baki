'use client';

import React from 'react';

interface CalorieGaugeProps {
  value: number;
  goal: number;
}

/** ViewBox interne (coordonnées SVG) — padding pour éviter que le trait dépasse */
const VB = 200;
const PAD = 10;
const CX = VB / 2;
const CY = VB / 2;
const STROKE = 12;
const R = CX - PAD - STROKE / 2;

const CIRC = 2 * Math.PI * R;
/** Arc visible (bas du cercle), ~270° pour style jauge */
const ARC_FRAC = 0.75;
const ARC_LEN = CIRC * ARC_FRAC;
const GAP = CIRC * (1 - ARC_FRAC);
/** Rotation : ouverture du gap vers le haut (symétrique) */
const ROTATION = 90 + (360 * (1 - ARC_FRAC)) / 2;

export function CalorieGauge({ value, goal }: CalorieGaugeProps) {
  const safeGoal = Math.max(1, goal);
  const pct = Math.min(1, Math.max(0, value / safeGoal));
  const filled = ARC_LEN * pct;
  const surplus = value > goal;

  const color = surplus
    ? '#fb7185'
    : pct >= 1
      ? '#22c55e'
      : pct < 0.5
        ? '#22c55e'
        : pct < 0.85
          ? '#22d3ee'
          : '#f59e0b';

  const remaining = Math.max(0, goal - value);
  const statusText = surplus
    ? `+${Math.round(value - goal)} kcal surplus`
    : remaining === 0
      ? 'Objectif atteint'
      : `${Math.round(remaining)} kcal restantes`;

  const dashOffset = -GAP / 2;

  return (
    <div className="calorieGauge card glassPanel">
      <div className="calorieGauge__chart">
        <svg
          className="calorieGauge__svg"
          viewBox={`0 0 ${VB} ${VB}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${ARC_LEN} ${GAP}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(${ROTATION} ${CX} ${CY})`}
          />
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap={filled > 0 ? 'round' : 'butt'}
            strokeDasharray={`${filled} ${CIRC - filled}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(${ROTATION} ${CX} ${CY})`}
            style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
            opacity={0.95}
          />
        </svg>
        <div className="calorieGauge__center">
          <div className="calorieGauge__value">{Math.round(value)}</div>
          <div className="calorieGauge__goal">/ {goal} kcal</div>
        </div>
      </div>
      <div className="calorieGauge__status" style={{ color }}>{statusText}</div>
    </div>
  );
}
