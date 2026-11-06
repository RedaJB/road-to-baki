'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  Check,
  Minus,
  Plus,
  TrendingDown,
  Dumbbell,
  Shuffle,
  HeartPulse,
  Armchair,
  Footprints,
  Zap,
  Building2,
  Home,
  Sprout,
  Shield,
  Mountain,
  Flame,
  type LucideIcon,
} from 'lucide-react';
import type { Douleur, OnboardingAnswers } from '../lib/onboarding-context';
import { useCustomization } from '../lib/customization-context';
import { useGoals } from '../lib/use-goals';
import { buildPlan, buildSession, estimateMinutes, scheduleFor } from '../lib/programs';
import { addDaysISO, todayISO } from '../lib/streak';
import { FighterIllustration } from './fx/Fighters';

type OnboardingFormProps = {
  answers: OnboardingAnswers;
  setAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
  step: number;
  nextStep: () => void;
  prevStep: () => void;
  completeOnboarding: () => void;
};

const STEPS = ['welcome', 'goal', 'body', 'target', 'activity', 'training', 'pain', 'mental', 'name', 'result'] as const;
type StepId = (typeof STEPS)[number];
/** Étapes où un choix fait avancer automatiquement */
const AUTO_ADVANCE: StepId[] = ['goal', 'activity', 'mental'];

const GOALS = [
  { v: 'maigrir', label: 'Perdre du gras', desc: 'Sécher et gagner en définition', Icon: TrendingDown },
  { v: 'prendre_muscle', label: 'Prendre du muscle', desc: 'Gagner en masse et en force', Icon: Dumbbell },
  { v: 'recomposition', label: 'Les deux', desc: 'Perdre du gras, gagner du muscle', Icon: Shuffle },
  { v: 'forme', label: 'Être en forme', desc: 'Énergie, cardio, santé', Icon: HeartPulse },
] as const;

const ACTIVITIES = [
  { v: 'sedentaire', label: 'Plutôt assis', desc: 'Bureau, études, peu de marche', Icon: Armchair },
  { v: 'actif', label: 'Actif', desc: 'Debout souvent, marche régulière', Icon: Footprints },
  { v: 'tres_actif', label: 'Très actif', desc: 'Métier physique ou sport quotidien', Icon: Zap },
] as const;

const MENTAL = [
  { v: 'debutant', label: 'Je découvre', desc: 'Repos plus longs, on construit les bases', Icon: Sprout },
  { v: 'guerrier', label: 'Je tiens le rythme', desc: 'Repos standard', Icon: Shield },
  { v: 'monstre', label: 'J’aime l’intensité', desc: 'Repos raccourcis', Icon: Mountain },
  { v: 'demon', label: 'Rien ne m’arrête', desc: 'Repos courts, densité maximale', Icon: Flame },
] as const;

const PAINS: { v: Douleur; label: string }[] = [
  { v: 'dos', label: 'Dos' },
  { v: 'genoux', label: 'Genoux' },
  { v: 'epaules', label: 'Épaules' },
  { v: 'poignets', label: 'Poignets' },
  { v: 'autre', label: 'Autre' },
];

/* ───────────── Petits composants ───────────── */

function OptionCard({
  selected,
  onClick,
  Icon,
  label,
  desc,
  index = 0,
}: {
  selected: boolean;
  onClick: () => void;
  Icon: LucideIcon;
  label: string;
  desc?: string;
  index?: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
      whileTap={{ scale: 0.98 }}
      className="ob-option"
      data-selected={selected}
    >
      <span className="ob-option__icon">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="ob-option__label">{label}</span>
        {desc && <span className="ob-option__desc">{desc}</span>}
      </span>
      <span className="ob-option__check">{selected && <Check size={14} strokeWidth={3} />}</span>
    </motion.button>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { v: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="ob-seg" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button key={String(o.v)} type="button" className="ob-seg__item" data-selected={value === o.v} onClick={() => onChange(o.v)}>
          {value === o.v && <motion.span layoutId={`seg-${options.map((x) => x.v).join('-')}`} className="ob-seg__pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span style={{ position: 'relative' }}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
  hint?: React.ReactNode;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="ob-field">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="ob-label">{label}</span>
        {hint}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0.35rem 0 0.6rem' }}>
        <button type="button" className="ob-step" onClick={() => onChange(clamp(value - step))} aria-label={`Diminuer ${label}`}>
          <Minus size={16} />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <motion.span key={value} initial={{ opacity: 0.4, y: -3 }} animate={{ opacity: 1, y: 0 }} className="ob-big">
            {Number.isInteger(value) ? value : value.toFixed(1).replace('.', ',')}
          </motion.span>
          <span className="ob-unit">{unit}</span>
        </div>
        <button type="button" className="ob-step" onClick={() => onChange(clamp(value + step))} aria-label={`Augmenter ${label}`}>
          <Plus size={16} />
        </button>
      </div>
      <input
        type="range"
        className="ob-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(parseFloat(e.target.value)))}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        aria-label={label}
      />
    </div>
  );
}

function Title({ kicker, children, sub }: { kicker?: string; children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: '1.4rem' }}>
      {kicker && <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>{kicker}</p>}
      <h2 className="ob-title">{children}</h2>
      {sub && <p className="ob-sub">{sub}</p>}
    </div>
  );
}

function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [n, setN] = React.useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <>
      {n.toLocaleString('fr-FR')}
      {suffix}
    </>
  );
}

/* ───────────── Questionnaire ───────────── */

export function OnboardingForm({ answers, setAnswer, step, nextStep, prevStep, completeOnboarding }: OnboardingFormProps) {
  const custom = useCustomization();
  const goals = useGoals();
  const idx = Math.min(Math.max(0, step), STEPS.length - 1);
  const id: StepId = STEPS[idx];
  const prevIdx = useRef(idx);
  const direction = idx >= prevIdx.current ? 1 : -1;
  useEffect(() => {
    prevIdx.current = idx;
  }, [idx]);

  // Valeurs par défaut pour les curseurs (évite un écran « vide »)
  useEffect(() => {
    if (id === 'body') {
      if (answers.age == null) setAnswer('age', 25);
      if (answers.taille == null) setAnswer('taille', answers.sexe === 'femme' ? 165 : 177);
      if (answers.poids == null) setAnswer('poids', answers.sexe === 'femme' ? 62 : 75);
    }
    if (id === 'target' && answers.poidsCible == null) {
      const p = answers.poids ?? 75;
      const delta = answers.objectifPrincipal === 'maigrir' ? -5 : answers.objectifPrincipal === 'prendre_muscle' ? 5 : 0;
      setAnswer('poidsCible', p + delta);
    }
    if (id === 'training') {
      if (answers.frequence == null) setAnswer('frequence', 3);
      if (answers.trainingLocation == null) setAnswer('trainingLocation', 'salle');
    }
  }, [id, answers.age, answers.taille, answers.poids, answers.poidsCible, answers.sexe, answers.objectifPrincipal, answers.frequence, answers.trainingLocation, setAnswer]);

  const valid = useMemo(() => {
    switch (id) {
      case 'goal':
        return !!answers.objectifPrincipal;
      case 'body':
        return !!answers.sexe && !!answers.age && !!answers.taille && !!answers.poids;
      case 'target':
        return answers.poidsCible != null;
      case 'activity':
        return !!answers.activite;
      case 'training':
        return !!answers.experience && !!answers.frequence && !!answers.trainingLocation;
      case 'pain':
        return Array.isArray(answers.douleurs);
      case 'mental':
        return !!answers.resilience;
      default:
        return true;
    }
  }, [id, answers]);

  const advanceTimer = useRef<number | null>(null);
  const pickAndAdvance = useCallback(
    <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
      setAnswer(key, value);
      if (AUTO_ADVANCE.includes(id)) {
        if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
        advanceTimer.current = window.setTimeout(nextStep, 280);
      }
    },
    [id, setAnswer, nextStep],
  );
  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
  }, []);

  const goNext = useCallback(() => {
    if (!valid) return;
    if (id === 'result') completeOnboarding();
    else nextStep();
  }, [valid, id, completeOnboarding, nextStep]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext]);

  const questionCount = STEPS.length - 2; // sans accueil ni résultat
  const progress = Math.min(1, Math.max(0, (idx - 1 + (valid ? 1 : 0.5)) / questionCount));
  const showChrome = id !== 'welcome' && id !== 'result';

  /* — contenu de chaque étape — */
  let content: React.ReactNode = null;

  if (id === 'welcome') {
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <div style={{ position: 'relative', margin: '0 -1.25rem', height: 310, display: 'flex', justifyContent: 'center', overflow: 'hidden', background: 'radial-gradient(circle at 50% 55%, rgba(var(--accent-rgb),0.22), transparent 62%)' }} aria-hidden>
          <div style={{ width: 310, alignSelf: 'flex-end' }}>
            <FighterIllustration id="baki" size="100%" bare rounded="0" variant="full" />
          </div>
          <div style={{ position: 'absolute', inset: 'auto 0 0 0', height: 48, background: 'linear-gradient(transparent, var(--bg))' }} />
        </div>
        <div style={{ marginTop: '1.2rem' }}>
          <p className="eyebrow" style={{ marginBottom: '0.6rem' }}>
            <span className="jp" style={{ marginRight: 8 }}>最強への道</span>Road to Baki
          </p>
          <h1 className="ob-title" style={{ fontSize: 'clamp(2rem, 9vw, 2.6rem)' }}>
            Entraîne-toi comme Baki.
          </h1>
          <p className="ob-sub">Un programme sur mesure, adapté à ton corps, ton matériel et tes blessures. Ton plan en une minute.</p>
        </div>
      </div>
    );
  }

  if (id === 'goal') {
    content = (
      <>
        <Title kicker="Objectif" sub="On calibre tes calories et ton programme dessus.">
          Qu’est-ce que tu veux changer ?
        </Title>
        <div className="ob-stack">
          {GOALS.map((g, i) => (
            <OptionCard key={g.v} index={i} selected={answers.objectifPrincipal === g.v} onClick={() => pickAndAdvance('objectifPrincipal', g.v)} Icon={g.Icon} label={g.label} desc={g.desc} />
          ))}
        </div>
      </>
    );
  }

  if (id === 'body') {
    content = (
      <>
        <Title kicker="Profil" sub="Pour estimer ta dépense énergétique.">
          Parle-nous de toi
        </Title>
        <Segmented
          options={[
            { v: 'homme', label: 'Homme' },
            { v: 'femme', label: 'Femme' },
          ]}
          value={answers.sexe}
          onChange={(v) => setAnswer('sexe', v as 'homme' | 'femme')}
        />
        <div className="ob-stack" style={{ marginTop: '0.8rem' }}>
          <NumberField label="Âge" value={answers.age ?? 25} min={13} max={80} unit="ans" onChange={(v) => setAnswer('age', v)} />
          <NumberField label="Taille" value={answers.taille ?? 175} min={140} max={215} unit="cm" onChange={(v) => setAnswer('taille', v)} />
          <NumberField label="Poids" value={answers.poids ?? 75} min={40} max={180} step={0.5} unit="kg" onChange={(v) => setAnswer('poids', v)} />
        </div>
      </>
    );
  }

  if (id === 'target') {
    const poids = answers.poids ?? 75;
    const cible = answers.poidsCible ?? poids;
    const delta = Math.round((cible - poids) * 10) / 10;
    const weeks = answers.dateObjectif ? Math.max(1, (new Date(`${answers.dateObjectif}T12:00:00`).getTime() - Date.now()) / (7 * 864e5)) : null;
    const rate = weeks ? Math.abs(delta) / weeks : null;
    const quick = [
      { label: '3 mois', d: 91 },
      { label: '6 mois', d: 182 },
      { label: '1 an', d: 365 },
    ];
    content = (
      <>
        <Title kicker="Cible" sub="Tu pourras la changer à tout moment.">
          Où veux-tu arriver ?
        </Title>
        <NumberField
          label="Poids visé"
          value={cible}
          min={Math.max(40, Math.round(poids - 40))}
          max={Math.min(180, Math.round(poids + 40))}
          step={0.5}
          unit="kg"
          onChange={(v) => setAnswer('poidsCible', v)}
          hint={
            <span className="tag" style={{ color: delta === 0 ? 'var(--text-secondary)' : 'var(--accent)' }}>
              {delta === 0 ? 'Maintien' : `${delta > 0 ? '+' : ''}${delta} kg`}
            </span>
          }
        />
        <div className="ob-field" style={{ marginTop: '0.8rem' }}>
          <span className="ob-label">Échéance (optionnel)</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '0.6rem 0' }}>
            {quick.map((q) => {
              const iso = addDaysISO(todayISO(), q.d);
              const sel = answers.dateObjectif === iso;
              return (
                <button key={q.label} type="button" className={sel ? 'chipActive' : 'chip'} onClick={() => setAnswer('dateObjectif', sel ? null : iso)}>
                  {q.label}
                </button>
              );
            })}
          </div>
          <input
            type="date"
            className="input"
            min={todayISO()}
            value={answers.dateObjectif ?? ''}
            onChange={(e) => setAnswer('dateObjectif', e.target.value || null)}
            style={{ width: '100%', padding: '0.7rem 0.8rem' }}
          />
          {rate !== null && delta !== 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ margin: '0.7rem 0 0', fontSize: '0.82rem', color: rate > 1 ? '#e0a050' : 'var(--text-secondary)' }}>
              {rate > 1
                ? `Rythme de ${rate.toFixed(1)} kg/semaine : ambitieux. Vise plutôt une échéance plus lointaine.`
                : `Rythme de ${rate.toFixed(2).replace('.', ',')} kg/semaine : réaliste et durable.`}
            </motion.p>
          )}
        </div>
      </>
    );
  }

  if (id === 'activity') {
    content = (
      <>
        <Title kicker="Quotidien" sub="Hors entraînement.">
          Ta journée type ressemble à…
        </Title>
        <div className="ob-stack">
          {ACTIVITIES.map((a, i) => (
            <OptionCard key={a.v} index={i} selected={answers.activite === a.v} onClick={() => pickAndAdvance('activite', a.v)} Icon={a.Icon} label={a.label} desc={a.desc} />
          ))}
        </div>
      </>
    );
  }

  if (id === 'training') {
    content = (
      <>
        <Title kicker="Entraînement" sub="Le volume et les exercices s’adaptent à tes réponses.">
          Comment tu t’entraînes ?
        </Title>
        <span className="ob-label">Niveau</span>
        <div style={{ margin: '0.45rem 0 1.1rem' }}>
          <Segmented
            options={[
              { v: 'debutant', label: 'Débutant' },
              { v: 'intermediaire', label: 'Inter.' },
              { v: 'avance', label: 'Avancé' },
            ]}
            value={answers.experience}
            onChange={(v) => setAnswer('experience', v as OnboardingAnswers['experience'])}
          />
        </div>
        <span className="ob-label">Séances par semaine</span>
        <div style={{ margin: '0.45rem 0 1.1rem' }}>
          <Segmented options={[1, 2, 3, 4, 5, 6].map((n) => ({ v: n, label: String(n) }))} value={answers.frequence} onChange={(v) => setAnswer('frequence', v)} />
        </div>
        <span className="ob-label">Lieu</span>
        <div className="ob-grid2" style={{ marginTop: '0.45rem' }}>
          {([
            { v: 'salle', label: 'Salle', desc: 'Barres, haltères, machines', Icon: Building2 },
            { v: 'maison', label: 'Maison', desc: 'Poids du corps uniquement', Icon: Home },
          ] as const).map((l) => (
            <button key={l.v} type="button" className="ob-tile" data-selected={answers.trainingLocation === l.v} onClick={() => setAnswer('trainingLocation', l.v)}>
              <l.Icon size={22} strokeWidth={1.8} />
              <span className="ob-option__label" style={{ marginTop: 8 }}>{l.label}</span>
              <span className="ob-option__desc">{l.desc}</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  if (id === 'pain') {
    const list = answers.douleurs ?? [];
    const none = Array.isArray(answers.douleurs) && list.length === 0;
    content = (
      <>
        <Title kicker="Santé" sub="Les exercices à risque seront remplacés automatiquement.">
          Une zone à ménager ?
        </Title>
        <button type="button" className="ob-tile ob-tile--row" data-selected={none} onClick={() => setAnswer('douleurs', [])}>
          <span className="ob-option__label">Aucune douleur</span>
          <span className="ob-option__check">{none && <Check size={14} strokeWidth={3} />}</span>
        </button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '0.8rem' }}>
          {PAINS.map((p) => {
            const sel = list.includes(p.v);
            return (
              <motion.button
                key={p.v}
                type="button"
                whileTap={{ scale: 0.95 }}
                className={sel ? 'chipActive' : 'chip'}
                style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', fontWeight: 600 }}
                onClick={() => setAnswer('douleurs', sel ? list.filter((x) => x !== p.v) : [...list, p.v])}
              >
                {sel && <Check size={13} strokeWidth={3} style={{ marginRight: 5, verticalAlign: '-2px' }} />}
                {p.label}
              </motion.button>
            );
          })}
        </div>
      </>
    );
  }

  if (id === 'mental') {
    content = (
      <>
        <Title kicker="Intensité" sub="Ça règle la durée de tes temps de repos.">
          Ton rapport à l’effort ?
        </Title>
        <div className="ob-stack">
          {MENTAL.map((m, i) => (
            <OptionCard key={m.v} index={i} selected={answers.resilience === m.v} onClick={() => pickAndAdvance('resilience', m.v)} Icon={m.Icon} label={m.label} desc={m.desc} />
          ))}
        </div>
      </>
    );
  }

  if (id === 'name') {
    content = (
      <>
        <Title kicker="Dernière étape" sub="Il apparaîtra sur ta carte de combattant. Tu peux passer.">
          Comment on t’appelle ?
        </Title>
        <input
          className="input ob-input"
          autoFocus
          maxLength={20}
          value={custom.pseudo}
          onChange={(e) => custom.update({ pseudo: e.target.value })}
          placeholder="Ton nom de combattant"
        />
      </>
    );
  }

  if (id === 'result') {
    const program = buildPlan({ goal: answers.objectifPrincipal, location: answers.trainingLocation, frequency: answers.frequence });
    const firstSession = buildSession(program, 0, {
      location: answers.trainingLocation,
      douleurs: answers.douleurs,
      experience: answers.experience,
      resilience: answers.resilience,
      goal: answers.objectifPrincipal,
      frequency: answers.frequence,
    });
    const adapted = firstSession.filter((e) => e.swapped).length;
    content = (
      <>
        <Title kicker="Ton plan est prêt" sub={custom.pseudo ? `Bienvenue, ${custom.pseudo}.` : 'Voilà ce qu’on a préparé pour toi.'}>
          Ton programme sur mesure
        </Title>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="panel" style={{ display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-impact)', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{program.tagline}</p>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {scheduleFor(program, answers.frequence)
                .map((d) => d.name)
                .join(' · ')}
            </p>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              1ʳᵉ séance ~{estimateMinutes(firstSession)} min · progression par blocs de 4 semaines
            </p>
          </div>
        </motion.div>
        <div className="ob-grid2">
          {[
            { label: 'Calories / jour', value: goals.calories, suffix: '' },
            { label: 'Protéines', value: goals.protein, suffix: ' g' },
            { label: 'Eau', value: Math.round(goals.waterMl / 100) / 10, suffix: ' L', raw: true },
            { label: 'Séances / semaine', value: answers.frequence ?? 3, suffix: '' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="panel" style={{ marginBottom: 0, padding: '0.85rem' }}>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{s.label}</p>
              <p className="statNum" style={{ margin: '0.3rem 0 0', fontSize: '1.6rem' }}>
                {s.raw ? `${s.value.toLocaleString('fr-FR')}${s.suffix}` : <CountUp value={s.value} suffix={s.suffix} />}
              </p>
            </motion.div>
          ))}
        </div>
        <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="ob-checklist">
          <li><Check size={14} /> {answers.trainingLocation === 'maison' ? 'Exercices sans matériel' : 'Exercices en salle'}</li>
          {adapted > 0 && <li><Check size={14} /> {adapted} exercice{adapted > 1 ? 's' : ''} adapté{adapted > 1 ? 's' : ''} à tes douleurs</li>}
          <li><Check size={14} /> Volume ajusté à ton niveau</li>
        </motion.ul>
      </>
    );
  }

  const cta =
    id === 'welcome' ? 'Commencer' : id === 'result' ? 'Entrer dans l’arène' : id === 'name' && !custom.pseudo ? 'Passer' : 'Continuer';

  return (
    <div className="ob">
      {showChrome && (
        <header className="ob-header">
          <button type="button" className="iconBtn" onClick={prevStep} aria-label="Retour" style={{ width: 38, height: 38 }}>
            <ChevronLeft size={18} />
          </button>
          <div className="ob-progress">
            <motion.div className="ob-progress__fill" animate={{ width: `${progress * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 34, textAlign: 'right' }}>
            {idx}/{questionCount}
          </span>
        </header>
      )}

      <main className="ob-body">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={id}
            custom={direction}
            initial={{ opacity: 0, x: 24 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 * direction }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ height: '100%' }}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="ob-footer">
        {id === 'result' && (
          <button type="button" className="ob-link" onClick={prevStep}>
            Modifier mes réponses
          </button>
        )}
        <motion.button type="button" whileTap={{ scale: valid ? 0.98 : 1 }} className="btnFight" onClick={goNext} disabled={!valid}>
          {cta}
        </motion.button>
      </footer>
    </div>
  );
}
