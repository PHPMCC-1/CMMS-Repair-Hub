import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { WORKBOOK_IDS, WORKBOOK_URLS } from '../../services/unifiedSheetsService';

export const DatabaseSettingsDrawer: React.FC = () => {
  const {
    isDatabaseSettingsOpen,
    setIsDatabaseSettingsOpen,
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
    sourceStatuses,
    refreshSheets,
    equipment,
    inventory,
    transactions,
    transmittals,
    workOrders,
    signInGoogle,
    signOutGoogle,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'gse' | 'inventory' | 'transactions' | 'transmittals' | 'monitoring'>('gse');

  if (!isDatabaseSettingsOpen) return null;

  const hasLoadedData = equipment.length > 0 || workOrders.length > 0 || isUsingCachedData || isGoogleConnected;

  const schemaDefinitions = {
    gse: {
      title: 'GSE Masterlist',
      workbookId: WORKBOOK_IDS.GSE,
      tab: 'Masterlist',
      url: WORKBOOK_URLS.GSE,
      headers: [
        { name: 'Equipment No.', role: 'Primary Key' },
        { name: 'Equipment Name', role: 'Asset Title' },
        { name: 'Category', role: 'Classification' },
        { name: 'Manufacturer / Model', role: 'Specifications' },
        { name: 'Serial / Asset Number', role: 'Identification' },
        { name: 'Current Status / Condition', role: 'Status' },
        { name: 'Station / Location', role: 'Assignment' },
        { name: 'Main Photo Link / URL', role: 'Unit Picture' },
      ],
    },
    inventory: {
      title: 'Materials Inventory',
      workbookId: WORKBOOK_IDS.MATERIALS,
      tab: 'INVENTORY',
      url: WORKBOOK_URLS.MATERIALS,
      headers: [
        { name: 'ITEM CODE', role: 'Primary Key' },
        { name: 'ITEM', role: 'Description' },
        { name: 'MATERIAL TYPE / CATEGORY', role: 'Classification' },
        { name: 'UOM', role: 'Unit' },
        { name: 'PART NUMBER / MAKE', role: 'OEM Spec' },
        { name: 'MIN / MAX', role: 'Thresholds' },
        { name: 'STOCK ON HAND', role: 'Balance' },
        { name: 'STOCK STATUS', role: 'Status' },
      ],
    },
    transactions: {
      title: 'Materials Transactions',
      workbookId: WORKBOOK_IDS.MATERIALS,
      tab: 'MATERIALS TRANSACTIONS',
      url: WORKBOOK_URLS.MATERIALS_TRANSACTIONS,
      headers: [
        { name: 'TRANSACTION #', role: 'Primary Key' },
        { name: 'DATE', role: 'Date' },
        { name: 'TRANSACTION TYPE', role: 'Movement Type' },
        { name: 'ITEM CODE / ITEM', role: 'Material' },
        { name: 'QTY / UOM', role: 'Quantity' },
        { name: 'PROVIDER', role: 'Source / Party' },
      ],
    },
    transmittals: {
      title: 'Transmittals & Receiving',
      workbookId: WORKBOOK_IDS.MATERIALS,
      tab: 'TRANSMITTALS AND RECEIVING',
      url: WORKBOOK_URLS.TRANSMITTALS_AND_RECEIVING,
      headers: [
        { name: 'TRANSMITTAL NUMBER', role: 'Primary Key' },
        { name: 'CATERGORY', role: 'Category' },
        { name: 'CLIENT / PROJECT NAME', role: 'Recipient' },
        { name: 'ITEMS TRANSMITTED/RECEIVED', role: 'Manifest' },
        { name: 'DATE OF SUBMISSION', role: 'Date' },
        { name: 'FILES / ATTACHMENT', role: 'Documents' },
      ],
    },
    monitoring: {
      title: 'Performance Monitoring',
      workbookId: WORKBOOK_IDS.PERFORMANCE,
      tab: 'MONITORING',
      url: WORKBOOK_URLS.PERFORMANCE,
      headers: [
        { name: 'WORK ORDER NUMBER', role: 'Primary Key' },
        { name: 'DATE ISSUED', role: 'Date' },
        { name: 'UNIT #', role: 'Joined Unit Key' },
        { name: 'STATUS', role: 'Order Status' },
        { name: 'DEFECT / ACTION TAKEN', role: 'Scope' },
        { name: 'EMH / AMH', role: 'Man Hours' },
        { name: 'SCHEDULE VARIANCE', role: 'Turnaround' },
        { name: 'TOTAL DAYS EQUIPMENT DOWNTIME', role: 'Downtime' },
      ],
    },
  };

  const curDef = schemaDefinitions[activeTab];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#041B2D]/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white dark:bg-[#07263D] h-full shadow-2xl flex flex-col animate-slideLeft text-xs text-[#063452] dark:text-[#F0F7F8] border-l border-[#d6e6e9] dark:border-[#123E5E]">
        {/* Header */}
        <div className="p-5 border-b border-[#d6e6e9] dark:border-[#123E5E] flex items-center justify-between bg-[#F0F7F8] dark:bg-[#041B2D]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F37022]/15 text-[#F37022] flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#063452] dark:text-[#F0F7F8]">
                Google Sheets Automated Sync
              </h2>
            </div>
          </div>

          <button
            onClick={() => setIsDatabaseSettingsOpen(false)}
            className="p-2 text-[#063452]/60 dark:text-[#98BAC9] hover:text-[#063452] dark:hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connection & Auto-Sync Status Card */}
        <div className="p-5 border-b border-[#d6e6e9] dark:border-[#123E5E] bg-[#F0F7F8]/40 dark:bg-[#041B2D]/40 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  hasLoadedData
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-neutral-400'
                }`}
              />
              <span className="font-bold text-[#063452] dark:text-[#F0F7F8]">
                {googleUser?.email
                  ? `${googleUser.email} (Auto-Sync Active)`
                  : hasLoadedData
                  ? 'All Workbooks Synced (Auto-Sync Active)'
                  : 'Not Connected'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshSheets}
                disabled={isSyncingSheets}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-[#07263D] border border-[#d6e6e9] dark:border-[#123E5E] text-[#063452] dark:text-[#F0F7F8] rounded-lg font-semibold shadow-2xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin text-[#F37022]' : ''}`} />
                <span>{isSyncingSheets ? 'Syncing...' : 'Sync Now'}</span>
              </button>

              {!isGoogleConnected && (
                <button
                  onClick={signInGoogle}
                  disabled={isSyncingSheets}
                  className="px-3 py-1 bg-[#F37022] hover:bg-[#d95f16] text-white rounded-lg font-semibold shadow-2xs disabled:opacity-50"
                >
                  Authorize Google
                </button>
              )}

              {hasLoadedData && (
                <button
                  onClick={signOutGoogle}
                  className="px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-semibold"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-[#07263D] border border-[#d6e6e9] dark:border-[#123E5E]">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-semibold text-[#063452] dark:text-[#F0F7F8]">Background Auto-Sync:</span>
              <button
                type="button"
                onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase ${
                  autoSyncEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {autoSyncEnabled ? `ON (${nextAutoRefreshIn}s)` : 'PAUSED'}
              </button>
              {lastSyncTime && (
                <span className="text-slate-500 dark:text-[#98BAC9] font-mono">
                  · Last Synced: {lastSyncTime}
                </span>
              )}
            </div>

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
                  className={`px-2 py-0.5 rounded-xs font-mono text-[10px] font-semibold ${
                    autoSyncEnabled && autoSyncIntervalSeconds === opt.sec
                      ? 'bg-[#063452] dark:bg-[#F37022] text-white'
                      : 'bg-slate-100 dark:bg-[#041B2D] text-slate-600 dark:text-[#98BAC9]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {sourceStatuses && (
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="p-2.5 rounded-lg bg-white dark:bg-[#07263D] border border-[#d6e6e9] dark:border-[#123E5E]">
                <div className="font-bold text-[#063452] dark:text-[#F0F7F8]">GSE Masterlist</div>
                <div className="text-[#F37022] font-mono font-bold mt-0.5">{equipment.length} units</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-[#07263D] border border-[#d6e6e9] dark:border-[#123E5E]">
                <div className="font-bold text-[#063452] dark:text-[#F0F7F8]">Materials</div>
                <div className="text-[#F37022] font-mono font-bold mt-0.5">{inventory.length + transactions.length + transmittals.length} rows</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-[#07263D] border border-[#d6e6e9] dark:border-[#123E5E]">
                <div className="font-bold text-[#063452] dark:text-[#F0F7F8]">Monitoring</div>
                <div className="text-[#F37022] font-mono font-bold mt-0.5">{workOrders.length} orders</div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#d6e6e9] dark:border-[#123E5E] bg-white dark:bg-[#07263D] px-5 pt-3 gap-2 overflow-x-auto">
          {[
            { id: 'gse', label: 'GSE Masterlist' },
            { id: 'inventory', label: 'Inventory' },
            { id: 'transactions', label: 'Transactions' },
            { id: 'transmittals', label: 'Transmittals' },
            { id: 'monitoring', label: 'Work Orders' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`pb-2 px-2 font-bold whitespace-nowrap border-b-2 transition-all ${
                activeTab === t.id
                  ? 'border-[#F37022] text-[#F37022]'
                  : 'border-transparent text-[#063452]/60 dark:text-[#98BAC9] hover:text-[#063452] dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between bg-[#F0F7F8] dark:bg-[#041B2D] p-3.5 rounded-xl border border-[#d6e6e9] dark:border-[#123E5E]">
            <div>
              <div className="font-bold text-sm text-[#063452] dark:text-[#F0F7F8]">{curDef.title}</div>
              <div className="text-[11px] text-[#063452]/60 dark:text-[#98BAC9] font-mono mt-0.5">Tab: {curDef.tab}</div>
            </div>
            <a
              href={curDef.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#063452] dark:bg-[#F37022] text-white rounded-lg font-semibold"
            >
              <span>Open in Sheets</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="border border-slate-200 dark:border-[#163854] rounded-md overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="py-2.5 px-3.5">Source Column</th>
                  <th className="py-2.5 px-3.5">Field Role</th>
                </tr>
              </thead>
              <tbody>
                {curDef.headers.map((h) => (
                  <tr key={h.name} className="transition-colors">
                    <td className="py-2.5 px-3.5 align-middle font-mono font-bold text-[#063452] dark:text-[#F0F7F8]">{h.name}</td>
                    <td className="py-2.5 px-3.5 align-middle text-slate-600 dark:text-[#98BAC9]">{h.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#d6e6e9] dark:border-[#123E5E] bg-[#F0F7F8] dark:bg-[#041B2D] flex items-center justify-end">
          <button
            onClick={() => setIsDatabaseSettingsOpen(false)}
            className="px-4 py-2 bg-[#063452] dark:bg-[#0B3554] text-white rounded-lg font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
