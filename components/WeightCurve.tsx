'use client';

import React, { useMemo } from 'react';
import { todayISO, toLocalISO } from '../lib/streak';

interface Point {
  date: string;
  weight: number;
}

const W = 340;
const H = 200;
const PAD = { t: 20, r: 16, b: 32, l: 44 };

/** Génère les points hebdomadiers de la trajectoire cible */
function getTargetTrajectory(
  startDate: string,
  endDate: string,
  startWeight: number,
  endWeight: number
): { date: string; weight: number }[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (end <= start) {
    return [{ date: startDate, weight: startWeight }, { date: endDate, weight: endWeight }];
  }
  const pts: { date: string; weight: number }[] = [{ date: startDate, weight: startWeight }];
  const step = 7 * 24 * 60 * 60 * 1000; // 1 semaine
  let t = start + step;
  while (t < end) {
    const p = (t - start) / (end - start);
    const w = startWeight + (endWeight - startWeight) * p;
    pts.push({ date: toLocalISO(new Date(t)), weight: Math.round(w * 10) / 10 });
    t += step;
  }
  pts.push({ date: endDate, weight: endWeight });
  return pts;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

interface WeightCurveProps {
  history: Point[];
  poidsCible?: number | null;
  dateObjectif?: string | null;
  poidsActuel?: number;
  poidsInitial?: number;
  /** Remplit la hauteur du parent au lieu d'une hauteur fixe */
  fill?: boolean;
}

export function WeightCurve({
  history,
  poidsCible,
  dateObjectif,
  poidsActuel,
  poidsInitial,
  fill = false,
}: WeightCurveProps) {
  const data = useMemo(() => {
    const today = todayISO();
    const startW = poidsInitial ?? history[0]?.weight ?? poidsActuel ?? 70;
    const endW = poidsCible ?? startW;
    const hasTarget = poidsCible != null && poidsCible >= 30 && poidsCible <= 300 && dateObjectif;
    const startDate = history.length > 0 ? history[0].date : today;
    const endDate = dateObjectif || today;

    const targetPts = hasTarget
      ? getTargetTrajectory(startDate, endDate, startW, endW)
      : [];

    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const allWeights = [...sorted.map((p) => p.weight), ...targetPts.map((p) => p.weight)];
    if (allWeights.length === 0) allWeights.push(startW, endW);
    let minW = Math.min(...allWeights);
    let maxW = Math.max(...allWeights);
    const padding = (maxW - minW) * 0.08 || 2;
    minW = Math.max(30, minW - padding);
    maxW = Math.min(300, maxW + padding);

    const range = maxW - minW || 1;
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;

    const toCoord = (dateStr: string, weight: number) => {
      const d0 = new Date(startDate).getTime();
      const d1 = new Date(endDate).getTime();
      const t = new Date(dateStr).getTime();
      const p = d1 > d0 ? (t - d0) / (d1 - d0) : 0;
      const x = PAD.l + Math.max(0, Math.min(1, p)) * innerW;
      const y = PAD.t + innerH - ((weight - minW) / range) * innerH;
      return { x, y };
    };

    const actualPts = sorted.map((p) => ({ ...toCoord(p.date, p.weight), date: p.date, weight: p.weight }));
    const targetCoordPts = targetPts.map((p) => ({ ...toCoord(p.date, p.weight), date: p.date, weight: p.weight }));

    const actualPath =
      actualPts.length > 0
        ? actualPts.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ')
        : '';
    const targetPath =
      targetCoordPts.length > 1
        ? targetCoordPts.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ')
        : '';

    const checkpoints = targetCoordPts.filter((_, i) => i % 2 === 0 || i === targetCoordPts.length - 1);

    return {
      actualPath,
      targetPath,
      actualPts,
      targetPts: targetCoordPts,
      checkpoints,
      minW,
      maxW,
      startDate,
      endDate,
      hasTarget,
    };
  }, [history, poidsCible, dateObjectif, poidsActuel, poidsInitial]);

  const hasAnything = data.actualPts.length > 0 || data.hasTarget;

  if (!hasAnything) {
    return (
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
        Définis un objectif et ajoute ton poids pour voir ta trajectoire.
      </p>
    );
  }

  return (
    <div style={{ width: '100%', ...(fill ? { height: '100%', display: 'flex', flexDirection: 'column' } : {}) }}>
      <svg
        viewBox={'0 0 ' + W + ' ' + H}
        style={{ width: '100%', height: 'auto', display: 'block', ...(fill ? { flex: '1 1 0', minHeight: 0 } : {}) }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="targetGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--success)" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="actualGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Zone sous la courbe cible */}
        {data.targetPath && (
          <path
            d={data.targetPath + ' L ' + (W - PAD.r) + ' ' + (H - PAD.b) + ' L ' + PAD.l + ' ' + (H - PAD.b) + ' Z'}
            fill="url(#targetGrad)"
          />
        )}

        {/* Courbe cible (trajectoire à suivre) - en premier pour être en arrière-plan */}
        {data.targetPath && (
          <path
            d={data.targetPath}
            fill="none"
            stroke="var(--success)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
        )}

        {/* Checkpoints sur la courbe cible */}
        {data.checkpoints.map((p, i) => (
          <circle
            key={'c-' + i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="var(--bg)"
            stroke="var(--success)"
            strokeWidth="2"
          />
        ))}

        {/* Zone sous la courbe réelle */}
        {data.actualPath && data.actualPts.length > 1 && (
          <path
            d={data.actualPath + ' L ' + data.actualPts[data.actualPts.length - 1].x + ' ' + (H - PAD.b) + ' L ' + PAD.l + ' ' + (H - PAD.b) + ' Z'}
            fill="url(#actualGrad)"
          />
        )}

        {/* Courbe réelle (ton poids) */}
        {data.actualPath && (
          <path
            d={data.actualPath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Points réels */}
        {data.actualPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--accent)" stroke="var(--bg)" strokeWidth="1.5" />
        ))}

        <text x={PAD.l - 4} y={PAD.t + 3} textAnchor="end" fontSize="9" fill="var(--text-muted)">{data.maxW} kg</text>
        <text x={PAD.l - 4} y={H - PAD.b + 5} textAnchor="end" fontSize="9" fill="var(--text-muted)">{data.minW} kg</text>
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: fill ? '0.2rem' : '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        <span>{formatShortDate(data.startDate)}</span>
        <span>{formatShortDate(data.endDate)}</span>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: fill ? '0.35rem' : '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--accent)' }} />
          Ton poids
        </span>
        {data.hasTarget && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--success)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, border: '1.5px dashed var(--success)' }} />
            Trajectoire cible
          </span>
        )}
      </div>
    </div>
  );
}
