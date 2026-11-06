'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useActivity } from './activity-context';
import { useToast } from './toast-context';
import { todayISO } from './streak';
import { stepsFromDays, type HealthDays } from './health-days';
import {
  HEALTH_ERROR_TEXT,
  HEALTH_PENDING_KEY,
  HEALTH_STORAGE_KEY,
  beginGoogleConnect,
  keepRecent,
  parseRedirect,
  readStoredHealth,
  requestSync,
  syncSpan,
  type HealthStatus,
  type StoredHealth,
} from './health-client';

/** Synchro auto au plus toutes les 15 min (ouverture de l'appli ou retour au premier plan) */
const AUTO_SYNC_MS = 15 * 60_000;
/** Après un échec, on attend 5 min avant de réessayer tout seul */
const RETRY_MS = 5 * 60_000;

interface HealthSyncState {
  connected: boolean;
  status: HealthStatus | null;
  lastSyncAt: number | null;
  recent: HealthDays;
  syncing: boolean;
  /** null tant qu'on n'a pas demandé au serveur */
  configured: boolean | null;
  checkConfigured: () => void;
  connect: () => void;
  syncNow: () => void;
  disconnect: () => Promise<void>;
}

const noop = () => {};
const FALLBACK: HealthSyncState = {
  connected: false,
  status: null,
  lastSyncAt: null,
  recent: {},
  syncing: false,
  configured: false,
  checkConfigured: noop,
  connect: noop,
  syncNow: noop,
  disconnect: async () => {},
};

const HealthSyncContext = createContext<HealthSyncState | undefined>(undefined);

function readPending(): { nonce?: unknown; at?: unknown } | null {
  try {
    const raw = window.localStorage.getItem(HEALTH_PENDING_KEY);
    return raw ? (JSON.parse(raw) as { nonce?: unknown; at?: unknown }) : null;
  } catch {
    return null;
  }
}

export function HealthSyncProvider({ children }: { children: React.ReactNode }) {
  const { importSteps } = useActivity();
  const { toast } = useToast();
  const [stored, setStored] = useState<StoredHealth | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const storedRef = useRef<StoredHealth | null>(null);
  const busy = useRef(false);
  const lastAttempt = useRef(0);
  const toastRef = useRef(toast);
  storedRef.current = stored;
  toastRef.current = toast;

  // Lecture + retour de l'écran Google (#health=…)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('health=')) {
      const result = parseRedirect(hash, readPending());
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      try {
        window.localStorage.removeItem(HEALTH_PENDING_KEY);
        if (result?.kind === 'ok') {
          // écrit tout de suite : un second montage (StrictMode) doit relire le nouveau lien
          const fresh: StoredHealth = { provider: 'google', link: result.link, connectedAt: Date.now(), lastSyncAt: null, status: 'ok', recent: {} };
          window.localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(fresh));
        }
      } catch {
        // ignore
      }
      if (result?.kind === 'ok') toastRef.current('Google Health connecté');
      else if (result) toastRef.current(HEALTH_ERROR_TEXT[result.reason] ?? HEALTH_ERROR_TEXT.upstream, 'info');
    }
    setStored(readStoredHealth(window.localStorage));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (stored) window.localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(stored));
      else window.localStorage.removeItem(HEALTH_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [loaded, stored]);

  const runSync = useCallback(
    async (manual: boolean) => {
      const s = storedRef.current;
      if (!s || busy.current) return;
      busy.current = true;
      lastAttempt.current = Date.now();
      setSyncing(true);
      const today = todayISO();
      const r = await requestSync(s.link, today, syncSpan(s.lastSyncAt));
      busy.current = false;
      setSyncing(false);
      if (r.ok) {
        importSteps(stepsFromDays(r.days));
        setStored((prev) =>
          prev && prev.link === s.link
            ? { ...prev, link: r.link ?? prev.link, lastSyncAt: Date.now(), status: 'ok', recent: keepRecent(prev.recent, r.days, today) }
            : prev,
        );
        if (manual) {
          const steps = r.days[today]?.steps;
          toast(typeof steps === 'number' ? `${steps.toLocaleString('fr-FR')} pas aujourd’hui` : 'Synchro faite');
        }
        return;
      }
      const status: HealthStatus = r.code === 'reconnect' || r.code === 'scope' ? 'reconnect' : r.code === 'not_linked' ? 'not_linked' : 'error';
      setStored((prev) => (prev && prev.link === s.link ? { ...prev, status } : prev));
      if (manual || (status !== 'error' && s.status !== status)) toast(HEALTH_ERROR_TEXT[r.code] ?? HEALTH_ERROR_TEXT.upstream, 'info');
    },
    [importSteps, toast],
  );

  // Synchro auto : à l'ouverture et quand l'appli revient au premier plan
  useEffect(() => {
    if (!loaded) return;
    const maybeSync = () => {
      const s = storedRef.current;
      if (!s || s.status === 'reconnect' || document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (s.lastSyncAt && now - s.lastSyncAt < AUTO_SYNC_MS) return;
      if (now - lastAttempt.current < RETRY_MS) return;
      void runSync(false);
    };
    maybeSync();
    document.addEventListener('visibilitychange', maybeSync);
    return () => document.removeEventListener('visibilitychange', maybeSync);
  }, [loaded, stored?.link, runSync]);

  const checkConfigured = useCallback(() => {
    fetch('/api/health/google/status', { cache: 'no-store' })
      .then((r) => r.json() as Promise<{ configured?: boolean }>)
      .then((j) => setConfigured(!!j.configured))
      .catch(() => setConfigured(false));
  }, []);

  const syncNow = useCallback(() => {
    void runSync(true);
  }, [runSync]);

  const disconnect = useCallback(async () => {
    const s = storedRef.current;
    if (!s) return;
    await fetch('/api/health/google/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: s.link }),
    }).catch(() => undefined);
    setStored(null);
    toast('Google Health déconnecté', 'info');
  }, [toast]);

  const value = useMemo<HealthSyncState>(
    () => ({
      connected: !!stored,
      status: stored?.status ?? null,
      lastSyncAt: stored?.lastSyncAt ?? null,
      recent: stored?.recent ?? {},
      syncing,
      configured,
      checkConfigured,
      connect: beginGoogleConnect,
      syncNow,
      disconnect,
    }),
    [stored, syncing, configured, checkConfigured, syncNow, disconnect],
  );

  return <HealthSyncContext.Provider value={value}>{children}</HealthSyncContext.Provider>;
}

export function useHealthSync(): HealthSyncState {
  return useContext(HealthSyncContext) ?? FALLBACK;
}
