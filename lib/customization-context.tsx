'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FIGHTER_LOOKS } from './fighters';
import { playFx, type FxKind } from './fx';

export type AuraLevel = 'off' | 'calme' | 'demon';
export type BgEffect = 'braises' | 'lignes' | 'kanji' | 'aucun';

export interface ThemeDef {
  id: string;
  name: string;
  color: string;
  color2: string;
}

/** Thème unique : le rouge de Baki */
export const THEMES: ThemeDef[] = FIGHTER_LOOKS.map((f) => ({ id: f.id, name: f.name, color: f.color, color2: f.color2 }));


export const MOTTOS = ['最強への道', '不屈の魂', '鬼の背中', '一撃必殺', '天上天下', '修羅の道'];
export const MOTTO_FR: Record<string, string> = {
  '最強への道': 'La voie du plus fort',
  '不屈の魂': 'Âme indomptable',
  '鬼の背中': 'Le dos du démon',
  '一撃必殺': 'Un coup, une victoire',
  '天上天下': 'Au-dessus de tous',
  '修羅の道': 'Le chemin du démon combattant',
};

export interface Customization {
  pseudo: string;
  title: string;
  themeId: string | null;
  customColor: string | null;
  aura: AuraLevel;
  bgEffect: BgEffect;
  avatar: string | null;
  motto: string;
  haptics: boolean;
  sound: boolean;
  /** 0.8 = récupération · 1 = normal · 1.2 = mode démon */
  intensity: number;
  /** onomatopées, impacts, aura « ゴゴゴ » */
  mangaFx: boolean;
}

const DEFAULTS: Customization = {
  pseudo: '',
  title: '',
  themeId: null,
  customColor: null,
  aura: 'off',
  bgEffect: 'aucun',
  avatar: null,
  motto: MOTTOS[0],
  haptics: true,
  sound: true,
  intensity: 1,
  mangaFx: true,
};

interface CustomizationState extends Customization {
  update: (patch: Partial<Customization>) => void;
  reset: () => void;
}

const STORAGE_KEY = 'roadtobaki_custom_v1';
/** v2 : DA plus sobre — on remet les effets visuels par défaut à zéro une fois */
const STYLE_VERSION = 2;
const Ctx = createContext<CustomizationState | undefined>(undefined);

export function CustomizationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Customization>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Customization> & { styleVersion?: number };
        const next = { ...DEFAULTS, ...parsed };
        if ((parsed.styleVersion ?? 1) < STYLE_VERSION) {
          next.aura = DEFAULTS.aura;
          next.bgEffect = DEFAULTS.bgEffect;
        }
        setState(next);
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, styleVersion: STYLE_VERSION }));
    } catch {
      // ignore
    }
  }, [loaded, state]);

  const update = useCallback((patch: Partial<Customization>) => setState((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setState(DEFAULTS), []);

  const value = useMemo(() => ({ ...state, update, reset }), [state, update, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCustomization() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCustomization must be used within CustomizationProvider');
  return ctx;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [255, 42, 95];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function darken(hex: string, f = 0.6): string {
  const [r, g, b] = hexToRgb(hex);
  return `#${[r, g, b].map((v) => Math.round(v * f).toString(16).padStart(2, '0')).join('')}`;
}

/** Variables CSS d'accent à injecter sur le conteneur racine */
export function themeVars(color: string, color2?: string): React.CSSProperties {
  const [r, g, b] = hexToRgb(color);
  const c2 = color2 ?? darken(color);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return {
    '--accent': color,
    '--accent-2': c2,
    '--accent-rgb': `${r}, ${g}, ${b}`,
    '--accent-gradient': color,
    '--accent-dim': `rgba(${r}, ${g}, ${b}, 0.15)`,
    '--border-accent': `rgba(${r}, ${g}, ${b}, 0.4)`,
    '--shadow-accent': `0 10px 28px rgba(${r}, ${g}, ${b}, 0.22)`,
    '--on-accent': luminance > 0.6 ? '#0b0b10' : '#ffffff',
  } as React.CSSProperties;
}

/** Résout le thème actif (choix explicite > archétype de l'onboarding) */
export function resolveTheme(c: Pick<Customization, 'themeId' | 'customColor'>, archetype: string | null): { color: string; color2: string } {
  // couleur fixe : les anciens réglages (autre thème, couleur libre) sont ignorés
  void c;
  void archetype;
  return { color: THEMES[0].color, color2: THEMES[0].color2 };
}

/** Joue un effet (son + vibration) selon les préférences de l'utilisateur */
export function useFx() {
  const { sound, haptics } = useCustomization();
  return useCallback((kind: FxKind) => playFx(kind, { sound, haptics }), [sound, haptics]);
}
