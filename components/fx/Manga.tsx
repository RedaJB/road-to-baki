'use client';

/**
 * Kit visuel manga : traits de vitesse, onomatopées, encadrés de narration, bulles,
 * aura « ゴゴゴ », flash d'impact et tampon de rang. Styles dans app/globals.css (DA MANGA).
 * Les effets animés se coupent avec le réglage « Effets manga » et prefers-reduced-motion.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCustomization } from '../../lib/customization-context';

/** Lignes de concentration rayonnant d'un point (par défaut le centre) */
export function SpeedLines({ at = '50% 50%', className = '', style }: { at?: string; className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={`mSpeed ${className}`} style={{ '--at': at, ...style } as React.CSSProperties} />;
}

/** Onomatopée dessinée (décorative) */
export function Ono({ text, size = '2rem', rotate = -8, accent = false, style }: { text: string; size?: string; rotate?: number; accent?: boolean; style?: React.CSSProperties }) {
  return (
    <span aria-hidden className={`mOno ${accent ? 'mOno--accent' : ''}`} style={{ fontSize: size, transform: `rotate(${rotate}deg)`, ...style }}>
      {text}
    </span>
  );
}

/** Encadré de narration (cartouche blanc) */
export function Narration({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span className="mNarr" style={style}>
      {children}
    </span>
  );
}

/** Bulle de dialogue, pointe en bas à gauche, signée sous la bulle */
export function Bubble({ children, who, style }: { children: React.ReactNode; who?: string; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div className="mBubble">{children}</div>
      {who && <p className="mBubble__who">{who}</p>}
    </div>
  );
}

/** Aura menaçante « ゴゴゴ » */
export function Menace({ style }: { style?: React.CSSProperties }) {
  const { mangaFx } = useCustomization();
  const reduce = useReducedMotion();
  if (!mangaFx) return null;
  return (
    <span aria-hidden className={`mMenace ${reduce ? '' : 'mMenace--anim'}`} style={style}>
      {['ゴ', 'ゴ', 'ゴ'].map((c, i) => (
        <span key={i} style={{ animationDelay: `${i * 0.22}s` }}>
          {c}
        </span>
      ))}
    </span>
  );
}

const SFX = ['ドン', 'バン', 'ズン', 'ドドン'];

/**
 * Flash d'impact plein écran.
 * const { impact, impactNode } = useImpact(); … impact(); … {impactNode}
 */
export function useImpact() {
  const { mangaFx } = useCustomization();
  const reduce = useReducedMotion();
  const [hit, setHit] = useState<{ id: number; text: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const impact = useCallback(
    (text?: string) => {
      if (!mangaFx || reduce) return;
      window.clearTimeout(timer.current);
      setHit({ id: Date.now(), text: text ?? SFX[Math.floor(Math.random() * SFX.length)] });
      timer.current = window.setTimeout(() => setHit(null), 620);
    },
    [mangaFx, reduce],
  );

  const impactNode = (
    <AnimatePresence>
      {hit && (
        <motion.div key={hit.id} className="mImpact" aria-hidden initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.6, ease: 'easeIn' }}>
          <div className="mSpeed mSpeed--burst" />
          <motion.span
            className="mOno mImpact__ono"
            initial={{ scale: 2.4, rotate: -16 }}
            animate={{ scale: 1, rotate: -8 }}
            transition={{ type: 'spring', stiffness: 460, damping: 15 }}
          >
            {hit.text}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { impact, impactNode };
}

/** Tampon de rang (E → S) */
export function RankStamp({ rank, kanji, size = 58 }: { rank: string; kanji: string; size?: number }) {
  return (
    <div className="mRank" style={{ width: size, height: size, fontSize: size / 2 }} role="img" aria-label={`Rang ${rank}`}>
      <span className="mRank__kanji" aria-hidden>
        {kanji}
      </span>
      <span className="mRank__letter" aria-hidden>
        {rank}
      </span>
    </div>
  );
}
