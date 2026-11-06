'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface XpState {
  xp: number;
  level: number;
  rank: string;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPct: number;
  addXp: (amount: number, reason?: string) => { leveledUp: boolean; newLevel: number };
  levelUpEvent: { level: number; rank: string } | null;
  dismissLevelUp: () => void;
}

const STORAGE_KEY = 'roadtobaki_xp_v1';
const XpContext = createContext<XpState | undefined>(undefined);

function xpRequiredForLevel(level: number): number {
  return Math.round(120 * level + 35 * level * level);
}

function computeLevel(totalXp: number): { level: number; currentLevelXp: number; nextLevelXp: number } {
  let level = 1;
  let remaining = Math.max(0, Math.round(totalXp));
  let need = xpRequiredForLevel(level);
  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need = xpRequiredForLevel(level);
  }
  return { level, currentLevelXp: remaining, nextLevelXp: need };
}

export function rankForLevel(level: number): string {
  if (level >= 30) return 'Ogre';
  if (level >= 24) return 'Hanma';
  if (level >= 18) return 'Predator';
  if (level >= 12) return 'Gladiateur';
  if (level >= 7) return 'Combattant';
  return 'Rookie';
}

export function XpProvider({ children }: { children: React.ReactNode }) {
  const [xp, setXp] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [levelUpEvent, setLevelUpEvent] = useState<{ level: number; rank: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as { xp?: number }) : {};
      if (typeof parsed.xp === 'number' && parsed.xp >= 0) {
        setXp(parsed.xp);
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ xp }));
    } catch {
      // ignore
    }
  }, [loaded, xp]);

  const addXp = useCallback((amount: number) => {
    const gain = Math.max(0, Math.round(amount));
    if (gain <= 0) {
      const current = computeLevel(xp);
      return { leveledUp: false, newLevel: current.level };
    }
    const before = computeLevel(xp);
    const afterTotal = xp + gain;
    const after = computeLevel(afterTotal);
    setXp(afterTotal);
    if (after.level > before.level) setLevelUpEvent({ level: after.level, rank: rankForLevel(after.level) });
    return { leveledUp: after.level > before.level, newLevel: after.level };
  }, [xp]);

  const value = useMemo<XpState>(() => {
    const { level, currentLevelXp, nextLevelXp } = computeLevel(xp);
    const progressPct = Math.min(100, Math.max(0, (currentLevelXp / Math.max(1, nextLevelXp)) * 100));
    return {
      xp,
      level,
      rank: rankForLevel(level),
      currentLevelXp,
      nextLevelXp,
      progressPct,
      addXp,
      levelUpEvent,
      dismissLevelUp: () => setLevelUpEvent(null),
    };
  }, [xp, addXp, levelUpEvent]);

  return <XpContext.Provider value={value}>{children}</XpContext.Provider>;
}

export function useXp() {
  const ctx = useContext(XpContext);
  if (!ctx) throw new Error('useXp must be used within XpProvider');
  return ctx;
}
