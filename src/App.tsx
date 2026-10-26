/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { HomeView } from './components/home/HomeView';
import { FleetView } from './components/fleet/FleetView';
import { ReliabilityView } from './components/performance/ReliabilityView';
import { InventoryTransactionsView } from './components/inventory/InventoryTransactionsView';
import { TransmittalsView } from './components/transmittals/TransmittalsView';
import { PerformanceWorkOrdersView } from './components/performance/PerformanceWorkOrdersView';
import { DatabaseSettingsDrawer } from './components/sheets/DatabaseSettingsDrawer';
import { AccountAccessModal } from './components/layout/AccountAccessModal';

function MainLayout() {
  const { activeTab, deviceMode, themeMode } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const getContainerWidth = () => {
    switch (deviceMode) {
      case 'mobile':
        return 'w-full max-w-[430px] mx-auto border border-slate-300 dark:border-[#163854] shadow-xl my-3 rounded-lg overflow-hidden flex-col';
      case 'tablet':
        return 'w-full max-w-[860px] mx-auto border border-slate-300 dark:border-[#163854] shadow-xl my-3 rounded-lg overflow-hidden flex-row';
      default:
        return 'w-full flex-row';
    }
  };

  return (
    <div className={`${themeMode === 'night' ? 'dark' : ''} min-h-screen bg-[#F4F7F9] dark:bg-[#041B2D] flex flex-col font-sans text-[#063452] dark:text-[#F0F7F8] select-none transition-colors duration-200`}>
      <Navbar />

      <div className={`flex-1 flex overflow-hidden transition-all duration-300 ${getContainerWidth()}`}>
        {deviceMode === 'mobile' ? (
          <Sidebar variant="mobile-bar" />
        ) : (
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}

        <main className="@container flex-1 overflow-y-auto bg-[#F4F7F9] dark:bg-[#041B2D] relative transition-colors duration-200">
          {activeTab === 'home' && <HomeView />}
          {(activeTab === 'fleet' || activeTab === 'equipment') && <FleetView />}
          {activeTab === 'reliability' && <ReliabilityView />}
          {(activeTab === 'inventory' || activeTab === 'materials') && <InventoryTransactionsView />}
          {activeTab === 'transmittals' && <TransmittalsView />}
          {(activeTab === 'work-orders' || activeTab === 'requests' || activeTab === 'reports' || activeTab === 'pms' || activeTab === 'directory') && (
            <PerformanceWorkOrdersView />
          )}
        </main>
      </div>

      <DatabaseSettingsDrawer />
      <AccountAccessModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

