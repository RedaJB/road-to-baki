'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Droplet, Sparkles, Lock, Zap } from 'lucide-react';
import { useApp, FASTING_PLANS_UI, type FastingMode } from '../lib/app-context';
import { useToast } from '../lib/toast-context';
import { useFx } from '../lib/customization-context';

type FastingPhase = { name: string; startHour: number; color: string; icon: React.ReactNode; desc: string };

const PHASES: FastingPhase[] = [
  { name: 'Digestion', startHour: 0, color: '#3b82f6', icon: <Droplet size={14} />, desc: 'La glycémie monte puis redescend.' },
  { name: 'Chute de l’insuline', startHour: 2, color: '#10b981', icon: <Droplet size={14} />, desc: 'Le corps se prépare à puiser dans ses réserves.' },
  { name: 'Brûlage des graisses', startHour: 8, color: '#f59e0b', icon: <Flame size={14} />, desc: 'Les réserves de glycogène s’épuisent.' },
  { name: 'Cétose légère', startHour: 12, color: '#f97316', icon: <Zap size={14} />, desc: 'Les graisses deviennent le carburant principal.' },
  { name: 'Autophagie', startHour: 16, color: '#e11d48', icon: <Sparkles size={14} />, desc: 'Nettoyage et renouvellement cellulaire.' },
];

const SELECTABLE: FastingMode[] = ['16-8', '18-6', '20-4', 'omad'];

function fmt(hours: number) {
  const totalMin = Math.max(0, Math.floor(hours * 60));
  return `${Math.floor(totalMin / 60)}h${String(totalMin % 60).padStart(2, '0')}`;
}

export function FastingTimer({ isPremium, onUnlockPremium }: { isPremium: boolean; onUnlockPremium: () => void }) {
  const { fastingMode, setFastingMode, fastingStartedAt, startFast, endFast, fastingHistory } = useApp();
  const { toast } = useToast();
  const fx = useFx();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!fastingStartedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    setNow(Date.now());
    return () => window.clearInterval(id);
  }, [fastingStartedAt]);

  const mode = fastingMode === 'none' ? '16-8' : fastingMode;
  const goal = FASTING_PLANS_UI[mode].hoursFast;
  const elapsed = fastingStartedAt ? (now - fastingStartedAt) / 3_600_000 : 0;
  const phase = [...PHASES].reverse().find((p) => elapsed >= p.startHour) ?? PHASES[0];
  const progress = Math.min(1, elapsed / goal);
  const reached = elapsed >= goal;
  const completed = fastingHistory.filter((f) => f.hours >= f.goal).length;

  const radius = 88;
  const circ = 2 * Math.PI * radius;

  const toggle = () => {
    if (fastingStartedAt) {
      const hours = endFast();
      if (hours >= goal) {
        fx('victory');
        toast(`Jeûne de ${fmt(hours)} réussi`);
      } else {
        toast(`Jeûne arrêté à ${fmt(hours)}`, 'info');
      }
    } else {
      if (fastingMode === 'none') setFastingMode('16-8');
      startFast();
      fx('go');
      toast('Le jeûne commence. Tiens bon, combattant.', 'info');
    }
  };

  return (
    <div style={{ overflow: 'hidden' }}>
      {/* Choix du protocole */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {SELECTABLE.map((m) => (
          <button
            key={m}
            type="button"
            disabled={!!fastingStartedAt}
            onClick={() => { fx('tap'); setFastingMode(m); }}
            className={mode === m ? 'chipActive' : 'chip'}
            style={{ fontWeight: 700, opacity: fastingStartedAt && mode !== m ? 0.4 : 1 }}
          >
            {m === 'omad' ? 'OMAD' : m.replace('-', ':')}
          </button>
        ))}
        <span className="tag" style={{ marginLeft: 'auto' }}>🏆 {completed}</span>
      </div>

      <div style={{ position: 'relative', width: 210, height: 210, margin: '0 auto 1rem' }}>
        <svg width="210" height="210" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
          {/* graduations des phases */}
          {PHASES.slice(1).filter((p) => p.startHour < goal).map((p) => {
            const a = (p.startHour / goal) * Math.PI * 2;
            return <circle key={p.name} cx={100 + Math.cos(a) * radius} cy={100 + Math.sin(a) * radius} r="3" fill={p.color} opacity={0.8} />;
          })}
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={fastingStartedAt ? phase.color : 'rgba(var(--accent-rgb),0.4)'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circ}
            animate={{ strokeDashoffset: circ * (1 - progress) }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          {fastingStartedAt ? (
            <>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{reached ? 'Objectif atteint' : 'En cours'}</span>
              <span className="statNum" style={{ fontSize: '2.6rem' }}>{fmt(elapsed)}</span>
              <span style={{ fontSize: '0.78rem', color: phase.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                {phase.icon} {phase.name}
              </span>
              {!reached && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>encore {fmt(goal - elapsed)}</span>}
            </>
          ) : (
            <>
              <span className="jp accentText" style={{ fontSize: '2.2rem', lineHeight: 1 }}>断</span>
              <span className="statNum" style={{ fontSize: '2rem', marginTop: 4 }}>{goal}h</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{FASTING_PLANS_UI[mode].label}</span>
            </>
          )}
        </div>
      </div>

      <button type="button" onClick={toggle} className={fastingStartedAt ? 'btnSecondary' : 'btnFight'} style={{ width: '100%', padding: '0.85rem', animation: 'none', fontSize: fastingStartedAt ? '0.95rem' : undefined }}>
        {fastingStartedAt ? (reached ? 'Rompre le jeûne (victoire)' : 'Arrêter le jeûne') : 'Commencer le jeûne'}
      </button>

      <div style={{ marginTop: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {PHASES.slice(2).map((p, idx) => {
          const active = fastingStartedAt && phase.name === p.name;
          const passed = fastingStartedAt && elapsed >= p.startHour;
          const locked = !isPremium && idx > 0;
          return (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: locked ? 0.45 : passed ? 1 : 0.65, position: 'relative' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${p.color}22`, color: p.color, display: 'grid', placeItems: 'center', flexShrink: 0, outline: active ? `1.5px solid ${p.color}` : 'none' }}>
                {p.icon}
              </div>
              <div style={{ flex: 1, filter: locked ? 'blur(2px)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: active ? p.color : 'var(--text)' }}>{p.name}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.startHour}h+</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>{p.desc}</p>
              </div>
              {locked && (
                <button type="button" onClick={onUnlockPremium} aria-label="Débloquer avec Pro" style={{ position: 'absolute', inset: 0, background: 'transparent', border: 'none', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <Lock size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
