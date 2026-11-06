'use client';

import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { addDaysISO, todayISO } from '../lib/streak';

/* ─── Feuille du bas ─── */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="sheetBackdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="sheet__grip" />
            {title && (
              <div className="sheetHead">
                <h3>{title}</h3>
                <button type="button" className="iconBtn" onClick={onClose} aria-label="Fermer" style={{ width: 34, height: 34 }}>
                  <X size={16} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Tuile de stat compacte ─── */

export function Tile({
  icon,
  label,
  value,
  sub,
  pct,
  color = 'var(--accent)',
  onClick,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  pct?: number;
  color?: string;
  onClick?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <motion.div whileTap={onClick ? { scale: 0.97 } : undefined} className="tile" onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="tile__top">
        <span className="tile__icon" style={{ color }}>{icon}</span>
        <span className="tile__label">{label}</span>
        {action && <span style={{ marginLeft: 'auto' }} onClick={(e) => e.stopPropagation()}>{action}</span>}
      </div>
      <div className="tile__value">{value}</div>
      {sub && <div className="tile__sub">{sub}</div>}
      {pct !== undefined && (
        <div className="tile__bar">
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }} transition={{ duration: 0.6 }} style={{ background: color }} />
        </div>
      )}
    </motion.div>
  );
}

/* ─── Semaine en cours (lundi → dimanche) ─── */

export function WeekStrip({ doneDates }: { doneDates: string[] }) {
  const days = useMemo(() => {
    const today = todayISO();
    const start = addDaysISO(today, -((new Date().getDay() + 6) % 7));
    const set = new Set(doneDates);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDaysISO(start, i);
      return { d, label: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i], done: set.has(d), isToday: d === today, future: d > today };
    });
  }, [doneDates]);
  return (
    <div className="week">
      {days.map((w) => (
        <div key={w.d} className="week__day" data-done={w.done} data-today={w.isToday} data-future={w.future}>
          <span className="week__dot">{w.done && <Check size={12} strokeWidth={3} />}</span>
          <span className="week__label">{w.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Sélecteur segmenté ─── */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  id,
}: {
  options: { v: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div className="ob-seg" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button key={o.v} type="button" className="ob-seg__item" data-selected={value === o.v} onClick={() => onChange(o.v)}>
          {value === o.v && <motion.span layoutId={`seg-${id}`} className="ob-seg__pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span style={{ position: 'relative' }}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
