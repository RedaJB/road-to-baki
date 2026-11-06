'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const MIN_VISIBLE_MS = 1600;
const FADE_OUT_MS = 700;

type Phase = 'enter' | 'hold' | 'exit' | 'gone';

interface AppSplashProps {
  /** Quand true, le splash peut terminer après MIN_VISIBLE_MS et fade-out */
  ready: boolean;
  children: React.ReactNode;
}

export function AppSplash({ ready, children }: AppSplashProps) {
  const [phase, setPhase] = useState<Phase>('enter');
  const startRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : Date.now());

  useEffect(() => {
    const id = requestAnimationFrame(() => setPhase('hold'));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!ready || phase === 'exit' || phase === 'gone') return;
    const elapsed = performance.now() - startRef.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const t = window.setTimeout(() => setPhase('exit'), wait);
    return () => window.clearTimeout(t);
  }, [ready, phase]);

  useEffect(() => {
    if (phase !== 'exit') return;
    const t = window.setTimeout(() => setPhase('gone'), FADE_OUT_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  const showOverlay = phase !== 'gone';

  return (
    <div className="launchSplashRoot">
      <div
        className="launchSplashContent"
        style={{
          opacity: phase === 'gone' ? 1 : 0,
          transition: 'opacity 0.55s ease 0.12s',
          pointerEvents: phase === 'gone' ? 'auto' : 'none',
        }}
      >
        {children}
      </div>

      {showOverlay && (
        <div
          className={`launchSplashOverlay ${phase === 'exit' ? 'launchSplashOverlay--exit' : ''}`}
          aria-hidden
        >
          <div className="launchSplashGlow" />
          <div className="launchSplashInner">
            <div className="launchSplashIconWrap">
              <Image
                src="/splash-icon.png"
                alt=""
                width={220}
                height={220}
                priority
                className="launchSplashIcon"
              />
            </div>
            <p className="launchSplashTitle">Road to Baki</p>
            <p className="launchSplashSub">Préparation du champ de bataille…</p>
            <div className="launchSplashBarTrack" aria-hidden>
              <div className="launchSplashBarFill" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
