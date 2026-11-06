'use client';

import React, { useEffect, useState, useCallback } from 'react';

const DURATION_MS = 8000;
const RADIUS = 56;
const STROKE = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const STAGE_MESSAGES: { threshold: number; text: string }[] = [
  { threshold: 0, text: 'Calibration du profil...' },
  { threshold: 30, text: 'Recherche exercices' },
  { threshold: 60, text: 'Génération protocole' },
  { threshold: 90, text: 'Finalisation' },
];

interface BakiLoadingScreenProps {
  onComplete: () => void;
}

export function BakiLoadingScreen({ onComplete }: BakiLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);

  const displayText = useCallback(() => {
    if (progress >= 100) return 'Programme BAKI généré.';
    for (let i = STAGE_MESSAGES.length - 1; i >= 0; i--) {
      if (progress >= STAGE_MESSAGES[i].threshold) {
        return STAGE_MESSAGES[i].text;
      }
    }
    return STAGE_MESSAGES[0].text;
  }, [progress]);

  useEffect(() => {
    const startTime = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(p);

      if (p >= 100) {
        setComplete(true);
        setTimeout(onComplete, 600);
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onComplete]);

  const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: RADIUS * 2 + STROKE * 2,
          height: RADIUS * 2 + STROKE * 2,
        }}
      >
        <svg
          width={RADIUS * 2 + STROKE * 2}
          height={RADIUS * 2 + STROKE * 2}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={RADIUS + STROKE}
            cy={RADIUS + STROKE}
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
          />
          <circle
            cx={RADIUS + STROKE}
            cy={RADIUS + STROKE}
            r={RADIUS}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.1s linear',
            }}
          />
        </svg>
      </div>

      <p
        style={{
          marginTop: '1.5rem',
          fontSize: '1.1rem',
          fontWeight: 600,
          color: complete ? 'var(--accent)' : 'var(--text)',
          transition: 'color 0.3s ease',
        }}
      >
        {displayText()}
      </p>
    </div>
  );
}
