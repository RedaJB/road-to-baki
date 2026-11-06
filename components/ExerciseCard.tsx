'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Repeat, Timer } from 'lucide-react';
import type { SessionExercise } from '../lib/programs';

export function ExerciseCard({ exercise, index }: { exercise: SessionExercise; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="panel"
      style={{ padding: '0.75rem 0.9rem', marginBottom: 0, cursor: 'pointer' }}
      onClick={() => setOpen((o) => !o)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'rgba(var(--accent-rgb),0.14)',
            border: '1px solid rgba(var(--accent-rgb),0.35)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-impact)',
            fontSize: '1rem',
            color: 'var(--accent)',
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {exercise.name}
            {exercise.swapped && <Repeat size={12} color="var(--accent)" aria-label="Exercice adapté" />}
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.1rem 0 0' }}>
            {exercise.muscle}
            {exercise.note ? ` · ${exercise.note}` : ''}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span className="statNum" style={{ fontSize: '1.05rem' }}>
            {exercise.sets}×{exercise.reps}
            {exercise.kind === 'sec' ? 's' : ''}
          </span>
          <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
            <Timer size={10} /> {exercise.rest}s
          </p>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: 'flex', color: 'var(--text-muted)' }}>
          <ChevronDown size={16} />
        </motion.span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ listStyle: 'none', margin: 0, padding: '0.6rem 0 0 2.9rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            {exercise.cues.map((c, i) => (
              <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent)', marginRight: 6 }}>▸</span>
                {c}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
