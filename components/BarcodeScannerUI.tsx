'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ScanLine, Loader } from 'lucide-react';

export function BarcodeScannerUI({ onClose, onScanSuccess }: { onClose: () => void; onScanSuccess: (food: any) => void }) {
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    // Simulate a scan after 2.5 seconds
    const timer = setTimeout(() => {
      setScanning(false);
      setTimeout(() => {
        onScanSuccess({
          label: "Steak Haché 5% (Charal)",
          calories: 130,
          protein: 21,
          carbs: 0,
          fat: 5
        });
      }, 800);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onScanSuccess]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        <span style={{ color: '#fff', fontWeight: 600 }}>Scanner un produit</span>
        <div style={{ width: '40px' }} />
      </div>

      {/* Camera Viewport Simulation */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Fake camera background stream (blur image or just dark gradient) */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #111 0%, #1a1a1a 100%)' }} />

        {/* Scanner overlay */}
        <div style={{ position: 'relative', width: '250px', height: '250px', zIndex: 5 }}>
          {/* Borders */}
          <svg width="100%" height="100%" viewBox="0 0 250 250" style={{ position: 'absolute', inset: 0 }}>
            <path d="M 0 50 L 0 0 L 50 0 M 200 0 L 250 0 L 250 50 M 250 200 L 250 250 L 200 250 M 50 250 L 0 250 L 0 200" fill="none" stroke="var(--accent)" strokeWidth="4" />
          </svg>
          
          {/* Laser animation */}
          <AnimatePresence>
            {scanning && (
              <motion.div
                initial={{ top: 0 }}
                animate={{ top: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'var(--accent)',
                  boxShadow: '0 0 10px 2px var(--accent)',
                }}
              />
            )}
          </AnimatePresence>

          {/* Success overlay */}
          {!scanning && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34, 197, 94, 0.2)' }}
            >
              <div style={{ background: 'var(--success)', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <ScanLine size={30} />
              </div>
            </motion.div>
          )}
        </div>

        <div style={{ position: 'absolute', bottom: '3rem', textAlign: 'center', color: '#fff', zIndex: 10 }}>
          {scanning ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <Loader size={18} className="onboardingSpinner" />
              <span style={{ fontSize: '0.9rem' }}>Recherche dans la base de données...</span>
            </div>
          ) : (
            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--success)' }}>Produit identifié !</span>
          )}
        </div>
      </div>
    </div>
  );
}
