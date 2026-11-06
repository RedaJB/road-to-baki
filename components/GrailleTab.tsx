'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Minus, Sunrise, Sun, Moon, Apple, Droplets, Timer, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { useNutrition, type MealEntry, type MealType } from '../lib/nutrition-context';
import { useToast } from '../lib/toast-context';
import { useApp, FASTING_PLANS_UI } from '../lib/app-context';
import { useGoals } from '../lib/use-goals';
import { addDaysISO, todayISO } from '../lib/streak';
import { VERRE_ML } from '../lib/water';
import { AddMealSheet } from './AddMealSheet';
import { PaywallBottomSheet } from './PaywallBottomSheet';
import { FastingTimer } from './FastingTimer';
import { Ring } from './fx/Visuals';
import { Sheet, Tile } from './ui';

const MEALS: { type: MealType; label: string; Icon: LucideIcon; color: string }[] = [
  { type: 'petit_dej', label: 'Petit-déjeuner', Icon: Sunrise, color: '#e0a050' },
  { type: 'dej', label: 'Déjeuner', Icon: Sun, color: '#4caf7d' },
  { type: 'diner', label: 'Dîner', Icon: Moon, color: '#8e6cdf' },
  { type: 'snack', label: 'Snack', Icon: Apple, color: '#4d9fe0' },
];

function dateLabel(iso: string) {
  const today = todayISO();
  if (iso === today) return 'Aujourd’hui';
  if (iso === addDaysISO(today, -1)) return 'Hier';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
}

function fmtHours(h: number) {
  const m = Math.max(0, Math.floor(h * 60));
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 3 }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
        <span>
          <strong>{Math.round(value)}</strong>
          <span style={{ color: 'var(--text-muted)' }}> / {goal} g</span>
        </span>
      </div>
      <div className="tile__bar" style={{ marginTop: 0, height: 5 }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (value / Math.max(1, goal)) * 100)}%` }} transition={{ duration: 0.6 }} style={{ background: color }} />
      </div>
    </div>
  );
}

export function GrailleTab() {
  const today = todayISO();
  const [viewDate, setViewDate] = useState(today);
  const { getMealsForDate, removeMeal } = useNutrition();
  const { waterIntakeByDate, addWater, isPremium, setPremium, fastingStartedAt, fastingMode } = useApp();
  const { toast } = useToast();
  const goals = useGoals();

  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<MealType>('dej');
  const [editMeal, setEditMeal] = useState<MealEntry | null>(null);
  const [listType, setListType] = useState<MealType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [fastOpen, setFastOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const meals = getMealsForDate(viewDate);
  const byType = useMemo(() => {
    const map: Record<MealType, MealEntry[]> = { petit_dej: [], dej: [], diner: [], snack: [] };
    for (const m of meals) map[m.type].push(m);
    return map;
  }, [meals]);

  const total = meals.reduce(
    (acc, m) => ({ kcal: acc.kcal + (m.calories || 0), p: acc.p + (m.protein ?? 0), c: acc.c + (m.carbs ?? 0), f: acc.f + (m.fat ?? 0) }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
  const remaining = goals.calories - total.kcal;
  const water = waterIntakeByDate[viewDate] ?? 0;
  const fastGoal = FASTING_PLANS_UI[fastingMode === 'none' ? '16-8' : fastingMode].hoursFast;
  const fastElapsed = fastingStartedAt ? (Date.now() - fastingStartedAt) / 3_600_000 : 0;

  const openAdd = (type: MealType) => {
    setEditMeal(null);
    setAddType(type);
    setAddOpen(true);
  };
  const listMeta = MEALS.find((m) => m.type === listType);

  return (
    <section className="screen">
      {/* En-tête */}
      <header className="screenHead">
        <div style={{ flex: 1 }}>
          <p className="screenHead__title">Graille</p>
          <p className="screenHead__sub" style={{ textTransform: 'capitalize' }}>{dateLabel(viewDate)}</p>
        </div>
        <button type="button" className="iconBtn" style={{ width: 36, height: 36 }} onClick={() => setViewDate(addDaysISO(viewDate, -1))} aria-label="Jour précédent">
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          className="iconBtn"
          style={{ width: 36, height: 36, opacity: viewDate >= today ? 0.35 : 1 }}
          disabled={viewDate >= today}
          onClick={() => setViewDate(addDaysISO(viewDate, 1))}
          aria-label="Jour suivant"
        >
          <ChevronRight size={17} />
        </button>
      </header>

      {/* Bilan */}
      <div className="panel mPanel mTone" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem' }}>
        <Ring pct={total.kcal / goals.calories} size={96} stroke={8} color={remaining < 0 ? '#e0a050' : 'var(--accent)'}>
          <div>
            <div className="statNum" style={{ fontSize: '1.35rem' }}>{Math.abs(Math.round(remaining))}</div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{remaining < 0 ? 'en trop' : 'restantes'}</div>
          </div>
        </Ring>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
          <MacroBar label="Protéines" value={total.p} goal={goals.protein} color="var(--macro-protein)" />
          <MacroBar label="Glucides" value={total.c} goal={goals.carbs} color="var(--macro-carbs)" />
          <MacroBar label="Lipides" value={total.f} goal={goals.fat} color="var(--macro-fat)" />
        </div>
      </div>

      {/* Repas */}
      <div className="panel grow scrollY" style={{ padding: '0.3rem 0.9rem' }}>
        {MEALS.map(({ type, label, Icon, color }) => {
          const list = byType[type];
          const kcal = list.reduce((s, m) => s + m.calories, 0);
          return (
            <div key={type} className="listRow" style={{ padding: '0.6rem 0' }}>
              <button
                type="button"
                onClick={() => (list.length ? setListType(type) : openAdd(type))}
                style={{ all: 'unset', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
              >
                <span className="rowIcon" style={{ color, background: `${color}1a` }}>
                  <Icon size={17} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <p className="rowTitle">{label}</p>
                  <p className="rowSub">{list.length ? `${list.map((m) => m.label).join(', ')}` : 'Rien pour l’instant'}</p>
                </span>
              </button>
              {list.length > 0 && <span className="statNum" style={{ fontSize: '1rem', whiteSpace: 'nowrap' }}>{Math.round(kcal)}<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> kcal</span></span>}
              <button type="button" className="tileBtn" style={{ width: 32, height: 32 }} onClick={() => openAdd(type)} aria-label={`Ajouter au ${label}`}>
                <Plus size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Eau + jeûne */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Tile
          icon={<Droplets size={15} />}
          label="Eau"
          color="#4d9fe0"
          value={
            <>
              {(water / 1000).toFixed(2).replace('.', ',')}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> L</span>
            </>
          }
          sub={`objectif ${(goals.waterMl / 1000).toFixed(1).replace('.', ',')} L`}
          pct={water / goals.waterMl}
          action={
            <span style={{ display: 'flex', gap: 4 }}>
              <button type="button" className="tileBtn" aria-label="Retirer un verre" onClick={() => addWater(viewDate, -Math.min(VERRE_ML, water))}>
                <Minus size={14} />
              </button>
              <button type="button" className="tileBtn" aria-label="Ajouter un verre" onClick={() => { addWater(viewDate, VERRE_ML); toast('+250 ml'); }}>
                <Plus size={14} />
              </button>
            </span>
          }
        />
        <Tile
          icon={<Timer size={15} />}
          label="Jeûne"
          color="#e09a45"
          value={fastingStartedAt ? fmtHours(fastElapsed) : `${fastGoal}h`}
          sub={fastingStartedAt ? `objectif ${fastGoal}h` : 'Démarrer'}
          pct={fastingStartedAt ? fastElapsed / fastGoal : undefined}
          onClick={() => setFastOpen(true)}
        />
      </div>

      {/* Liste d'un repas */}
      <Sheet open={!!listType} onClose={() => { setListType(null); setConfirmDelete(null); }} title={listMeta?.label}>
        {listType &&
          byType[listType].map((m) => (
            <div key={m.id} className="listRow">
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="rowTitle">{m.label}</p>
                <p className="rowSub">
                  {Math.round(m.calories)} kcal
                  {m.protein != null ? ` · P ${Math.round(m.protein)} g` : ''}
                  {m.carbs != null ? ` · G ${Math.round(m.carbs)} g` : ''}
                  {m.fat != null ? ` · L ${Math.round(m.fat)} g` : ''}
                </p>
              </div>
              <button type="button" className="tileBtn" aria-label="Modifier" onClick={() => { setEditMeal(m); setAddType(m.type); setListType(null); setAddOpen(true); }}>
                <Pencil size={14} />
              </button>
              {confirmDelete === m.id ? (
                <button
                  type="button"
                  className="tileBtn"
                  style={{ width: 'auto', padding: '0 0.6rem', background: '#b4373b', borderColor: '#b4373b', fontSize: '0.75rem', fontWeight: 700 }}
                  onClick={() => {
                    removeMeal(m.id);
                    setConfirmDelete(null);
                    toast('Repas supprimé', 'info');
                    if (byType[m.type].length <= 1) setListType(null);
                  }}
                >
                  Supprimer
                </button>
              ) : (
                <button type="button" className="tileBtn" aria-label="Supprimer" onClick={() => setConfirmDelete(m.id)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        {listType && (
          <button type="button" className="btnFight" style={{ marginTop: '0.9rem' }} onClick={() => { const t = listType; setListType(null); openAdd(t); }}>
            <Plus size={18} /> Ajouter
          </button>
        )}
      </Sheet>

      <Sheet open={fastOpen} onClose={() => setFastOpen(false)} title="Jeûne">
        <FastingTimer isPremium={isPremium} onUnlockPremium={() => setPaywallOpen(true)} />
      </Sheet>

      {addOpen && (
        <AddMealSheet
          onClose={() => {
            setAddOpen(false);
            setEditMeal(null);
          }}
          initialMealType={addType}
          editMeal={editMeal}
          date={viewDate}
          onRequirePremium={() => setPaywallOpen(true)}
        />
      )}

      <PaywallBottomSheet isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} onUnlock={() => setPremium(true)} />
    </section>
  );
}
