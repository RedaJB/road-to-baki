'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';
import { useNutrition, MealType, MealEntry } from '../lib/nutrition-context';
import { REPAS_SUGGESTIONS } from '../lib/exercises';
import { useToast } from '../lib/toast-context';
import { todayISO } from '../lib/streak';

interface AddMealSheetProps {
  onClose: () => void;
  initialMealType?: MealType;
  editMeal?: MealEntry | null;
  date?: string;
  onRequirePremium?: () => void;
}


const MEAL_TYPE_LABEL: Record<MealType, string> = {
  petit_dej: 'Petit-déjeuner',
  dej: 'Déjeuner',
  diner: 'Dîner',
  snack: 'Snack',
};

type SheetMode = 'choice' | 'search' | 'photo' | 'form';

/** Réduit la photo (bord max 1024 px, JPEG) avant envoi : plus rapide et moins de données */
async function shrinkPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82);
}

interface OpenFoodFactsProduct {
  product_name?: string;
  quantity?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal_value'?: number;
    energy_100g?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
}

const OFF_API = 'https://world.openfoodfacts.org/cgi/search.pl';

async function searchOpenFoodFacts(query: string): Promise<OpenFoodFactsProduct[]> {
  const url = `${OFF_API}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15`;
  const res = await fetch(url);
  const data = await res.json();
  const products = data?.products ?? [];
  return products.filter((p: OpenFoodFactsProduct) => p?.product_name);
}

export function AddMealSheet({ onClose, initialMealType = 'dej', editMeal, date, onRequirePremium }: AddMealSheetProps) {
  const today = editMeal?.date ?? date ?? todayISO();
  const { addMeal, updateMeal } = useNutrition();
  const { toast } = useToast();
  const [mode, setMode] = useState<SheetMode>(editMeal ? 'form' : 'choice');
  const [mealType, setMealType] = useState<MealType>(editMeal?.type ?? initialMealType);
  const [portionG, setPortionG] = useState('');
  const [label, setLabel] = useState(editMeal?.label ?? '');
  const [kcal, setKcal] = useState(editMeal ? String(editMeal.calories) : '');
  const [protein, setProtein] = useState(editMeal?.protein != null ? String(editMeal.protein) : '');
  const [carbs, setCarbs] = useState(editMeal?.carbs != null ? String(editMeal.carbs) : '');
  const [fat, setFat] = useState(editMeal?.fat != null ? String(editMeal.fat) : '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OpenFoodFactsProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [fromPhoto, setFromPhoto] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  const analyzePhoto = async (file: File) => {
    setMode('photo');
    setPhotoError(null);
    try {
      const dataUrl = await shrinkPhoto(file);
      setPhoto(dataUrl);
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, mimeType: 'image/jpeg' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) throw new Error('L’analyse photo n’est pas encore activée sur ce serveur.');
      if (!res.ok) throw new Error(data.error ?? 'Analyse impossible, réessaie.');
      if (!data.nom_plat || !data.calories_kcal) throw new Error('Aucun plat reconnu. Cadre bien l’assiette, en pleine lumière.');
      setLabel(data.nom_plat);
      setPortionG('');
      setKcal(String(Math.round(data.calories_kcal)));
      setProtein(String(Math.round(data.proteines_g)));
      setCarbs(String(Math.round(data.glucides_g)));
      setFat(String(Math.round(data.lipides_g)));
      setFromPhoto(true);
      setMode('form');
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Analyse impossible, réessaie.');
    }
  };

  const selectProduct = (p: OpenFoodFactsProduct) => {
    const n = p.nutriments ?? {};
    let kcal100 = n['energy-kcal_100g'] ?? n['energy-kcal_value'];
    if (kcal100 == null && n.energy_100g != null) kcal100 = n.energy_100g / 4.184;
    setLabel((p.product_name ?? '').trim());
    setPortionG('100');
    setKcal(kcal100 != null ? String(Math.round(kcal100)) : '');
    setProtein(n.proteins_100g != null ? String(Math.round(n.proteins_100g)) : '');
    setCarbs(n.carbohydrates_100g != null ? String(Math.round(n.carbohydrates_100g)) : '');
    setFat(n.fat_100g != null ? String(Math.round(n.fat_100g)) : '');
    setMode('form');
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const products = await searchOpenFoodFacts(q);
      setSearchResults(products);
      if (products.length === 0) setSearchError('Aucun résultat.');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Erreur recherche');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let cal = parseFloat(String(kcal).replace(',', '.')) || 0;
    const portion = parseFloat(String(portionG).replace(',', '.')) || 100;
    const factor = portion > 0 ? portion / 100 : 1;
    if (portion !== 100) cal = cal * factor;
    const calories = Math.round(cal);
    if (!label.trim() || Number.isNaN(calories) || calories <= 0) return;
    const proteinVal = protein ? Math.round(parseFloat(protein.replace(',', '.')) * factor || 0) : undefined;
    const carbsVal = carbs ? Math.round(parseFloat(carbs.replace(',', '.')) * factor || 0) : undefined;
    const fatVal = fat ? Math.round(parseFloat(fat.replace(',', '.')) * factor || 0) : undefined;
    if (editMeal) {
      updateMeal(editMeal.id, { date: today, type: mealType, label: label.trim(), calories, protein: proteinVal, carbs: carbsVal, fat: fatVal });
      toast('Repas modifié ✓');
    } else {
      addMeal({ date: today, type: mealType, label: label.trim(), calories, protein: proteinVal, carbs: carbsVal, fat: fatVal });
      toast('Repas ajouté ✓');
    }
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 130,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--surface)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          borderTop: '1px solid var(--border)',
          padding: '1.2rem 1.3rem 1.6rem',
          boxShadow: '0 -18px 45px rgba(0,0,0,0.7)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Ajouter un repas</h2>
          <button type="button" onClick={onClose} className="btnSecondary" style={{ padding: '0.25rem 0.6rem' }}>
            Fermer
          </button>
        </div>

        {mode === 'choice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Repas rapides</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
              {REPAS_SUGGESTIONS.slice(0, 6).map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setLabel(r.label);
                    setKcal(String(r.calories));
                    setProtein(String(r.protein));
                    setCarbs(String(r.carbs));
                    setFat(String(r.fat));
                    setPortionG(String((r as { portionG?: number }).portionG ?? 100));
                    setMode('form');
                  }}
                  className="chip"
                  style={{ fontSize: '0.78rem' }}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button type="button" className="btnPrimary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => photoInput.current?.click()}>
              <Camera size={17} /> Photo du repas
            </button>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) analyzePhoto(f);
              }}
            />
            <button type="button" className="btnSecondary" style={{ width: '100%' }} onClick={() => setMode('search')}>
              Rechercher un plat (Open Food Facts)
            </button>
            <button type="button" className="btnSecondary" style={{ width: '100%' }} onClick={() => setMode('form')}>
              Saisie manuelle
            </button>
          </div>
        )}

        {mode === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              className="btnSecondary"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => { setMode('choice'); setSearchQuery(''); setSearchResults([]); setSearchError(null); }}
            >
              Retour
            </button>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pizza, yaourt, Coca, riz..."
                autoFocus
                className="input"
                style={{ flex: 1 }}
              />
              <button type="submit" className="btnPrimary" disabled={searchLoading || !searchQuery.trim()}>
                {searchLoading ? '…' : 'Rechercher'}
              </button>
            </form>
            {searchError && <p style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>{searchError}</p>}
            {searchResults.length > 0 && (
              <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {searchResults.map((p, i) => {
                  const n = p.nutriments ?? {};
                  let kcal = n['energy-kcal_100g'] ?? n['energy-kcal_value'];
                  if (kcal == null && n.energy_100g != null) kcal = n.energy_100g / 4.184;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectProduct(p)}
                      style={{
                        padding: '0.6rem 0.75rem',
                        textAlign: 'left',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--text)',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.product_name ?? 'Sans nom'}</span>
                      {(kcal != null || n.proteins_100g != null) && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {kcal != null && `${Math.round(kcal)} kcal/100g`}
                          {(n.proteins_100g ?? n.carbohydrates_100g ?? n.fat_100g) != null && ' · P/G/L'}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {mode === 'photo' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', textAlign: 'center' }}>
            {photo && <img src={photo} alt="Ton repas" style={{ width: '100%', maxHeight: 230, objectFit: 'cover', borderRadius: 'var(--radius)' }} />}
            {photoError ? (
              <>
                <p style={{ fontSize: '0.88rem', color: 'var(--accent)' }}>{photoError}</p>
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <button type="button" className="btnSecondary" style={{ flex: 1 }} onClick={() => setMode('form')}>
                    Saisir à la main
                  </button>
                  <button type="button" className="btnPrimary" style={{ flex: 1 }} onClick={() => photoInput.current?.click()}>
                    Reprendre
                  </button>
                </div>
              </>
            ) : (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Analyse du repas…</p>
            )}
          </div>
        )}

        {mode === 'form' && (
        <>
          <button type="button" className="btnSecondary" style={{ alignSelf: 'flex-start', marginBottom: '0.25rem' }} onClick={editMeal ? onClose : () => setMode('choice')}>
            {editMeal ? 'Annuler' : 'Retour'}
          </button>
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
        >
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Type de repas</p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(Object.keys(MEAL_TYPE_LABEL) as MealType[]).map((type) => {
                const selected = mealType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMealType(type)}
                    style={{
                      borderRadius: '999px',
                      border: selected ? '1px solid var(--border-accent)' : '1px solid var(--border)',
                      background: selected ? 'var(--accent-dim)' : 'transparent',
                      color: selected ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      padding: '0.28rem 0.7rem',
                    }}
                  >
                    {MEAL_TYPE_LABEL[type]}
                  </button>
                );
              })}
            </div>
          </div>

          {fromPhoto && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--accent-dim)', borderRadius: 'var(--radius)', padding: '0.5rem 0.7rem' }}>
              Estimation d’après la photo, pour toute la portion. Corrige les valeurs si besoin avant de valider.
            </p>
          )}

          <label style={{ display: 'block' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Nom du plat</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Escalope + riz, Bowl, McDo..."
              className="input"
              style={{ width: '100%' }}
            />
          </label>

          {portionG !== '' && (
            <label style={{ display: 'block' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Quantité (g) — valeurs pour 100g</span>
              <input
                value={portionG}
                onChange={(e) => setPortionG(e.target.value)}
                inputMode="numeric"
                placeholder="100"
                className="input"
                style={{ width: '100%' }}
              />
            </label>
          )}

          <label style={{ display: 'block' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Calories</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <input
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                inputMode="decimal"
                placeholder="Ex: 650"
                className="input"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>kcal</span>
            </div>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Prot.</span>
              <input value={protein} onChange={(e) => setProtein(e.target.value)} inputMode="decimal" placeholder="0" className="input" style={{ width: '100%', marginTop: '0.2rem' }} />
            </label>
            <label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gluc.</span>
              <input value={carbs} onChange={(e) => setCarbs(e.target.value)} inputMode="decimal" placeholder="0" className="input" style={{ width: '100%', marginTop: '0.2rem' }} />
            </label>
            <label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lip.</span>
              <input value={fat} onChange={(e) => setFat(e.target.value)} inputMode="decimal" placeholder="0" className="input" style={{ width: '100%', marginTop: '0.2rem' }} />
            </label>
          </div>

          <button type="submit" className="btnPrimary" style={{ marginTop: '0.5rem', width: '100%' }}>
            Valider le repas
          </button>
        </form>
        </>
        )}
      </div>
    </div>
  );
}

