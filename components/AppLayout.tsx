'use client';

import React, { useState } from 'react';
import { BottomTabBar, type TabId } from './BottomTabBar';
import { JournalTab } from './JournalTab';
import { ProgrammesTab } from './ProgrammesTab';
import { ProfilTab } from './ProfilTab';

export function AppLayout() {
  const [activeTab, setActiveTab] = useState<TabId>('journal');

  return (
    <>
      {activeTab === 'journal' && <JournalTab />}
      {activeTab === 'programmes' && <ProgrammesTab />}
      {activeTab === 'profil' && <ProfilTab />}
      <BottomTabBar active={activeTab} onChange={setActiveTab} />
    </>
  );
}
