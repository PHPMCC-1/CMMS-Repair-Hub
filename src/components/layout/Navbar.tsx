import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  Check, 
  ChevronDown, 
  ShieldCheck, 
  UserCheck, 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  LogOut,
  Sun,
  Moon,
  RotateCcw,
  Gauge,
  Wrench,
  Settings,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    personas, 
    activePersona, 
    setActivePersona, 
    isAdmin, 
    setIsAccountManagerOpen,
    deviceMode, 
    setDeviceMode,
    themeMode,
    toggleThemeMode,
    isGoogleConnected,
    isUsingCachedData,
    syncStatus,
    googleUser,
    isSyncingSheets,
    lastSyncTime,
    nextAutoRefreshIn,
    autoSyncEnabled,
    setAutoSyncEnabled,
    autoSyncIntervalSeconds,
    setAutoSyncIntervalSeconds,
    signInGoogle,
    signOutGoogle,
    refreshSheets,
    setIsDatabaseSettingsOpen,
    workbookUrls,
    kpis,
    activeTab,
    setActiveTab,
    setStatusFilter,
    equipment,
    workOrders,
  } = useApp();

  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const [isGoogleMenuOpen, setIsGoogleMenuOpen] = useState(false);
  const [isWorkOrderMenuOpen, setIsWorkOrderMenuOpen] = useState(false);

  const rel = kpis.reliability;
  const hasLoadedData = equipment.length > 0 || workOrders.length > 0 || isUsingCachedData || isGoogleConnected;

  const handleWorkOrderJump = (status: string) => {
    setStatusFilter(status);
    setActiveTab('work-orders');
    setIsWorkOrderMenuOpen(false);
  };

  return (
    <header className="min-h-12 py-1.5 bg-white dark:bg-[#07263D] border-b border-slate-200 dark:border-[#123E5E] px-3 @md:px-4 flex flex-wrap items-center justify-between gap-2 z-20 shrink-0 transition-colors">
      {/* Left: Persona Switcher & Device Mode Switcher */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => {
              setIsPersonaMenuOpen(!isPersonaMenuOpen);
              setIsWorkOrderMenuOpen(false);
              setIsGoogleMenuOpen(false);
            }}
            className="flex items-center gap-2 text-xs text-[#063452] dark:text-[#F0F7F8] bg-slate-50 dark:bg-[#041B2D] hover:bg-slate-100 dark:hover:bg-[#0B3554] border border-slate-200 dark:border-[#123E5E] px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap"
          >
            <div className={`w-5 h-5 rounded-xs flex items-center justify-center text-[11px] font-semibold ${activePersona.avatarBg}`}>
              {activePersona.avatarLetter}
            </div>
            <span className="font-semibold">{activePersona.name}</span>
            <span className="text-[11px] text-slate-400 dark:text-[#98BAC9]">·</span>
            <span className={`text-[11px] font-semibold ${
              isAdmin
                ? 'text-[#F37022]'
                : 'text-sky-700 dark:text-sky-300'
            }`}>
              {isAdmin ? 'Admin' : 'Client'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {isPersonaMenuOpen && (
            <div className="absolute left-0 mt-1 w-80 bg-white dark:bg-[#07263D] rounded-md shadow-lg border border-slate-200 dark:border-[#123E5E] py-1 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-slate-200 dark:border-[#123E5E] flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-[#98BAC9] uppercase tracking-wider">
                  Accounts & Access Roles
                </span>
                <button
                  onClick={() => {
                    setIsPersonaMenuOpen(false);
                    setIsAccountManagerOpen(true);
                  }}
                  className="text-[11px] font-semibold text-[#F37022] hover:underline flex items-center gap-1"
                >
                  <Settings className="w-3 h-3" />
                  <span>Manage Roles</span>
                </button>
              </div>
              {personas.map((p) => (
                <button
                  key={p.email}
                  onClick={() => {
                    setActivePersona(p);
                    setIsPersonaMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#041B2D] transition-colors ${
                    activePersona.email === p.email ? 'bg-slate-50 dark:bg-[#041B2D] font-medium' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-6 h-6 rounded-xs flex items-center justify-center text-xs font-semibold shrink-0 ${p.avatarBg}`}>
                      {p.avatarLetter}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#063452] dark:text-[#F0F7F8] font-medium truncate">{p.name}</span>
                        <span className={`px-1.5 py-0.5 rounded-xs text-[10px] font-semibold uppercase ${
                          p.role === 'admin'
                            ? 'bg-[#063452]/10 dark:bg-white/10 text-[#063452] dark:text-white'
                            : 'bg-[#F37022]/15 text-[#F37022]'
                        }`}>
                          {p.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#98BAC9] truncate">{p.email}</div>
                    </div>
                  </div>
                  {activePersona.email === p.email && (
                    <Check className="w-4 h-4 text-[#F37022] shrink-0" />
                  )}
                </button>
              ))}

              <div className="px-3 py-2 border-t border-slate-200 dark:border-[#123E5E] bg-slate-50 dark:bg-[#041B2D] space-y-2 text-[11px]">
                {isAdmin ? (
                  <div className="flex items-center gap-1.5 text-[#063452] dark:text-[#F0F7F8] font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#F37022] shrink-0" />
                    <span>Admin: Full access (Internal + Client Equipment)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[#063452] dark:text-sky-300 font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-[#F37022] shrink-0" />
                    <span>Client View: {activePersona.company}</span>
                  </div>
                )}

                <button
                  onClick={() => {
                    setIsPersonaMenuOpen(false);
                    setIsAccountManagerOpen(true);
                  }}
                  className="w-full py-1.5 px-2.5 bg-[#063452] hover:bg-[#09476e] dark:bg-[#F37022] dark:hover:bg-[#d95f16] text-white rounded-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Manage Admin & Client Accounts</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Device Mode Switcher */}
        <div className="hidden sm:flex items-center gap-0.5 bg-slate-100 dark:bg-[#041B2D] p-0.5 rounded-md border border-slate-200 dark:border-[#123E5E]">
          <button
            onClick={() => setDeviceMode('desktop')}
            title="Desktop View"
            className={`p-1.5 rounded-xs transition-colors ${deviceMode === 'desktop' ? 'bg-white dark:bg-[#07263D] text-[#063452] dark:text-white shadow-2xs' : 'text-slate-500 dark:text-[#98BAC9] hover:text-[#063452] dark:hover:text-white'}`}
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeviceMode('tablet')}
            title="Tablet View"
            className={`p-1.5 rounded-xs transition-colors ${deviceMode === 'tablet' ? 'bg-white dark:bg-[#07263D] text-[#063452] dark:text-white shadow-2xs' : 'text-slate-500 dark:text-[#98BAC9] hover:text-[#063452] dark:hover:text-white'}`}
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeviceMode('mobile')}
            title="Mobile View"
            className={`p-1.5 rounded-xs transition-colors ${deviceMode === 'mobile' ? 'bg-white dark:bg-[#07263D] text-[#063452] dark:text-white shadow-2xs' : 'text-slate-500 dark:text-[#98BAC9] hover:text-[#063452] dark:hover:text-white'}`}
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: MTBF/MTTR, Work Orders, Day/Night Mode & Sheets Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Avg Unit MTBF & MTTR Top-Bar Pill */}
        <button
          onClick={() => setActiveTab('reliability')}
          title="View Per-Unit MTBF & MTTR Reliability Breakdown"
          className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md border transition-colors whitespace-nowrap ${
            activeTab === 'reliability'
              ? 'bg-[#063452] text-white border-[#063452] dark:bg-[#0B3554] dark:border-[#F37022]/60'
              : 'bg-slate-50 dark:bg-[#041B2D] text-[#063452] dark:text-[#F0F7F8] border-slate-200 dark:border-[#123E5E] hover:border-[#F37022]'
          }`}
        >
          <Gauge className="w-3.5 h-3.5 text-[#F37022] shrink-0" />
          <span className="flex items-center gap-1">
            <span className={activeTab === 'reliability' ? 'text-slate-200 font-medium' : 'text-slate-500 dark:text-[#98BAC9] font-medium'}>
              Avg Unit MTBF:
            </span>
            <span className="font-mono font-bold tabular-nums">
              {rel.monthlyMTBFDays !== null ? `${rel.monthlyMTBFDays.toFixed(1)}d` : '—'}
            </span>
          </span>
          <span className="opacity-30">|</span>
          <span className="flex items-center gap-1">
            <span className={activeTab === 'reliability' ? 'text-slate-200 font-medium' : 'text-slate-500 dark:text-[#98BAC9] font-medium'}>
              Avg Unit MTTR:
            </span>
            <span className="font-mono font-bold tabular-nums">
              {rel.monthlyMTTRHours !== null ? `${Math.round(rel.monthlyMTTRHours)}h` : '—'}
            </span>
          </span>
        </button>

        {/* Work Orders Status Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsWorkOrderMenuOpen(!isWorkOrderMenuOpen);
              setIsPersonaMenuOpen(false);
              setIsGoogleMenuOpen(false);
            }}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors whitespace-nowrap ${
              activeTab === 'work-orders'
                ? 'bg-[#063452] text-white border-[#063452] dark:bg-[#0B3554] dark:border-[#F37022]/60'
                : 'bg-slate-50 dark:bg-[#041B2D] text-[#063452] dark:text-[#F0F7F8] border-slate-200 dark:border-[#123E5E] hover:border-[#F37022]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-[#F37022] shrink-0" />
            <span className={activeTab === 'work-orders' ? 'text-slate-200 font-medium' : 'text-slate-500 dark:text-[#98BAC9] font-medium'}>
              Work Orders:
            </span>
            <span className="font-mono font-semibold tabular-nums">
              On-going ({kpis.ongoingWorkOrders ?? 0}) · Open ({kpis.openWorkOrders ?? 0})
            </span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {isWorkOrderMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-[#07263D] rounded-md shadow-lg border border-slate-200 dark:border-[#123E5E] py-1.5 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-slate-200 dark:border-[#123E5E] flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-[#98BAC9] uppercase tracking-wider">
                  Work Order Status
                </span>
                <button
                  onClick={() => handleWorkOrderJump('ALL')}
                  className="text-[11px] font-semibold text-[#F37022] hover:underline"
                >
                  View All
                </button>
              </div>
              {[
                { key: 'ON_GOING', label: 'On-going Work Orders', count: kpis.ongoingWorkOrders ?? 0, dot: 'bg-sky-500' },
                { key: 'OPEN', label: 'Open Work Orders', count: kpis.openWorkOrders ?? 0, dot: 'bg-[#F37022]' },
                { key: 'NOT_STARTED', label: 'Not Started Work Orders', count: kpis.notStartedWorkOrders ?? 0, dot: 'bg-amber-500' },
                { key: 'CLOSED', label: 'Closed Work Orders', count: kpis.closedWorkOrders ?? 0, dot: 'bg-emerald-500' },
                { key: 'CANCELLED', label: 'Cancelled Work Orders', count: kpis.cancelledWorkOrders ?? 0, dot: 'bg-slate-400' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleWorkOrderJump(item.key)}
                  className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#041B2D] transition-colors text-[#063452] dark:text-[#F0F7F8]"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                    <span>{item.label}</span>
                  </span>
                  <span className="font-mono font-bold tabular-nums px-1.5 py-0.5 rounded-xs bg-slate-100 dark:bg-[#041B2D] text-[11px]">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Day / Night Mode Button */}
        <button
          onClick={toggleThemeMode}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-[#123E5E] bg-slate-50 dark:bg-[#041B2D] text-[#063452] dark:text-[#F0F7F8] hover:border-[#F37022] transition-colors whitespace-nowrap"
          title={themeMode === 'day' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
        >
          {themeMode === 'day' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-[#063452]" />
              <span className="hidden md:inline">Night Mode</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-[#F37022]" />
              <span className="hidden md:inline">Day Mode</span>
            </>
          )}
        </button>

        {!hasLoadedData && (
          <button
            onClick={signInGoogle}
            disabled={isSyncingSheets}
            className="flex items-center gap-2 text-xs font-medium text-white bg-[#063452] hover:bg-[#09476e] px-3 py-1.5 rounded-md transition-all disabled:opacity-60 whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span className="hidden sm:inline">
              {isSyncingSheets ? 'Connecting...' : 'Sign in with Google'}
            </span>
          </button>
        )}

        {/* Consolidated Sheets & Auto-Sync Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsGoogleMenuOpen(!isGoogleMenuOpen);
              setIsPersonaMenuOpen(false);
              setIsWorkOrderMenuOpen(false);
            }}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border font-medium transition-colors whitespace-nowrap ${
              hasLoadedData
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200'
                : 'bg-slate-50 dark:bg-[#041B2D] hover:bg-slate-100 dark:hover:bg-[#0B3554] border-slate-200 dark:border-[#123E5E] text-[#063452] dark:text-[#F0F7F8]'
            }`}
          >
            {isSyncingSheets ? (
              <RefreshCw className="w-3.5 h-3.5 text-[#F37022] animate-spin shrink-0" />
            ) : (
              <FileSpreadsheet className={`w-3.5 h-3.5 ${hasLoadedData ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#F37022]'}`} />
            )}
            <span className="hidden sm:inline">
              {hasLoadedData
                ? autoSyncEnabled
                  ? `Sheets (Auto ${nextAutoRefreshIn}s)`
                  : 'Sheets (Synced)'
                : 'Sheets & Links'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {isGoogleMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-80 bg-white dark:bg-[#07263D] rounded-md shadow-lg border border-slate-200 dark:border-[#123E5E] p-3 z-50 text-xs space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#123E5E]">
                <div className="font-semibold text-[#063452] dark:text-[#F0F7F8]">Google Sheets Auto-Sync</div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold font-mono">
                  {autoSyncEnabled ? `ACTIVE (${nextAutoRefreshIn}s)` : 'PAUSED'}
                </span>
              </div>

              {/* Automatic Sync Engine Controls */}
              <div className="bg-slate-50 dark:bg-[#041B2D] p-2.5 rounded-xs border border-slate-100 dark:border-[#123E5E] space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#063452] dark:text-[#F0F7F8]">
                    Continuous Workbook Sync
                  </span>
                  <button
                    type="button"
                    onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                    className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase transition-colors ${
                      autoSyncEnabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {autoSyncEnabled ? 'Enabled' : 'Paused'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <span className="text-[10px] text-slate-500 dark:text-[#98BAC9]">Sync Interval:</span>
                  <div className="flex items-center gap-1">
                    {[
                      { sec: 30, label: '30s' },
                      { sec: 60, label: '1m' },
                      { sec: 120, label: '2m' },
                      { sec: 300, label: '5m' },
                    ].map((opt) => (
                      <button
                        key={opt.sec}
                        type="button"
                        onClick={() => {
                          setAutoSyncEnabled(true);
                          setAutoSyncIntervalSeconds(opt.sec);
                        }}
                        className={`px-2 py-0.5 rounded-xs font-mono text-[10px] font-semibold transition-colors ${
                          autoSyncEnabled && autoSyncIntervalSeconds === opt.sec
                            ? 'bg-[#063452] dark:bg-[#F37022] text-white'
                            : 'bg-white dark:bg-[#07263D] text-slate-600 dark:text-[#98BAC9] border border-slate-200 dark:border-[#123E5E]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/70 dark:border-[#123E5E] text-[11px]">
                  <div>
                    <div className="text-slate-500 dark:text-[#98BAC9]">Account</div>
                    <div className="font-medium text-[#063452] dark:text-[#F0F7F8] truncate">
                      {googleUser?.email || (hasLoadedData ? 'Auto-Sync Ready' : 'Not Connected')}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-[#98BAC9]">Last Synced</div>
                    <div className="font-mono text-[#063452] dark:text-slate-200">
                      {lastSyncTime || 'Ready'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <a
                  href={workbookUrls.GSE}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsGoogleMenuOpen(false)}
                  className="w-full py-1.5 px-2.5 bg-slate-50 dark:bg-[#041B2D] hover:bg-slate-100 dark:hover:bg-[#0B3554] text-[#063452] dark:text-[#F0F7F8] rounded-xs font-medium flex items-center justify-between"
                >
                  <span>1. GSE Masterlist Sheet</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
                <a
                  href={workbookUrls.MATERIALS}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsGoogleMenuOpen(false)}
                  className="w-full py-1.5 px-2.5 bg-slate-50 dark:bg-[#041B2D] hover:bg-slate-100 dark:hover:bg-[#0B3554] text-[#063452] dark:text-[#F0F7F8] rounded-xs font-medium flex items-center justify-between"
                >
                  <span>2. Materials & Inventory Sheet</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
                <a
                  href={workbookUrls.TRANSMITTALS_AND_RECEIVING}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsGoogleMenuOpen(false)}
                  className="w-full py-1.5 px-2.5 bg-slate-50 dark:bg-[#041B2D] hover:bg-slate-100 dark:hover:bg-[#0B3554] text-[#063452] dark:text-[#F0F7F8] rounded-xs font-medium flex items-center justify-between"
                >
                  <span>3. Receiving & Transmittals Sheet</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
                <a
                  href={workbookUrls.PERFORMANCE}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsGoogleMenuOpen(false)}
                  className="w-full py-1.5 px-2.5 bg-slate-50 dark:bg-[#041B2D] hover:bg-slate-100 dark:hover:bg-[#0B3554] text-[#063452] dark:text-[#F0F7F8] rounded-xs font-medium flex items-center justify-between"
                >
                  <span>4. Monitoring & Work Orders Sheet</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </div>

              <div className="pt-1 border-t border-slate-200 dark:border-[#123E5E] space-y-1">
                <button
                  onClick={async () => {
                    setIsGoogleMenuOpen(false);
                    await refreshSheets();
                  }}
                  disabled={isSyncingSheets}
                  className="w-full py-1.5 px-2.5 bg-slate-100 dark:bg-[#041B2D] hover:bg-slate-200 dark:hover:bg-[#0B3554] text-[#063452] dark:text-[#F0F7F8] rounded-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin text-[#F37022]' : ''}`} />
                  <span>{isSyncingSheets ? 'Syncing All Workbooks...' : 'Sync All Workbooks Now'}</span>
                </button>

                {!isGoogleConnected && (
                  <button
                    onClick={async () => {
                      setIsGoogleMenuOpen(false);
                      await signInGoogle();
                    }}
                    disabled={isSyncingSheets}
                    className="w-full py-1.5 px-2.5 bg-[#F37022] hover:bg-[#d95f16] text-white rounded-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                    <span>Authorize Google Account</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsGoogleMenuOpen(false);
                    setIsDatabaseSettingsOpen(true);
                  }}
                  className="w-full py-1.5 px-2.5 bg-[#063452] text-white hover:bg-[#09476e] rounded-xs font-medium text-center transition-colors"
                >
                  Sheets Schema & Auto-Sync Status
                </button>

                {hasLoadedData && (
                  <button
                    onClick={async () => {
                      setIsGoogleMenuOpen(false);
                      await signOutGoogle();
                    }}
                    className="w-full py-1.5 px-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect & Clear Local Cache</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
