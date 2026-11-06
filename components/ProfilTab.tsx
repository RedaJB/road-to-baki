'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Paintbrush, Settings, Plus, Crown, Trophy, Pencil, RotateCcw, ChevronRight, Watch } from 'lucide-react';
import { useApp, FASTING_PLANS_UI, type FastingMode } from '../lib/app-context';
import { useToast } from '../lib/toast-context';
import { useOnboarding, type Douleur } from '../lib/onboarding-context';
import { useTraining } from '../lib/training-context';
import { useStreak } from '../lib/streak-context';
import { EXERCISES } from '../lib/programs';
import { WeightCurve } from './WeightCurve';
import { EditProfileSheet } from './EditProfileSheet';
import { CustomizeSheet, FighterCard } from './CustomizeSheet';
import { PaywallBottomSheet } from './PaywallBottomSheet';
import { BadgeIcon, type BadgeId } from './fx/Visuals';
import { Segmented, Sheet } from './ui';
import { ConnectDeviceSheet } from './ConnectDeviceSheet';
import { RankStamp } from './fx/Manga';
import { powerRank } from '../lib/power-rank';

const DOULEURS: { value: Douleur | 'none'; label: string }[] = [
  { value: 'none', label: 'Aucune' },
  { value: 'dos', label: 'Dos' },
  { value: 'genoux', label: 'Genoux' },
  { value: 'epaules', label: 'Épaules' },
  { value: 'poignets', label: 'Poignets' },
  { value: 'autre', label: 'Autre' },
];

type View = 'poids' | 'records' | 'trophees';

export function ProfilTab() {
  const { weightHistory, addWeight, fastingMode, setFastingMode, douleurs, setDouleurs, fastingHistory, isPremium, setPremium } = useApp();
  const { answers: o } = useOnboarding();
  const { logs, prs } = useTraining();
  const { trainingStreak, longestWarrior } = useStreak();
  const { toast } = useToast();
  const [view, setView] = useState<View>('poids');
  const [sheet, setSheet] = useState<'settings' | 'custom' | 'weight' | 'devices' | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [badgeOpen, setBadgeOpen] = useState<BadgeId | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const history = useMemo(() => weightHistory.filter((e) => e.weight >= 30 && e.weight <= 300).sort((a, b) => a.date.localeCompare(b.date)), [weightHistory]);
  const current = history.length ? history[history.length - 1].weight : o.poids ?? 0;
  const start = history.length ? history[0].weight : o.poids ?? current;
  const target = o.poidsCible ?? 0;
  const total = Math.abs(target - start);
  const done = target ? (target < start ? start - current : current - start) : 0;
  const pct = total > 0 ? Math.max(0, Math.min(1, done / total)) : 0;

  const totalVolume = logs.reduce((s, l) => s + l.volume, 0);
  const totalMin = Math.round(logs.reduce((s, l) => s + l.durationSec, 0) / 60);
  const maxPr = Object.values(prs).reduce((m, p) => Math.max(m, p.weight), 0);
  const fastsDone = fastingHistory.filter((f) => f.hours >= f.goal).length;
  const blocDone = logs.filter((l) => l.programId === 'perso').length;
  const bestStreak = Math.max(trainingStreak, longestWarrior);
  const douleursList = douleurs ?? o.douleurs ?? null;
  const power = powerRank({ sessions: logs.length, bestStreak, volumeKg: totalVolume, records: Object.keys(prs).length });

  const badges: { id: BadgeId; name: string; desc: string; progress: number; label: string }[] = [
    { id: 'first_workout', name: 'Premier pas', desc: 'Termine ta première séance.', progress: Math.min(1, logs.length), label: `${Math.min(1, logs.length)}/1` },
    { id: 'streak', name: 'Régulier', desc: '7 jours d’entraînement d’affilée.', progress: Math.min(1, bestStreak / 7), label: `${Math.min(7, bestStreak)}/7 j` },
    { id: 'heavy', name: 'Brise-roc', desc: 'Soulève 100 kg ou cumule 10 tonnes.', progress: Math.min(1, Math.max(maxPr / 100, totalVolume / 10000)), label: maxPr >= 100 ? '100 kg ✓' : `${(totalVolume / 1000).toFixed(1)}/10 t` },
    { id: 'back_day', name: 'Premier bloc', desc: '12 séances de ton programme.', progress: Math.min(1, blocDone / 12), label: `${Math.min(12, blocDone)}/12` },
    { id: 'fasting', name: 'Ascète', desc: 'Réussis un jeûne complet.', progress: Math.min(1, fastsDone), label: `${Math.min(1, fastsDone)}/1` },
    { id: 'champion', name: 'Champion', desc: '25 séances terminées.', progress: Math.min(1, logs.length / 25), label: `${Math.min(25, logs.length)}/25` },
  ];
  const badge = badges.find((b) => b.id === badgeOpen);

  const prList = Object.entries(prs)
    .map(([id, p]) => ({ id, name: EXERCISES[id]?.name ?? id, ...p }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 7);

  const saveWeight = () => {
    const w = parseFloat(newWeight.replace(',', '.'));
    if (!Number.isNaN(w) && w >= 30 && w <= 300) {
      addWeight(w);
      toast(`${w} kg enregistré`);
      setNewWeight('');
      setSheet(null);
    } else {
      toast('Poids invalide (30–300 kg)', 'info');
    }
  };

  const toggleDouleur = (value: Douleur | 'none') => {
    if (value === 'none') return setDouleurs([]);
    const list = douleursList ?? [];
    setDouleurs(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const resetAll = () => {
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith('roadtobaki_') || k === 'baki_fasting_start')
        .forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // ignore
    }
    window.location.reload();
  };

  return (
    <section className="screen">
      <header className="screenHead">
        <p className="screenHead__title" style={{ flex: 1 }}>Dojo</p>
        <button type="button" className="iconBtn" onClick={() => setSheet('custom')} aria-label="Personnaliser">
          <Paintbrush size={17} />
        </button>
        <button type="button" className="iconBtn" onClick={() => setSheet('settings')} aria-label="Réglages">
          <Settings size={17} />
        </button>
      </header>

      <div onClick={() => setSheet('custom')} style={{ cursor: 'pointer' }}>
        <FighterCard
          aside={
            <div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0, paddingRight: 2 }}
              title={power.next ? `${power.score} / ${power.next.at} pts avant le rang ${power.next.rank}` : `${power.score} pts`}
            >
              <RankStamp rank={power.rank} kanji={power.kanji} size={54} />
              <span style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{power.label}</span>
              <span style={{ width: 50, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${Math.round(power.pct * 100)}%`, background: 'var(--accent)' }} />
              </span>
            </div>
          }
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {[
          { v: logs.length, l: 'Séances' },
          { v: `${trainingStreak} j`, l: 'Série' },
          { v: totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)} t` : `${Math.round(totalVolume)}`, l: 'Volume' },
          { v: totalMin, l: 'Minutes' },
        ].map((s) => (
          <div key={s.l} className="tile" style={{ alignItems: 'center', padding: '0.6rem 0.3rem' }}>
            <span className="tile__value" style={{ marginTop: 0, fontSize: '1.2rem' }}>{s.v}</span>
            <span className="tile__label" style={{ fontSize: '0.6rem' }}>{s.l}</span>
          </div>
        ))}
      </div>

      <Segmented
        id="dojo-view"
        value={view}
        onChange={setView}
        options={[
          { v: 'poids', label: 'Poids' },
          { v: 'records', label: 'Records' },
          { v: 'trophees', label: 'Trophées' },
        ]}
      />

      <div className="panel grow" style={{ padding: '0.85rem 0.95rem', overflowY: view === 'poids' ? 'hidden' : 'auto' }}>
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {view === 'poids' && (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <span className="statNum" style={{ fontSize: '2rem' }}>{current || '—'}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>kg</span>
                    {target > 0 && <span style={{ color: 'var(--text-secondary)', marginLeft: 8, fontSize: '0.85rem' }}>→ {target} kg</span>}
                  </div>
                  <button type="button" className="btnPrimary" style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setSheet('weight')}>
                    <Plus size={14} /> Pesée
                  </button>
                </div>
                {total > 0 && (
                  <>
                    <div className="tile__bar" style={{ height: 5 }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} style={{ background: 'var(--accent)' }} />
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {Math.round(pct * 100)} % du chemin · {Math.abs(Math.round((target - current) * 10) / 10)} kg restants
                    </p>
                  </>
                )}
                <div style={{ flex: 1, minHeight: 0, marginTop: 8 }}>
                  <WeightCurve fill history={history} poidsCible={target || undefined} dateObjectif={o.dateObjectif || undefined} poidsActuel={current} poidsInitial={start} />
                </div>
              </>
            )}

            {view === 'records' &&
              (prList.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 240 }}>
                  <Trophy size={26} style={{ marginBottom: 6 }} />
                  <p style={{ margin: 0 }}>Note tes charges pendant les séances : tes records s’afficheront ici.</p>
                </div>
              ) : (
                prList.map((p, i) => (
                  <div key={p.id} className="listRow">
                    <span style={{ width: 20, textAlign: 'center', color: i === 0 ? '#d9b26f' : 'var(--text-muted)', fontWeight: 700 }}>{i === 0 ? <Crown size={15} /> : i + 1}</span>
                    <span className="rowTitle" style={{ flex: 1 }}>{p.name}</span>
                    <span className="statNum" style={{ fontSize: '1.05rem' }}>
                      {p.weight}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> kg × {p.reps}</span>
                    </span>
                  </div>
                ))
              ))}

            {view === 'trophees' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem 0.4rem', margin: 'auto 0' }}>
                {badges.map((b) => {
                  const unlocked = b.progress >= 1;
                  return (
                    <button key={b.id} type="button" onClick={() => setBadgeOpen(b.id)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <BadgeIcon id={b.id} size={62} locked={!unlocked} />
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: unlocked ? 'var(--text)' : 'var(--text-muted)', textAlign: 'center' }}>{b.name}</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{unlocked ? '✓' : b.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pesée */}
      <Sheet open={sheet === 'weight'} onClose={() => setSheet(null)} title="Nouvelle pesée">
        <input
          className="input ob-input"
          autoFocus
          inputMode="decimal"
          value={newWeight}
          onChange={(e) => setNewWeight(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveWeight()}
          placeholder={`${current || 75} kg`}
          style={{ marginBottom: '1rem' }}
        />
        <button type="button" className="btnFight" onClick={saveWeight}>
          Enregistrer
        </button>
      </Sheet>

      {/* Réglages */}
      <Sheet open={sheet === 'settings'} onClose={() => { setSheet(null); setConfirmReset(false); }} title="Réglages">
        <button type="button" className="ob-tile ob-tile--row" style={{ marginBottom: '1rem' }} onClick={() => { setSheet(null); setShowEdit(true); }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pencil size={16} />
            <span className="ob-option__label">Modifier mon profil</span>
          </span>
          <ChevronRight size={16} color="var(--text-muted)" />
        </button>
        <button type="button" className="ob-tile ob-tile--row" style={{ margin: '-0.5rem 0 1rem' }} onClick={() => setSheet('devices')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Watch size={16} />
            <span className="ob-option__label">Appareils connectés</span>
          </span>
          <ChevronRight size={16} color="var(--text-muted)" />
        </button>

        <p className="tile__label" style={{ marginBottom: 8 }}>Douleurs</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1rem' }}>
          {DOULEURS.map((d) => {
            const sel = d.value === 'none' ? !douleursList?.length : douleursList?.includes(d.value as Douleur);
            return (
              <button key={d.value} type="button" onClick={() => toggleDouleur(d.value)} className={sel ? 'chipActive' : 'chip'}>
                {d.label}
              </button>
            );
          })}
        </div>

        <p className="tile__label" style={{ marginBottom: 8 }}>Jeûne</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1rem' }}>
          {(Object.keys(FASTING_PLANS_UI) as FastingMode[]).map((m) => (
            <button key={m} type="button" onClick={() => setFastingMode(m)} className={fastingMode === m ? 'chipActive' : 'chip'}>
              {m === 'none' ? 'Aucun' : m === 'omad' ? 'OMAD' : m.replace('-', ':')}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {isPremium ? (
            <button type="button" className="btnSecondary" style={{ flex: 1 }} onClick={() => { setPremium(false); toast('Pro désactivé', 'info'); }}>
              Désactiver Pro
            </button>
          ) : (
            <button type="button" className="btnSecondary" style={{ flex: 1 }} onClick={() => { setSheet(null); setShowPaywall(true); }}>
              Road to Baki Pro
            </button>
          )}
          {!confirmReset ? (
            <button type="button" className="btnSecondary" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => setConfirmReset(true)}>
              <RotateCcw size={14} /> Réinitialiser
            </button>
          ) : (
            <button type="button" className="btnPrimary" style={{ flex: 1, background: '#b4373b', color: '#fff' }} onClick={resetAll}>
              Tout effacer ?
            </button>
          )}
        </div>
      </Sheet>

      {/* Trophée */}
      <Sheet open={!!badge} onClose={() => setBadgeOpen(null)}>
        {badge && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '0.4rem 0 0.8rem' }}>
              <BadgeIcon id={badge.id} size={120} locked={badge.progress < 1} />
            </div>
            <h3 className="screenHead__title" style={{ fontSize: '1.5rem' }}>{badge.name}</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0.4rem 0 0.8rem' }}>{badge.desc}</p>
            <span className={badge.progress >= 1 ? 'tag tag--accent' : 'tag'}>{badge.progress >= 1 ? 'Débloqué' : badge.label}</span>
          </div>
        )}
      </Sheet>

      <CustomizeSheet open={sheet === 'custom'} onClose={() => setSheet(null)} />
      <ConnectDeviceSheet open={sheet === 'devices'} onClose={() => setSheet(null)} />
      {showEdit && <EditProfileSheet onClose={() => setShowEdit(false)} />}
      <PaywallBottomSheet isOpen={showPaywall} onClose={() => setShowPaywall(false)} onUnlock={() => { setPremium(true); toast('Pro activé'); }} />
    </section>
  );
}
