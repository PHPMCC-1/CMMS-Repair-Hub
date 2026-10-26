import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { normalizeUnitId, isOpenWorkOrderStatus } from '../../types/unifiedSheets';
import { EquipmentPhoto } from './EquipmentPhoto';
import { GSEUnitOverviewBoard } from './GSEUnitOverviewBoard';
import { EquipmentProfileModal, getEquipmentStatusBannerStyle } from './EquipmentProfileModal';
import {
  Search,
  ExternalLink,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  Gauge,
} from 'lucide-react';

export const FleetView: React.FC = () => {
  const {
    equipment,
    filteredEquipment,
    selectedEquipment,
    setSelectedEquipment,
    setSelectedWorkOrder,
    setActiveTab,
    workOrders,
    stationFilter,
    setStationFilter,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    resetAllFilters,
    workbookUrls,
    syncStatus,
    isUsingCachedData,
    signInGoogle,
  } = useApp();

  const [viewMode, setViewMode] = useState<'overview' | 'table'>('overview');

  const availableStations = Array.from(new Set(equipment.map(e => e.station).filter(Boolean))).sort();
  const availableStatuses = Array.from(new Set(equipment.map(e => e.currentStatus).filter(Boolean))).sort();
  const availableCategories = Array.from(new Set(equipment.map(e => e.category).filter(Boolean))).sort();

  return (
    <div className="p-3 @md:p-6 max-w-7xl mx-auto space-y-4 @md:space-y-5 text-[#063452] dark:text-[#F0F7F8]">
      {/* Executive Page Header */}
      <div className="flex flex-col @sm:flex-row @sm:items-center justify-between gap-3 bg-white dark:bg-[#07263D] px-4 @md:px-5 py-3.5 @md:py-4 rounded-lg border border-slate-200 dark:border-[#163854] shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-md bg-[#063452] text-[#F37022] flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base @md:text-xl font-bold text-[#063452] dark:text-[#F0F7F8] tracking-tight">
                Ground Support Equipment Fleet
              </h1>
              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-[#98BAC9]">
                ({filteredEquipment.length} units)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#98BAC9] truncate">
              Select any unit to inspect its specifications, per-unit MTBF/MTTR, and maintenance work order history.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start @sm:self-auto">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#041B2D] px-3 py-1.5 rounded-md border border-slate-200 dark:border-[#163854] text-xs">
            <span className="text-slate-500 dark:text-[#98BAC9] font-medium">Display:</span>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'overview' | 'table')}
              className="bg-transparent font-semibold text-[#063452] dark:text-[#F0F7F8] focus:outline-none cursor-pointer"
            >
              <option value="overview" className="bg-white dark:bg-[#07263D]">
                Unit Overview Cards
              </option>
              <option value="table" className="bg-white dark:bg-[#07263D]">
                Masterlist Grid Table
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Expired Token Alert Banner (only if no local snapshot is available) */}
      {syncStatus === 'token_expired' && !isUsingCachedData && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-lg p-3.5 flex flex-col @sm:flex-row @sm:items-center justify-between gap-3 text-amber-950 dark:text-amber-100 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>Google Sheets access expired — connect Google to load fleet units and work orders.</span>
          </div>
          <button
            onClick={signInGoogle}
            className="px-3.5 py-1.5 bg-[#F37022] hover:bg-[#d95f16] text-white text-xs font-semibold rounded-md transition-colors whitespace-nowrap self-start @sm:self-auto"
          >
            Reconnect Google
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-[#07263D] p-3.5 @md:p-4 rounded-lg border border-slate-200 dark:border-[#163854] shadow-2xs space-y-3">
        <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Eq. No, Name, Serial..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] placeholder-slate-400 focus:outline-none focus:border-[#F37022]"
            />
          </div>

          {/* Station Filter */}
          <div>
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
            >
              <option value="ALL">All Stations ({availableStations.length})</option>
              {availableStations.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
            >
              <option value="ALL">All Statuses ({availableStatuses.length})</option>
              {availableStatuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
            >
              <option value="ALL">All Categories ({availableCategories.length})</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {(searchQuery || stationFilter !== 'ALL' || statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#163854] text-xs">
            <span className="text-slate-500 dark:text-[#98BAC9]">
              Showing {filteredEquipment.length} of {equipment.length} units
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

      {/* Main Content Area */}
      {syncStatus === 'signed_out' ? (
        <div className="bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-lg p-10 text-center space-y-3">
          <Layers className="w-8 h-8 text-[#F37022] mx-auto" />
          <h3 className="text-sm font-semibold text-[#063452] dark:text-[#F0F7F8]">Sign In to Load GSE Units</h3>
          <button
            onClick={signInGoogle}
            className="px-4 py-2 bg-[#063452] dark:bg-[#F37022] text-white text-xs font-semibold rounded-md"
          >
            Sign in with Google
          </button>
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-lg p-10 text-center">
          <p className="text-xs font-semibold text-slate-500 dark:text-[#98BAC9]">No equipment found matching criteria</p>
        </div>
      ) : viewMode === 'overview' ? (
        <GSEUnitOverviewBoard
          equipment={filteredEquipment}
          onSelectEquipment={(eq) => setSelectedEquipment(eq)}
          title="Ground Support Equipment — Unit Overview"
        />
      ) : (
        /* Structured Enterprise Masterlist Grid Table */
        <div className="bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead>
                <tr>
                  <th className="py-2.5 px-3 text-center w-14">Photo</th>
                  <th className="py-2.5 px-3">Equipment No.</th>
                  <th className="py-2.5 px-3">Equipment Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Make & Model</th>
                  <th className="py-2.5 px-3">Serial #</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Station</th>
                  <th className="py-2.5 px-3 text-right">Work Orders</th>
                  <th className="py-2.5 px-3 text-right">Profile</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipment.map((eq) => {
                  const normalizedNo = normalizeUnitId(eq.equipmentNumber);
                  const matchedWOs = workOrders.filter(w => w.normalizedUnitNumber === normalizedNo);
                  const openWOs = matchedWOs.filter(w => isOpenWorkOrderStatus(w.status));
                  const statusBanner = getEquipmentStatusBannerStyle(eq.currentStatus);

                  return (
                    <tr
                      key={eq.equipmentNumber}
                      onClick={() => setSelectedEquipment(eq)}
                      className="transition-colors cursor-pointer group"
                    >
                      <td className="py-2 px-3 align-middle">
                        <div className="flex items-center justify-center">
                          <EquipmentPhoto equipment={eq} variant="thumb" />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 align-middle font-mono font-bold text-[#063452] dark:text-[#F0F7F8] group-hover:text-[#F37022] whitespace-nowrap">
                        {eq.equipmentNumber}
                      </td>
                      <td className="py-2.5 px-3 align-middle font-semibold text-[#063452] dark:text-[#F0F7F8]">
                        {eq.equipmentName}
                      </td>
                      <td className="py-2.5 px-3 align-middle text-slate-600 dark:text-[#98BAC9]">
                        {eq.category || '-'}
                      </td>
                      <td className="py-2.5 px-3 align-middle text-slate-600 dark:text-[#98BAC9]">
                        {[eq.manufacturer, eq.model].filter(Boolean).join(' ') || '-'}
                      </td>
                      <td className="py-2.5 px-3 align-middle font-mono text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                        {eq.serialNumber || '-'}
                      </td>
                      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold inline-flex items-center gap-1.5 ${statusBanner.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusBanner.dotClass}`} />
                          <span>{statusBanner.label}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 align-middle font-mono font-medium text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                        {eq.station || '-'}
                      </td>
                      <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums whitespace-nowrap">
                        {matchedWOs.length > 0 ? (
                          <span className="font-semibold text-[#063452] dark:text-[#F0F7F8]">
                            {matchedWOs.length}
                            {openWOs.length > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 ml-1">
                                ({openWOs.length} open)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap">
                        <span className="text-[#F37022] font-semibold inline-flex items-center justify-end gap-0.5">
                          <span>Profile</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
