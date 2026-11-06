'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footprints, Flame, HeartPulse, Moon, RefreshCw, Unlink, Watch } from 'lucide-react';
import { useHealthSync } from '../lib/health-context';
import { HEALTH_ERROR_TEXT } from '../lib/health-client';
import { todayISO } from '../lib/streak';
import { Sheet } from './ui';

const DEVICES = ['Fitbit', 'Pixel Watch', 'Garmin', 'Samsung', 'Xiaomi', 'Amazfit', 'Oura', 'Apple Watch', 'Ton téléphone'];

export function timeAgo(ts: number | null, now = Date.now()): string {
  if (!ts) return 'jamais';
  const min = Math.round((now - ts) / 60_000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

function formatSleep(min?: number) {
  if (!min) return '—';
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

/** Dojo → Réglages → Appareils connectés */
export function ConnectDeviceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const health = useHealthSync();
  const [confirmOff, setConfirmOff] = useState(false);
  const { configured, checkConfigured } = health;

  useEffect(() => {
    if (open && configured === null) checkConfigured();
    if (!open) setConfirmOff(false);
  }, [open, configured, checkConfigured]);

  const today = todayISO();
  const latestDate = Object.keys(health.recent).sort().pop();
  const day = health.recent[today] ?? (latestDate ? health.recent[latestDate] : undefined);
  const dayLabel = health.recent[today] || !latestDate ? 'Aujourd’hui' : new Date(`${latestDate}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' });

  return (
    <Sheet open={open} onClose={onClose} title="Appareils connectés">
      {!health.connected ? (
        <>
          <p style={{ margin: '0 0 0.8rem', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.45 }}>
            Importe tout seul tes pas depuis ta montre, ton bracelet ou ton téléphone, grâce à l’appli <strong style={{ color: 'var(--text)' }}>Google Health</strong> (ex-Fitbit).
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: '0.9rem' }}>
            {DEVICES.map((d) => (
              <span key={d} className="tag">
                {d}
              </span>
            ))}
          </div>
          <p className="tile__label" style={{ marginBottom: 6 }}>Avant de connecter</p>
          <ol style={{ margin: '0 0 1rem', paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.5 }}>
            <li>Installe l’appli Google Health et connecte-toi avec ton compte Google.</li>
            <li>Dans Google Health, active Health Connect (Android) ou Apple Santé (iPhone) pour récupérer les pas du téléphone et des autres montres.</li>
            <li>Reviens ici, appuie sur « Connecter » et autorise l’accès.</li>
          </ol>
          <button type="button" className="btnFight" disabled={!configured} onClick={health.connect} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}>
            <Watch size={16} /> Connecter Google Health
          </button>
          {configured === false && (
            <p style={{ margin: '0.6rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              {HEALTH_ERROR_TEXT.not_configured}
              {process.env.NODE_ENV !== 'production' && ' Ajoute les clés Google Health dans .env.local (voir README).'}
            </p>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <Watch size={17} /> Google Health
            </span>
            <span className={health.status === 'ok' ? 'tag tag--accent' : 'tag'}>
              {health.status === 'ok' ? 'Connecté' : health.status === 'reconnect' ? 'À reconnecter' : health.status === 'not_linked' ? 'Compte à relier' : 'Synchro en échec'}
            </span>
          </div>
          <p style={{ margin: '0 0 0.8rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {health.syncing ? 'Synchro en cours…' : `Dernière synchro : ${timeAgo(health.lastSyncAt)}`}
          </p>

          {health.status === 'reconnect' && <Notice text={HEALTH_ERROR_TEXT.reconnect} />}
          {health.status === 'not_linked' && <Notice text={HEALTH_ERROR_TEXT.not_linked} />}

          <p className="tile__label" style={{ marginBottom: 6, textTransform: 'capitalize' }}>{dayLabel}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: '1rem' }}>
            <Stat icon={<Footprints size={14} />} label="Pas" value={day?.steps != null ? day.steps.toLocaleString('fr-FR') : '—'} />
            <Stat icon={<Flame size={14} />} label="Calories brûlées" value={day?.kcal ? `${day.kcal.toLocaleString('fr-FR')} kcal` : '—'} />
            <Stat icon={<HeartPulse size={14} />} label="Cardio moyen" value={day?.hrAvg ? `${day.hrAvg} bpm` : '—'} />
            <Stat icon={<Moon size={14} />} label="Sommeil" value={formatSleep(day?.sleepMin)} />
          </div>

          {health.status === 'reconnect' ? (
            <button type="button" className="btnFight" onClick={health.connect} style={{ width: '100%' }}>
              Reconnecter Google Health
            </button>
          ) : (
            <button type="button" className="btnFight" disabled={health.syncing} onClick={health.syncNow} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}>
              <RefreshCw size={15} /> {health.syncing ? 'Synchro…' : 'Synchroniser maintenant'}
            </button>
          )}
          <button
            type="button"
            className="btnSecondary"
            onClick={() => (confirmOff ? void health.disconnect() : setConfirmOff(true))}
            style={{ width: '100%', marginTop: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...(confirmOff ? { color: '#e05a5e' } : {}) }}
          >
            <Unlink size={14} /> {confirmOff ? 'Confirmer la déconnexion' : 'Déconnecter'}
          </button>
          <p style={{ margin: '0.7rem 0 0', fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Synchro automatique à l’ouverture de l’appli. Tu peux toujours corriger tes pas à la main dans le Journal : on garde le plus grand des deux. Les pas déjà importés restent après une déconnexion.
          </p>
        </>
      )}
      <p style={{ margin: '0.7rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
        On lit seulement tes pas, calories, cardio et sommeil. Rien n’est gardé sur nos serveurs.{' '}
        <Link href="/confidentialite" style={{ color: 'var(--text-secondary)' }}>
          Confidentialité
        </Link>
      </p>
    </Sheet>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <p style={{ margin: '0 0 0.8rem', padding: '0.55rem 0.7rem', borderRadius: 10, background: 'rgba(224, 90, 94, 0.12)', color: 'var(--text)', fontSize: '0.8rem' }}>
      {text}
    </p>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="tile" style={{ padding: '0.55rem 0.65rem' }}>
      <span className="tile__label" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.62rem' }}>
        {icon} {label}
      </span>
      <span className="tile__value" style={{ marginTop: 2, fontSize: '1.05rem' }}>{value}</span>
    </div>
  );
}
