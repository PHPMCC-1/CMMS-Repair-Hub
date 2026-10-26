import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { EquipmentPhoto } from '../fleet/EquipmentPhoto';
import {
  isCancelledWorkOrderStatus,
  isClosedWorkOrderStatus,
  isOngoingWorkOrderStatus,
  isNotStartedWorkOrderStatus,
  isOpenWorkOrderStatus,
  isInternalWorkOrder,
  isClientEquipmentWorkOrder,
} from '../../types/unifiedSheets';
import {
  Search,
  ExternalLink,
  Wrench,
  X,
  ArrowUpRight,
  ChevronRight,
  Building2,
  RefreshCw,
  ArrowUpDown,
} from 'lucide-react';

export const PerformanceWorkOrdersView: React.FC = () => {
  const {
    workOrders,
    filteredWorkOrders,
    selectedWorkOrder,
    setSelectedWorkOrder,
    setSelectedEquipment,
    setActiveTab,
    clientFilter,
    setClientFilter,
    statusFilter,
    setStatusFilter,
    stationFilter,
    searchQuery,
    setSearchQuery,
    resetAllFilters,
    syncStatus,
    isGoogleConnected,
    isSyncingSheets,
    isUsingCachedData,
    lastSyncTime,
    nextAutoRefreshIn,
    autoSyncEnabled,
    signInGoogle,
    refreshSheets,
    isAdmin,
  } = useApp();

  const [sortOrder, setSortOrder] = useState<'latest_first' | 'sheet_order'>('latest_first');

  const availableClients = useMemo(
    () => Array.from(new Set(workOrders.map(w => w.client).filter(Boolean))).sort(),
    [workOrders]
  );
  const availableStatuses = useMemo(
    () => Array.from(new Set(workOrders.map(w => w.status).filter(Boolean))).sort(),
    [workOrders]
  );

  const latestWorkOrder = useMemo(() => {
    if (workOrders.length === 0) return null;
    return workOrders[workOrders.length - 1];
  }, [workOrders]);

  const sortedWorkOrders = useMemo(() => {
    if (sortOrder === 'latest_first') {
      return [...filteredWorkOrders].reverse();
    }
    return filteredWorkOrders;
  }, [filteredWorkOrders, sortOrder]);

  const totalClientEquipmentCount = useMemo(
    () => workOrders.filter(w => isClientEquipmentWorkOrder(w.client)).length,
    [workOrders]
  );
  const totalInternalCount = useMemo(
    () => workOrders.filter(w => isInternalWorkOrder(w.client)).length,
    [workOrders]
  );

  const filteredClientEquipmentCount = filteredWorkOrders.filter(w => isClientEquipmentWorkOrder(w.client)).length;
  const filteredInternalCount = filteredWorkOrders.filter(w => isInternalWorkOrder(w.client)).length;

  const openCount = filteredWorkOrders.filter(w => isOpenWorkOrderStatus(w.status)).length;
  const ongoingCount = filteredWorkOrders.filter(w => isOngoingWorkOrderStatus(w.status)).length;
  const notStartedCount = filteredWorkOrders.filter(w => isNotStartedWorkOrderStatus(w.status)).length;
  const cancelledCount = filteredWorkOrders.filter(w => isCancelledWorkOrderStatus(w.status)).length;
  const closedCount = filteredWorkOrders.filter(w => isClosedWorkOrderStatus(w.status)).length;

  const getWorkOrderBadgeClass = (status: string) => {
    if (isClosedWorkOrderStatus(status)) {
      return 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60';
    }
    if (isCancelledWorkOrderStatus(status)) {
      return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
    if (isOngoingWorkOrderStatus(status)) {
      return 'bg-[#F37022]/10 text-[#F37022] border border-[#F37022]/30';
    }
    if (isNotStartedWorkOrderStatus(status)) {
      return 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60';
    }
    return 'bg-sky-50 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60';
  };

  return (
    <div className="p-3 @md:p-6 max-w-7xl mx-auto space-y-4 @md:space-y-5 text-[#063452] dark:text-[#F0F7F8]">
      {/* Executive Header Bar */}
      <div className="bg-white dark:bg-[#07263D] rounded-lg p-4 @md:p-5 border border-slate-200 dark:border-[#163854] shadow-2xs space-y-3">
        <div className="flex flex-col @lg:flex-row @lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-[#063452] text-[#F37022] flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base @md:text-xl font-bold text-[#063452] dark:text-[#F0F7F8] tracking-tight">
                  Master Work Order Log
                </h1>
                <span className="font-mono text-xs font-semibold text-slate-500 dark:text-[#98BAC9]">
                  ({filteredWorkOrders.length} orders)
                </span>
                {latestWorkOrder && (
                  <span className="px-2 py-0.5 rounded-xs bg-[#F37022]/10 border border-[#F37022]/30 text-[#F37022] font-mono text-[11px] font-bold">
                    Latest Detected: {latestWorkOrder.workOrderNumber} (Row #{latestWorkOrder.rowNumber})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-[#98BAC9] truncate">
                Work orders not marked as "Internal" are classified as Client Equipment ({filteredClientEquipmentCount} Client Equipment{isAdmin ? ` · ${filteredInternalCount} Internal` : ''}).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Read-only Status Summary Breakdown (Filter via dropdown below) */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] @md:text-xs font-mono tabular-nums bg-slate-50 dark:bg-[#041B2D] px-3.5 py-2 rounded-md border border-slate-200 dark:border-[#163854]">
              <span className="text-[#F37022] font-semibold">On-going: {ongoingCount}</span>
              <span className="text-slate-300 dark:text-white/20">·</span>
              <span className="text-amber-700 dark:text-amber-300 font-semibold">Open: {openCount}</span>
              <span className="text-slate-300 dark:text-white/20">·</span>
              <span className="text-sky-700 dark:text-sky-300 font-semibold">Not Started: {notStartedCount}</span>
              <span className="text-slate-300 dark:text-white/20">·</span>
              <span className="text-slate-600 dark:text-slate-400 font-semibold">Cancelled: {cancelledCount}</span>
              <span className="text-slate-300 dark:text-white/20">·</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Closed: {closedCount}</span>
            </div>

            <button
              type="button"
              onClick={() => (workOrders.length > 0 || isGoogleConnected ? refreshSheets() : signInGoogle())}
              disabled={isSyncingSheets}
              title={`Automatically syncing MONITORING sheet (${lastSyncTime ? `Last synced: ${lastSyncTime}` : 'Live'}) — click to sync immediately`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#063452] hover:bg-[#09476e] dark:bg-[#F37022] dark:hover:bg-[#d95f16] text-white text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
              <span>
                {isSyncingSheets
                  ? 'Syncing WOs...'
                  : autoSyncEnabled
                  ? `Auto-Sync (${nextAutoRefreshIn}s)`
                  : 'Sync Now'}
              </span>
            </button>
          </div>
        </div>

        {/* Expired Token Alert Banner (only if no cached snapshot is present) */}
        {syncStatus === 'token_expired' && !isUsingCachedData && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-lg p-3.5 flex flex-col @sm:flex-row @sm:items-center justify-between gap-3 text-amber-950 dark:text-amber-100 shadow-2xs">
            <div className="flex items-center gap-2.5 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>Google Sheets access expired — connect Google to load performance monitoring and work orders.</span>
            </div>
            <button
              onClick={signInGoogle}
              className="px-3.5 py-1.5 bg-[#F37022] hover:bg-[#d95f16] text-white text-xs font-semibold rounded-md transition-colors whitespace-nowrap self-start @sm:self-auto"
            >
              Reconnect Google
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {syncStatus === 'signed_out' ? (
        <div className="bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-lg p-10 text-center space-y-3">
          <Wrench className="w-8 h-8 text-[#F37022] mx-auto" />
          <h3 className="text-sm font-semibold text-[#063452] dark:text-[#F0F7F8]">Sign In to Load Work Orders</h3>
          <button
            onClick={signInGoogle}
            className="px-4 py-2 bg-[#063452] dark:bg-[#F37022] text-white text-xs font-semibold rounded-md"
          >
            Sign in with Google
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="bg-white dark:bg-[#07263D] p-3.5 @md:p-4 rounded-lg border border-slate-200 dark:border-[#163854] shadow-2xs space-y-3">
            <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-4 gap-3 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search WO #, Unit #, Defect, Mechanic..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] placeholder-slate-400 focus:outline-none focus:border-[#F37022]"
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full py-1.5 px-3 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open Work Orders (Excludes Closed & Cancelled)</option>
                  <option value="ON_GOING">On-going Work Orders</option>
                  <option value="NOT_STARTED">Not Started Work Orders</option>
                  <option value="CANCELLED">Cancelled Work Orders</option>
                  <option value="CLOSED">Closed Work Orders</option>
                  {availableStatuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full py-1.5 px-3 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
                >
                  <option value="ALL">
                    {isAdmin
                      ? `All Ownership & Clients (${workOrders.length})`
                      : `All Client Equipment (${workOrders.length})`}
                  </option>
                  <option value="CLIENT_EQUIPMENT">
                    Client Equipment Only — Not "Internal" ({totalClientEquipmentCount})
                  </option>
                  {isAdmin && (
                    <option value="INTERNAL_ONLY">
                      Internal Equipment Only — Marked "Internal" ({totalInternalCount})
                    </option>
                  )}
                  {availableClients.map(c => (
                    <option key={c} value={c}>
                      {isInternalWorkOrder(c) ? `Internal (${c})` : `Client: ${c}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => (prev === 'latest_first' ? 'sheet_order' : 'latest_first'))}
                  className="w-full py-1.5 px-3 bg-slate-50 dark:bg-[#041B2D] hover:border-[#F37022] border border-slate-200 dark:border-[#163854] rounded-md text-xs font-semibold text-[#063452] dark:text-[#F0F7F8] flex items-center justify-between transition-colors"
                >
                  <span className="truncate">
                    {sortOrder === 'latest_first' ? 'Order: Newest WOs First' : 'Order: Sheet Row (RH-0001+)'}
                  </span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#F37022] shrink-0 ml-1.5" />
                </button>
              </div>
            </div>

            {(searchQuery || statusFilter !== 'ALL' || clientFilter !== 'ALL' || stationFilter !== 'ALL') && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#163854] text-xs">
                <span className="text-slate-500 dark:text-[#98BAC9]">
                  Showing {filteredWorkOrders.length} of {workOrders.length} work orders
                </span>
                <button
                  onClick={resetAllFilters}
                  className="text-[#F37022] hover:underline font-semibold"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>

          {/* Enterprise Grid Table */}
          <div className="bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-lg overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead>
                  <tr>
                    <th className="py-2.5 px-3">WO Number</th>
                    <th className="py-2.5 px-3">Date Issued</th>
                    <th className="py-2.5 px-3">Unit #</th>
                    <th className="py-2.5 px-3">Equipment</th>
                    <th className="py-2.5 px-3">Client / Ownership</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Defect & Action Taken</th>
                    <th className="py-2.5 px-3">Mechanic</th>
                    <th className="py-2.5 px-3">Variance</th>
                    <th className="py-2.5 px-3 text-right">AMH</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedWorkOrders.length > 0 ? (
                    sortedWorkOrders.map((wo) => {
                      const isClientEq = isClientEquipmentWorkOrder(wo.client);
                      return (
                        <tr
                          key={`${wo.workOrderNumber}-${wo.rowNumber}`}
                          onClick={() => setSelectedWorkOrder(wo)}
                          className="transition-colors cursor-pointer group"
                        >
                          <td className="py-2.5 px-3 align-middle font-mono font-bold text-[#063452] dark:text-[#F0F7F8] group-hover:text-[#F37022] whitespace-nowrap">
                            {wo.workOrderNumber}
                          </td>
                          <td className="py-2.5 px-3 align-middle font-mono tabular-nums text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                            {wo.dateIssued || '-'}
                          </td>
                          <td className="py-2.5 px-3 align-middle font-mono font-semibold text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                            {wo.unitNumber || '-'}
                          </td>
                          <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                            {wo.matchedEquipment ? (
                              <span className="text-[#063452] dark:text-[#F0F7F8] font-medium">
                                {wo.matchedEquipment.equipmentName}
                                {wo.matchedEquipment.station && (
                                  <span className="text-[11px] text-slate-500 dark:text-[#98BAC9] font-mono ml-1.5">
                                    ({wo.matchedEquipment.station})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-[#98BAC9]/50 text-[11px]">Unmatched</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {isClientEq ? (
                                <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 inline-flex items-center gap-1">
                                  <Building2 className="w-2.5 h-2.5 text-[#F37022]" />
                                  <span>Client Equipment</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  Internal
                                </span>
                              )}
                              {isClientEq && wo.client && (
                                <span className="text-[#063452] dark:text-[#F0F7F8] font-medium">
                                  {wo.client}
                                </span>
                              )}
                            </div>
                          </td>
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold inline-block ${getWorkOrderBadgeClass(wo.status)}`}>
                            {wo.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 align-middle text-slate-600 dark:text-[#98BAC9] max-w-xs truncate" title={wo.defect || wo.description}>
                          <div className="font-medium truncate text-[#063452] dark:text-[#F0F7F8]">{wo.defect || wo.description || '-'}</div>
                          {wo.actionTaken && (
                            <div className="text-[11px] text-slate-500 dark:text-[#98BAC9] font-normal truncate">
                              Action: {wo.actionTaken}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                          {wo.assignedMechanic || '-'}
                        </td>
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                          {wo.scheduleVariance ? (
                            <span className={`text-[11px] font-semibold ${
                              wo.scheduleVariance.toLowerCase() === 'on time'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-600 dark:text-[#98BAC9]'
                            }`}>
                              {wo.scheduleVariance}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums font-semibold text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                          {wo.amh !== null ? `${wo.amh} hrs` : '-'}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap">
                          <span className="text-[#F37022] font-semibold inline-flex items-center justify-end gap-0.5">
                            <span>Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-slate-400 dark:text-[#98BAC9]/50">
                        No work orders found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Work Order Detail Drawer */}
      {selectedWorkOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-[#041B2D]/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white dark:bg-[#07263D] h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-[#163854]">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-[#163854] flex items-center justify-between bg-slate-50 dark:bg-[#041B2D]">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-[#F37022] bg-[#F37022]/10 px-2 py-0.5 rounded-xs border border-[#F37022]/30">
                    {selectedWorkOrder.workOrderNumber}
                  </span>
                  <span className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold ${getWorkOrderBadgeClass(selectedWorkOrder.status)}`}>
                    {selectedWorkOrder.status}
                  </span>
                  {isClientEquipmentWorkOrder(selectedWorkOrder.client) ? (
                    <span className="px-2 py-0.5 rounded-xs text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 inline-flex items-center gap-1">
                      <Building2 className="w-2.5 h-2.5 text-[#F37022]" />
                      <span>Client Equipment{selectedWorkOrder.client ? ` (${selectedWorkOrder.client})` : ''}</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-xs text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      Internal Equipment
                    </span>
                  )}
                  {selectedWorkOrder.repeatDefect && (
                    <span className="px-2 py-0.5 rounded-xs text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      Repeat Defect
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-[#063452] dark:text-[#F0F7F8] mt-1">
                  Unit: {selectedWorkOrder.unitNumber || 'Unspecified'}
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                <a
                  href={selectedWorkOrder.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-600 dark:text-[#98BAC9] hover:text-[#F37022] rounded-xs hover:bg-white dark:hover:bg-[#07263D]"
                  title="Open row in Google Sheet"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setSelectedWorkOrder(null)}
                  className="p-1.5 text-slate-500 dark:text-[#98BAC9] hover:text-[#063452] dark:hover:text-white rounded-xs hover:bg-white dark:hover:bg-[#07263D]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Matched Fleet Unit Card with Photo */}
              {selectedWorkOrder.matchedEquipment ? (
                <div className="bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#98BAC9]">
                      Equipment Profile
                    </span>
                    <button
                      onClick={() => {
                        setSelectedEquipment(selectedWorkOrder.matchedEquipment!);
                        setSelectedWorkOrder(null);
                        setActiveTab('fleet');
                      }}
                      className="text-xs text-[#F37022] hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Open Equipment Profile & History</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <EquipmentPhoto equipment={selectedWorkOrder.matchedEquipment} variant="thumb" className="w-12 h-12 rounded-xs" />
                    <div>
                      <div className="text-sm font-semibold text-[#063452] dark:text-[#F0F7F8]">
                        {selectedWorkOrder.matchedEquipment.equipmentName}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-slate-600 dark:text-[#98BAC9] mt-1">
                        <div>Station: <strong className="text-[#063452] dark:text-[#F0F7F8]">{selectedWorkOrder.matchedEquipment.station || '-'}</strong></div>
                        <div>Status: <strong className="text-[#063452] dark:text-[#F0F7F8]">{selectedWorkOrder.matchedEquipment.currentStatus}</strong></div>
                        <div>Model: <strong className="text-[#063452] dark:text-[#F0F7F8]">{selectedWorkOrder.matchedEquipment.model || '-'}</strong></div>
                        <div>Serial: <strong className="text-[#063452] dark:text-[#F0F7F8] font-mono">{selectedWorkOrder.matchedEquipment.serialNumber || '-'}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md p-3 text-slate-600 dark:text-[#98BAC9] text-[11px]">
                  Unit <code>{selectedWorkOrder.unitNumber}</code> not matched in GSE Masterlist.
                </div>
              )}

              {/* Defect & Repair Diagnosis */}
              <div className="space-y-2.5">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-[#98BAC9]">
                  Diagnosis & Task Details
                </h3>

                <div className="border border-slate-200 dark:border-[#163854] rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs php-spec-table">
                    <tbody>
                      <tr>
                        <th className="py-2.5 px-3 align-middle w-1/3">
                          Defect
                        </th>
                        <td className="py-2.5 px-3 align-middle font-medium text-[#063452] dark:text-[#F0F7F8]">
                          {selectedWorkOrder.defect || '-'}
                        </td>
                      </tr>
                      <tr>
                        <th className="py-2.5 px-3 align-middle">
                          Description / Task
                        </th>
                        <td className="py-2.5 px-3 align-middle text-[#063452] dark:text-[#F0F7F8]">
                          {selectedWorkOrder.description || '-'}
                        </td>
                      </tr>
                      <tr>
                        <th className="py-2.5 px-3 align-middle">
                          Action Taken
                        </th>
                        <td className="py-2.5 px-3 align-middle text-[#063452] dark:text-[#F0F7F8]">
                          {selectedWorkOrder.actionTaken || '-'}
                        </td>
                      </tr>
                      <tr>
                        <th className="py-2.5 px-3 align-middle">
                          Recommendation
                        </th>
                        <td className="py-2.5 px-3 align-middle text-[#063452] dark:text-[#F0F7F8]">
                          {selectedWorkOrder.recommendation || '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Timeline & Variance Metrics */}
              <div className="space-y-2.5">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-[#98BAC9]">
                  Schedule & Execution Metrics
                </h3>
                <div className="border border-slate-200 dark:border-[#163854] rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs php-spec-table">
                    <tbody>
                      <tr>
                        <th className="py-2 px-3 align-middle w-1/4">
                          Date Issued
                        </th>
                        <td className="py-2 px-3 align-middle font-mono tabular-nums text-[#063452] dark:text-[#F0F7F8] w-1/4">
                          {selectedWorkOrder.dateIssued || '-'}
                        </td>
                        <th className="py-2 px-3 align-middle w-1/4">
                          Target Date
                        </th>
                        <td className="py-2 px-3 align-middle font-mono tabular-nums text-[#063452] dark:text-[#F0F7F8] w-1/4">
                          {selectedWorkOrder.targetDate || '-'}
                        </td>
                      </tr>
                      <tr>
                        <th className="py-2 px-3 align-middle">
                          Service Start
                        </th>
                        <td className="py-2 px-3 align-middle font-mono tabular-nums text-[#063452] dark:text-[#F0F7F8]">
                          {selectedWorkOrder.serviceStart || '-'}
                        </td>
                        <th className="py-2 px-3 align-middle">
                          Completion
                        </th>
                        <td className="py-2 px-3 align-middle font-mono tabular-nums text-[#063452] dark:text-[#F0F7F8]">
                          {selectedWorkOrder.completionDate || '-'}
                        </td>
                      </tr>
                      <tr>
                        <th className="py-2 px-3 align-middle">
                          Variance
                        </th>
                        <td className="py-2 px-3 align-middle text-[#063452] dark:text-[#F0F7F8]">
                          {selectedWorkOrder.scheduleVariance || '-'}
                        </td>
                        <th className="py-2 px-3 align-middle">
                          Total Downtime
                        </th>
                        <td className="py-2 px-3 align-middle font-mono tabular-nums font-bold text-[#063452] dark:text-[#F0F7F8]">
                          {selectedWorkOrder.downtimeDays !== null ? `${selectedWorkOrder.downtimeDays} days` : '-'}
                        </td>
                      </tr>
                      <tr>
                        <th className="py-2 px-3 align-middle">
                          Actual Hours (AMH)
                        </th>
                        <td className="py-2 px-3 align-middle font-mono tabular-nums font-bold text-[#063452] dark:text-[#F0F7F8]">
                          {selectedWorkOrder.amh !== null ? `${selectedWorkOrder.amh} hrs` : '-'}
                        </td>
                        <th className="py-2 px-3 align-middle">
                          Est. Hours (EMH)
                        </th>
                        <td className="py-2 px-3 align-middle font-mono tabular-nums text-[#063452] dark:text-[#F0F7F8]">
                          {selectedWorkOrder.emh !== null ? `${selectedWorkOrder.emh} hrs` : '-'}
                        </td>
                      </tr>
                      <tr>
                        <th className="py-2 px-3 align-middle">
                          Client / Ownership
                        </th>
                        <td className="py-2 px-3 align-middle font-semibold text-[#063452] dark:text-[#F0F7F8]">
                          {isClientEquipmentWorkOrder(selectedWorkOrder.client)
                            ? `Client Equipment (${selectedWorkOrder.client || 'External'})`
                            : 'Internal (PHP Repair Hub)'}
                        </td>
                        <th className="py-2 px-3 align-middle">
                          Mechanic
                        </th>
                        <td className="py-2 px-3 align-middle font-semibold text-[#063452] dark:text-[#F0F7F8]">
                          {selectedWorkOrder.assignedMechanic || '-'}
                        </td>
                      </tr>
                      <tr>
                        <th className="py-2 px-3 align-middle">
                          Maint. Type
                        </th>
                        <td className="py-2 px-3 align-middle text-[#063452] dark:text-[#F0F7F8]">
                          {selectedWorkOrder.typeOfMaintenance || '-'}
                        </td>
                        <th className="py-2 px-3 align-middle">
                          Release Status
                        </th>
                        <td className="py-2 px-3 align-middle text-[#063452] dark:text-[#F0F7F8]">
                          {selectedWorkOrder.releaseStatus || '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-[#163854] bg-slate-50 dark:bg-[#041B2D] flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500 dark:text-[#98BAC9]">
                Row #{selectedWorkOrder.rowNumber}
              </span>
              <a
                href={selectedWorkOrder.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 bg-[#063452] hover:bg-[#09476e] dark:bg-[#F37022] dark:hover:bg-[#d95f16] text-white text-xs font-semibold rounded-md flex items-center gap-1.5"
              >
                <span>Open in Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
