'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Volume2, VolumeX, Vibrate, Zap } from 'lucide-react';
import { useCustomization, useFx, MOTTOS, MOTTO_FR, type AuraLevel, type BgEffect } from '../lib/customization-context';
import { useOnboarding } from '../lib/onboarding-context';
import { getLook } from '../lib/fighters';
import { buildPlan } from '../lib/programs';
import { FighterIllustration } from './fx/Fighters';
import { Sheet, Segmented } from './ui';

type Tab = 'identite' | 'effets';

const AURAS: { v: AuraLevel; label: string }[] = [
  { v: 'off', label: 'Aucune' },
  { v: 'calme', label: 'Légère' },
  { v: 'demon', label: 'Forte' },
];

const EFFECTS: { v: BgEffect; label: string }[] = [
  { v: 'aucun', label: 'Aucun' },
  { v: 'braises', label: 'Braises' },
  { v: 'lignes', label: 'Lignes' },
  { v: 'kanji', label: 'Kanji' },
];

/** Carte d'identité du combattant (Dojo) */
export function FighterCard({ aside }: { aside?: React.ReactNode }) {
  const c = useCustomization();
  const { answers } = useOnboarding();
  const avatar = getLook(c.avatar ?? answers.shonenArchetype);
  const plan = buildPlan({ goal: answers.objectifPrincipal, location: answers.trainingLocation, frequency: answers.frequence });
  return (
    <div className="panel mPanel mTone" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.8rem', overflow: 'hidden' }}>
      <motion.div key={avatar.id} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
        <FighterIllustration id={avatar.id} size={72} rounded="16px" />
      </motion.div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="screenHead__title" style={{ fontSize: '1.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.pseudo || 'Combattant'}</p>
        <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{plan.tagline}</p>
        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span className="jp" style={{ marginRight: 6 }}>{c.motto}</span>
          {MOTTO_FR[c.motto]}
        </p>
      </div>
      {aside}
    </div>
  );
}

export function CustomizeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useCustomization();
  const { answers } = useOnboarding();
  const fx = useFx();
  const [tab, setTab] = useState<Tab>('identite');


  return (
    <Sheet open={open} onClose={onClose} title="Personnaliser">
      <div style={{ marginBottom: '1rem' }}>
        <Segmented
          id="custom-tabs"
          value={tab}
          onChange={(v) => {
            fx('tap');
            setTab(v);
          }}
          options={[
            { v: 'identite', label: 'Identité' },
            { v: 'effets', label: 'Effets' },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.15 }}>
          {tab === 'identite' && (
            <>
              <Label>Nom</Label>
              <input
                className="input ob-input"
                value={c.pseudo}
                maxLength={20}
                onChange={(e) => c.update({ pseudo: e.target.value })}
                placeholder="Ton nom de combattant"
                style={{ fontSize: '1rem', padding: '0.8rem 1rem', marginBottom: '1rem' }}
              />
              <Label>Devise</Label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {MOTTOS.map((m) => (
                  <button key={m} type="button" className="ob-tile" data-selected={c.motto === m} onClick={() => c.update({ motto: m })} style={{ padding: '0.55rem', alignItems: 'center', textAlign: 'center' }}>
                    <span className="jp" style={{ fontSize: '0.92rem' }}>{m}</span>
                    <span className="ob-option__desc" style={{ fontSize: '0.62rem' }}>{MOTTO_FR[m]}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'effets' && (
            <>
              <Label>Halo de couleur</Label>
              <div style={{ marginBottom: '1rem' }}>
                <Segmented id="aura" value={c.aura} onChange={(v) => c.update({ aura: v })} options={AURAS.map((a) => ({ v: a.v, label: a.label }))} />
              </div>
              <Label>Fond animé</Label>
              <div style={{ marginBottom: '1rem' }}>
                <Segmented id="bg" value={c.bgEffect} onChange={(v) => c.update({ bgEffect: v })} options={EFFECTS.map((e) => ({ v: e.v, label: e.label }))} />
              </div>
              <Label>Retours</Label>
              <Toggle icon={c.sound ? <Volume2 size={18} /> : <VolumeX size={18} />} label="Sons" desc="Bips du chrono, fin de séance" on={c.sound} onChange={(v) => c.update({ sound: v })} />
              <Toggle icon={<Vibrate size={18} />} label="Vibrations" desc="Sur téléphone" on={c.haptics} onChange={(v) => c.update({ haptics: v })} />
              <Toggle icon={<Zap size={18} />} label="Effets manga" desc="Onomatopées, impacts, aura ゴゴゴ" on={c.mangaFx} onChange={(v) => c.update({ mangaFx: v })} />
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="tile__label" style={{ margin: '0 0 0.5rem' }}>{children}</p>;
}

function Toggle({ icon, label, desc, on, onChange }: { icon: React.ReactNode; label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="ob-tile ob-tile--row" style={{ marginBottom: 6, gap: 12, justifyContent: 'flex-start' }}>
      <span style={{ color: on ? 'var(--accent)' : 'var(--text-muted)', display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <span className="ob-option__label">{label}</span>
        <span className="ob-option__desc">{desc}</span>
      </span>
      <span style={{ width: 44, height: 26, borderRadius: 999, background: on ? 'var(--accent)' : 'rgba(255,255,255,0.12)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
        <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
      </span>
    </button>
  );
}
