'use client';

import React, { useEffect } from 'react';
import { RefreshCw, Watch } from 'lucide-react';
import { useHealthSync } from '../lib/health-context';
import { timeAgo } from './ConnectDeviceSheet';

/** Ligne discrète sous la saisie des pas : état de la synchro Google Health */
export function StepsSyncHint() {
  const health = useHealthSync();
  const { connected, configured, checkConfigured } = health;

  useEffect(() => {
    if (!connected && configured === null) checkConfigured();
  }, [connected, configured, checkConfigured]);

  const style: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, margin: '0.8rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' };

  if (!connected) {
    if (!configured) return null;
    return (
      <p style={style}>
        <Watch size={13} /> Montre ou bracelet ? Connecte-le dans Dojo → Réglages → Appareils connectés.
      </p>
    );
  }
  if (health.status === 'reconnect' || health.status === 'not_linked') {
    return (
      <p style={style}>
        <Watch size={13} /> Google Health à reconnecter dans Dojo → Réglages.
      </p>
    );
  }
  return (
    <p style={style}>
      <Watch size={13} />
      <span style={{ flex: 1 }}>Google Health · {health.syncing ? 'synchro…' : `synchro ${timeAgo(health.lastSyncAt)}`}</span>
      <button
        type="button"
        onClick={health.syncNow}
        disabled={health.syncing}
        aria-label="Synchroniser les pas"
        style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontWeight: 700 }}
      >
        <RefreshCw size={12} /> Synchroniser
      </button>
    </p>
  );
}
