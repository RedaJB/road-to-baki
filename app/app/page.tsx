'use client';

import React, { useCallback, useEffect } from 'react';
import { OnboardingProvider, useOnboarding } from '../../lib/onboarding-context';
import { NutritionProvider } from '../../lib/nutrition-context';
import { AppProvider, useApp } from '../../lib/app-context';
import { XpProvider } from '../../lib/xp-context';
import { ToastProvider, useToast } from '../../lib/toast-context';
import { readPro, refreshPro, verifySession, writePro } from '../../lib/pro-client';
import { StreakProvider } from '../../lib/streak-context';
import { TrainingProvider } from '../../lib/training-context';
import { CustomizationProvider, resolveTheme, themeVars, useCustomization } from '../../lib/customization-context';
import { OnboardingForm } from '../../components/OnboardingForm';
import { AppLayout } from '../../components/AppLayout';
import { AppSplash } from '../../components/AppSplash';
import { AuraBackground } from '../../components/fx/Visuals';
import { PaywallScreen } from '../../components/PaywallBottomSheet';
import { HealthSyncProvider } from '../../lib/health-context';

function ThemedRoot({ children }: { children: React.ReactNode }) {
  const custom = useCustomization();
  const { answers } = useOnboarding();
  const { color, color2 } = resolveTheme(custom, answers.shonenArchetype);
  return (
    <div className="appRoot" style={{ ...themeVars(color, color2), background: 'var(--bg)', color: 'var(--text)' }}>
      <AuraBackground effect={custom.bgEffect} aura={custom.aura} motto={custom.motto} />
      <ToastProvider>
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      </ToastProvider>
    </div>
  );
}

/** Statut Pro : retour de paiement Stripe + vérification périodique */
function ProSync() {
  const { setPremium } = useApp();
  const { toast } = useToast();
  useEffect(() => {
    const url = new URL(window.location.href);
    const flag = url.searchParams.get('pro');
    const sid = url.searchParams.get('session_id');
    if (flag) {
      url.searchParams.delete('pro');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
    if (flag === 'success' && sid) {
      verifySession(sid).then((r) => {
        if (r.ok && r.data.active) {
          setPremium(true);
          toast('Bienvenue dans Road to Baki Pro');
        } else toast('Paiement en cours de vérification…', 'info');
      });
      return;
    }
    if (flag === 'cancel') toast('Paiement annulé', 'info');
    const st = readPro();
    if (st.token && Date.now() - st.checkedAt > 6 * 3600_000) {
      refreshPro(st.token).then((r) => {
        if (r.ok) setPremium(r.data.active);
        else if (r.unauthorized) {
          setPremium(false);
          toast('Confirme ton e-mail pour restaurer ton abonnement', 'info');
        }
      });
    } else if (st.customerId && !st.token && !st.viaCode) {
      // ancien enregistrement sans preuve (avant la vérification par e-mail) : on redemande l'e-mail
      writePro({ active: false, customerId: null });
      setPremium(false);
      toast('Confirme ton e-mail pour restaurer ton abonnement', 'info');
    }
  }, [setPremium, toast]);
  return null;
}

function PageContent() {
  const { hasCompletedOnboarding, initialized, answers, setAnswer, step, nextStep, prevStep, completeOnboarding } = useOnboarding();
  const { setDouleurs, addWeight, loaded, isPremium, setPremium } = useApp();

  const handleComplete = useCallback(() => {
    setDouleurs(answers.douleurs ?? []);
    const p = answers.poids;
    if (typeof p === 'number' && p >= 30 && p <= 300) addWeight(p);
    completeOnboarding();
  }, [answers.douleurs, answers.poids, setDouleurs, addWeight, completeOnboarding]);

  let inner: React.ReactNode = null;
  if (initialized && loaded) {
    inner = !hasCompletedOnboarding ? (
      <OnboardingForm
        answers={answers}
        setAnswer={setAnswer}
        step={step}
        nextStep={nextStep}
        prevStep={prevStep}
        completeOnboarding={handleComplete}
      />
    ) : !isPremium ? (
      // appli entièrement payante : essai gratuit, abonnement ou code d'accès
      <PaywallScreen onUnlock={() => setPremium(true)} />
    ) : (
      <AppLayout />
    );
  }

  return (
    <AppSplash ready={initialized && loaded}>
      <ThemedRoot>
        <HealthSyncProvider>{inner}</HealthSyncProvider>
        <ProSync />
      </ThemedRoot>
    </AppSplash>
  );
}

export default function Page() {
  return (
    <OnboardingProvider>
      <CustomizationProvider>
        <NutritionProvider>
          <XpProvider>
            <AppProvider>
              <TrainingProvider>
                <StreakProvider>
                  <PageContent />
                </StreakProvider>
              </TrainingProvider>
            </AppProvider>
          </XpProvider>
        </NutritionProvider>
      </CustomizationProvider>
    </OnboardingProvider>
  );
}
