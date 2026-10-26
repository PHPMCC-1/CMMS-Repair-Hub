import React from 'react';
import { useApp } from '../../context/AppContext';
import { PHPLogo } from '../layout/PHPLogo';
import { GSEUnitOverviewBoard } from '../fleet/GSEUnitOverviewBoard';
import { EquipmentProfileModal } from '../fleet/EquipmentProfileModal';
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  Clock,
  Package,
  Layers,
  ShieldAlert,
  RotateCcw,
  LogIn,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const {
    isSyncingSheets,
    isUsingCachedData,
    lastSyncTime,
    syncStatus,
    syncError,
    sourceStatuses,
    nextAutoRefreshIn,
    autoSyncEnabled,
    signInGoogle,
    refreshSheets,
    equipment,
    selectedEquipment,
    setSelectedEquipment,
    workOrders,
    kpis,
    setActiveTab,
    setSelectedWorkOrder,
  } = useApp();

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs < 10 ? '0' : ''}${secs}s` : `${secs}s`;
  };

  return (
    <div className="p-3 @md:p-6 max-w-7xl mx-auto space-y-4 @md:space-y-5 text-[#063452] dark:text-[#F0F7F8]">
      {/* Executive Command Header Bar */}
      <div className="bg-[#063452] dark:bg-[#051C2C] rounded-lg p-4 @md:p-5 border border-[#163854] text-white shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="hidden @sm:flex items-center p-2 bg-white rounded-md shrink-0">
            <PHPLogo size="md" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] @md:text-xs text-slate-300 mb-0.5">
              <span>GSE Fleet & Maintenance Operations</span>
              <span>·</span>
              <span className="font-mono">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {autoSyncEnabled && (syncStatus === 'success' || syncStatus === 'partial') && (
                <>
                  <span>·</span>
                  <span className="font-mono text-emerald-300">
                    {isSyncingSheets ? 'Auto-syncing workbooks...' : `Auto-sync in ${formatCountdown(nextAutoRefreshIn)}`}
                  </span>
                </>
              )}
              {lastSyncTime && (
                <>
                  <span>·</span>
                  <span className="font-mono text-sky-300">
                    Last synced: {lastSyncTime}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-base @sm:text-xl @lg:text-2xl font-bold text-white tracking-tight">
              PHP Repair Hub Maintenance Command Center
            </h1>
          </div>
        </div>
      </div>

      {/* Sign-In / Expired / Error Banners (only when no dataset is loaded) */}

      {syncStatus === 'token_expired' && !isUsingCachedData && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-lg p-4 @md:p-5 space-y-3 text-amber-950 dark:text-amber-100 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <h3 className="font-bold text-sm text-amber-900 dark:text-amber-100">
                Google Sheets access expired
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Connect your Google account once to load and persist your GSE fleet, reliability MTBF/MTTR analytics, and materials workbooks locally.
              </p>
              <div className="pt-2">
                <button
                  onClick={signInGoogle}
                  disabled={isSyncingSheets}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#F37022] hover:bg-[#d95f16] text-white text-xs font-semibold rounded-md transition-colors shadow-2xs disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSheets ? 'Connecting...' : 'Reconnect Google'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {syncStatus === 'signed_out' && (
        <div className="bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-lg p-6 text-center space-y-3 shadow-2xs">
          <div className="w-10 h-10 bg-slate-100 dark:bg-[#041B2D] text-[#063452] dark:text-[#F37022] rounded-md mx-auto flex items-center justify-center">
            <LogIn className="w-5 h-5" />
          </div>
          <div className="max-w-lg mx-auto space-y-1">
            <h2 className="text-base font-bold text-[#063452] dark:text-[#F0F7F8]">Google Sheets Sign-In Required</h2>
            <p className="text-xs text-slate-500 dark:text-[#98BAC9]">
              Connect your Google account to load live GSE Units, Per-Unit MTBF & MTTR Reliability, Materials and Inventory, and Work Orders.
            </p>
          </div>
          <div>
            <button
              onClick={signInGoogle}
              disabled={isSyncingSheets}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#063452] hover:bg-[#09476e] dark:bg-[#F37022] dark:hover:bg-[#d95f16] text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#F37022] dark:text-white" />
              <span>{isSyncingSheets ? 'Connecting...' : 'Sign In with Google'}</span>
            </button>
          </div>
        </div>
      )}

      {syncStatus === 'loading' && (
        <div className="bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-lg p-6 text-center space-y-2">
          <div className="inline-flex p-2.5 bg-slate-100 dark:bg-[#041B2D] rounded-md text-[#F37022] animate-spin">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-[#063452] dark:text-[#F0F7F8]">
            Syncing Google Sheets...
          </div>
        </div>
      )}

      {syncStatus === 'error' && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg p-4 @md:p-5 space-y-3 text-rose-950 dark:text-rose-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-rose-900 dark:text-rose-100">Sheet Access Error</h3>
              <p className="text-xs text-rose-800 dark:text-rose-300 mt-1">
                {syncError || 'Could not read from one or more workbooks. Verify your Google account has Viewer permissions.'}
              </p>

              {sourceStatuses && (
                <div className="grid grid-cols-1 @sm:grid-cols-3 gap-2 mt-3 text-xs">
                  {Object.entries(sourceStatuses).map(([key, item]) => (
                    <div key={key} className={`p-2 rounded-xs border ${item.status === 'error' ? 'bg-rose-100/60 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700' : 'bg-emerald-100/60 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700'}`}>
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-[11px] font-mono mt-0.5">{item.status === 'error' ? item.errorMessage || 'Error' : `OK (${item.rowCount} rows)`}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2.5 mt-3">
                <button
                  onClick={refreshSheets}
                  className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xs text-xs font-semibold flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Try Again
                </button>
                <button
                  onClick={signInGoogle}
                  className="px-3.5 py-1.5 bg-white dark:bg-[#07263D] border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 hover:bg-rose-100 rounded-xs text-xs font-semibold"
                >
                  Reconnect Google
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Summary KPI Strip (Container-responsive for Mobile / Tablet / Desktop) */}
      <div className="grid grid-cols-1 @xs:grid-cols-2 @lg:grid-cols-4 gap-3 @md:gap-4">
        <div className="bg-white dark:bg-[#07263D] rounded-lg p-3.5 @md:p-4 border border-slate-200 dark:border-[#163854] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600 dark:text-[#98BAC9] font-semibold uppercase tracking-wide">Fleet Total</span>
            <Layers className="w-4 h-4 text-[#063452] dark:text-[#F37022] shrink-0" />
          </div>
          <div className="mt-2 text-xl @md:text-2xl font-bold text-[#063452] dark:text-[#F0F7F8] font-mono tabular-nums">
            {kpis.fleetTotal !== null ? kpis.fleetTotal : <span className="text-slate-400 dark:text-[#98BAC9]/50 text-sm font-normal">Unavailable</span>}
          </div>
        </div>

        <div className="bg-white dark:bg-[#07263D] rounded-lg p-3.5 @md:p-4 border border-slate-200 dark:border-[#163854] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600 dark:text-[#98BAC9] font-semibold uppercase tracking-wide">Total Actual Man Hours</span>
            <Clock className="w-4 h-4 text-[#063452] dark:text-[#F37022] shrink-0" />
          </div>
          <div className="mt-2 text-xl @md:text-2xl font-bold text-[#063452] dark:text-[#F0F7F8] font-mono tabular-nums">
            {kpis.totalAMH !== null ? `${kpis.totalAMH.toLocaleString()} hrs` : <span className="text-slate-400 dark:text-[#98BAC9]/50 text-sm font-normal">Unavailable</span>}
          </div>
        </div>

        <div className="bg-white dark:bg-[#07263D] rounded-lg p-3.5 @md:p-4 border border-slate-200 dark:border-[#163854] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600 dark:text-[#98BAC9] font-semibold uppercase tracking-wide">Inventory Stock Alerts</span>
            <Package className="w-4 h-4 text-[#F37022] shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {kpis.inventoryTotal !== null && (kpis.inventoryLowStock !== null || kpis.inventoryOutOfStock !== null || kpis.inventoryReorder !== null) ? (
              <>
                <span className="text-xl @md:text-2xl font-bold text-[#063452] dark:text-[#F0F7F8] font-mono tabular-nums">
                  {(kpis.inventoryLowStock ?? 0) + (kpis.inventoryOutOfStock ?? 0) + (kpis.inventoryReorder ?? 0)}
                </span>
                <span className="text-xs text-slate-500 dark:text-[#98BAC9]">items flagged</span>
              </>
            ) : (
              <span className="text-slate-400 dark:text-[#98BAC9]/50 text-sm font-normal">Unavailable</span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#07263D] rounded-lg p-3.5 @md:p-4 border border-slate-200 dark:border-[#163854] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600 dark:text-[#98BAC9] font-semibold uppercase tracking-wide">Transmittals Logged</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="mt-2 text-xl @md:text-2xl font-bold text-[#063452] dark:text-[#F0F7F8] font-mono tabular-nums">
            {kpis.transmittalsTotal !== null ? kpis.transmittalsTotal : <span className="text-slate-400 dark:text-[#98BAC9]/50 text-sm font-normal">Unavailable</span>}
          </div>
        </div>
      </div>

      {/* Ground Support Equipment Unit Overview Grid */}
      <GSEUnitOverviewBoard
        equipment={equipment}
        onSelectEquipment={(eq) => setSelectedEquipment(eq)}
        title="Ground Support Equipment — Unit Overview"
      />

      {/* Equipment Profile & Maintenance History Modal */}
      <EquipmentProfileModal
        equipment={selectedEquipment}
        workOrders={workOrders}
        onClose={() => setSelectedEquipment(null)}
        onSelectWorkOrder={(wo) => {
          setSelectedWorkOrder(wo);
          setActiveTab('work-orders');
        }}
      />
    </div>
  );
};
