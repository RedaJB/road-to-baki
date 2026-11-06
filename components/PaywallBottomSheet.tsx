'use client';

import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { PRICING, PRO_FEATURES } from '../lib/pricing';
import { confirmRestoreCode, openPortal, readPro, redeemCode, requestRestoreCode, startCheckout } from '../lib/pro-client';
import { Sheet } from './ui';

type PaywallBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  /** appelé quand l'abonnement est confirmé (restauration) ou en mode démo */
  onUnlock?: () => void;
};

export function PaywallBottomSheet({ isOpen, onClose, onUnlock }: PaywallBottomSheetProps) {
  return (
    <Sheet open={isOpen} onClose={onClose}>
      <PaywallBody isOpen={isOpen} onClose={onClose} onUnlock={onUnlock} />
    </Sheet>
  );
}

/** Écran Pro plein écran, sans fermeture : l'appli est entièrement payante */
export function PaywallScreen({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="screen" style={{ overflowY: 'auto', justifyContent: 'center', padding: '1.4rem 1.2rem' }}>
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.6rem' }}>Ton plan est prêt. Débloque-le pour commencer.</p>
        <PaywallBody isOpen onClose={() => {}} onUnlock={onUnlock} />
      </div>
    </div>
  );
}

function PaywallBody({ isOpen, onClose, onUnlock }: PaywallBottomSheetProps) {
  const [plan, setPlan] = useState<'yearly' | 'monthly'>('yearly');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [email, setEmail] = useState('');
  /** jeton du code envoyé par e-mail (étape 2 de la restauration) */
  const [challenge, setChallenge] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState('');
  const [pro, setPro] = useState(() => (typeof window === 'undefined' ? null : readPro()));

  useEffect(() => {
    if (isOpen) {
      setPro(readPro());
      setError(null);
    }
  }, [isOpen]);

  const checkout = async () => {
    setBusy('checkout');
    setError(null);
    const r = await startCheckout(plan, email || undefined);
    if (!r.ok) {
      setError(r.error);
      setNotConfigured(r.notConfigured);
      setBusy(null);
    }
  };

  const sendCode = async () => {
    setBusy('restore');
    setError(null);
    setInfo(null);
    const r = await requestRestoreCode(email);
    setBusy(null);
    if (!r.ok) return setError(r.error);
    setChallenge(r.data.challenge);
    setOtp('');
    setInfo('Si un abonnement existe pour cet e-mail, tu viens de recevoir un code à 6 chiffres (valable 10 minutes).');
  };

  const confirmCode = async () => {
    if (!challenge) return;
    setBusy('restore');
    setError(null);
    const r = await confirmRestoreCode(challenge, otp);
    setBusy(null);
    if (!r.ok) return setError(r.error);
    setInfo(null);
    setChallenge(null);
    if (r.data.active) {
      onUnlock?.();
      onClose();
    } else setError('Aucun abonnement actif trouvé pour cet e-mail.');
  };

  const useCode = async () => {
    setBusy('code');
    setError(null);
    const r = await redeemCode(code);
    setBusy(null);
    if (!r.ok) return setError(r.error);
    onUnlock?.();
    onClose();
  };

  const manage = async () => {
    if (!pro?.token) return setError('Restaure ton abonnement par e-mail pour le gérer depuis ce téléphone.');
    setBusy('portal');
    setError(null);
    const r = await openPortal(pro.token);
    if (!r.ok) {
      setError(r.error);
      setBusy(null);
      if (r.unauthorized) setPro(readPro());
    }
  };

  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <>
      {pro?.active ? (
        <div style={{ textAlign: 'center', padding: '0.5rem 0 0.5rem' }}>
          <p className="eyebrow">Road to Baki Pro</p>
          <h3 className="screenHead__title" style={{ fontSize: '1.6rem', margin: '0.4rem 0' }}>Tu es Pro</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 1rem' }}>
            {pro.trialEnd && pro.trialEnd * 1000 > Date.now() ? `Essai gratuit jusqu’au ${new Date(pro.trialEnd * 1000).toLocaleDateString('fr-FR')}` : pro.periodEnd ? `Renouvellement le ${new Date(pro.periodEnd * 1000).toLocaleDateString('fr-FR')}` : 'Abonnement actif'}
          </p>
          {pro.viaCode ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Accès débloqué avec un code.</p>
          ) : (
            <button type="button" className="btnFight" onClick={manage} disabled={busy === 'portal'}>
              {busy === 'portal' ? <Loader2 size={18} className="onboardingSpinner" /> : 'Gérer mon abonnement'}
            </button>
          )}
          {error && <p style={{ color: '#e0a050', fontSize: '0.8rem', marginTop: 8 }}>{error}</p>}
        </div>
      ) : (
        <>
          <p className="eyebrow" style={{ textAlign: 'center' }}>Road to Baki Pro</p>
          <h3 className="screenHead__title" style={{ fontSize: '1.7rem', textAlign: 'center', margin: '0.35rem 0 0.2rem' }}>
            {PRICING.trialDays} jours offerts
          </h3>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.86rem', margin: '0 0 1rem' }}>Puis l’offre de ton choix. Annulable en deux clics.</p>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {PRO_FEATURES.map((f) => (
              <li key={f} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.88rem' }}>
                <Check size={16} color="var(--accent)" strokeWidth={3} /> {f}
              </li>
            ))}
          </ul>

          <div style={{ display: 'grid', gap: 8, marginBottom: '0.9rem' }}>
            {(['yearly', 'monthly'] as const).map((k) => {
              const o = PRICING[k];
              const sel = plan === k;
              return (
                <button key={k} type="button" className="ob-tile ob-tile--row" data-selected={sel} onClick={() => setPlan(k)} style={{ padding: '0.8rem 0.9rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="ob-option__check">{sel && <Check size={13} strokeWidth={3} />}</span>
                    <span style={{ textAlign: 'left' }}>
                      <span className="ob-option__label">
                        {o.label}
                        {'badge' in o && <span className="tag tag--accent" style={{ marginLeft: 8, padding: '0.1rem 0.4rem' }}>{o.badge}</span>}
                      </span>
                      <span className="ob-option__desc">{o.sub}</span>
                    </span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span className="statNum" style={{ fontSize: '1.15rem' }}>{o.price}</span>
                    <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)' }}>{o.per}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <button type="button" className="btnFight" onClick={checkout} disabled={!!busy}>
            {busy === 'checkout' ? <Loader2 size={18} className="onboardingSpinner" /> : `Essayer ${PRICING.trialDays} jours gratuits`}
          </button>
          <p style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
            Paiement sécurisé par Stripe. Aucun débit avant la fin de l’essai.{' '}
            <a href="/cgv" style={{ textDecoration: 'underline' }}>CGV</a>
          </p>

          {error && (
            <div style={{ marginTop: 10, padding: '0.6rem 0.75rem', borderRadius: 10, background: 'rgba(224,160,80,0.1)', color: '#e0a050', fontSize: '0.8rem' }}>
              {error}
              {notConfigured && isDev && (
                <button type="button" className="btnSecondary" style={{ display: 'block', marginTop: 8 }} onClick={() => { onUnlock?.(); onClose(); }}>
                  Activer Pro en mode démo (dev uniquement)
                </button>
              )}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '0.8rem' }}>
            {!restoreOpen ? (
              <button type="button" onClick={() => setRestoreOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'underline', cursor: 'pointer' }}>
                Déjà abonné ? Restaurer mon abonnement
              </button>
            ) : !challenge ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" type="email" placeholder="E-mail utilisé au paiement" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1 }} />
                <button type="button" className="btnSecondary" onClick={sendCode} disabled={busy === 'restore' || !email.trim()}>
                  {busy === 'restore' ? '…' : 'Recevoir un code'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {info && <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>{info}</p>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Code à 6 chiffres" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} style={{ flex: 1 }} />
                  <button type="button" className="btnSecondary" onClick={confirmCode} disabled={busy === 'restore' || otp.length !== 6}>
                    {busy === 'restore' ? '…' : 'Valider'}
                  </button>
                </div>
                <button type="button" onClick={() => { setChallenge(null); setInfo(null); setError(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.74rem', textDecoration: 'underline', cursor: 'pointer' }}>
                  Changer d’e-mail ou renvoyer un code
                </button>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            {!codeOpen ? (
              <button type="button" onClick={() => setCodeOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'underline', cursor: 'pointer' }}>
                J’ai un code d’accès
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" type="password" autoComplete="off" placeholder="Code d’accès" value={code} onChange={(e) => setCode(e.target.value)} style={{ flex: 1 }} />
                <button type="button" className="btnSecondary" onClick={useCode} disabled={busy === 'code' || !code.trim()}>
                  {busy === 'code' ? '…' : 'OK'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
