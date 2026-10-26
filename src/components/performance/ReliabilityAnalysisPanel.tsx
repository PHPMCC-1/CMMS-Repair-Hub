import React, { useState, useMemo } from 'react';
import {
  GSEEquipment,
  WorkOrderRecord,
  isClosedWorkOrderStatus,
  isCancelledWorkOrderStatus,
  isOngoingWorkOrderStatus,
  isNotStartedWorkOrderStatus,
} from '../../types/unifiedSheets';
import { calculateReliabilityAnalysis } from '../../utils/kpiCalculator';
import { getEquipmentStatusBannerStyle } from '../fleet/EquipmentProfileModal';
import {
  Gauge,
  Clock,
  Activity,
  ShieldAlert,
  Calendar,
  X,
  Wrench,
  Search,
  Layers,
} from 'lucide-react';

interface ReliabilityAnalysisPanelProps {
  workOrders: WorkOrderRecord[];
  equipment?: GSEEquipment[];
  onSelectWorkOrder?: (wo: WorkOrderRecord) => void;
  onSelectEquipment?: (eq: GSEEquipment) => void;
  isSignedOut?: boolean;
  compactMode?: boolean;
}

export const ReliabilityAnalysisPanel: React.FC<ReliabilityAnalysisPanelProps> = ({
  workOrders,
  equipment = [],
  onSelectWorkOrder,
  onSelectEquipment,
  isSignedOut = false,
  compactMode = false,
}) => {
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('ALL');
  const [selectedUnitKey, setSelectedUnitKey] = useState<string>('ALL');
  const [unitSearch, setUnitSearch] = useState<string>('');
  const [onlyUnitsWithBreakdowns, setOnlyUnitsWithBreakdowns] = useState<boolean>(false);

  const [drilldownTitle, setDrilldownTitle] = useState<string | null>(null);
  const [drilldownFailures, setDrilldownFailures] = useState<WorkOrderRecord[]>([]);

  // Full reliability across all months & all units (for selectors and baseline)
  const fullReliability = useMemo(
    () => calculateReliabilityAnalysis(workOrders, 'ALL', equipment, 'ALL'),
    [workOrders, equipment]
  );

  // Active reliability scoped by selectedMonthKey and selectedUnitKey
  const activeReliability = useMemo(
    () => calculateReliabilityAnalysis(workOrders, selectedMonthKey, equipment, selectedUnitKey),
    [workOrders, selectedMonthKey, equipment, selectedUnitKey]
  );

  // Per-unit table rows scoped by selectedMonthKey (so the per-unit table always shows all units or searched units)
  const monthScopedAllUnitsReliability = useMemo(
    () => calculateReliabilityAnalysis(workOrders, selectedMonthKey, equipment, 'ALL'),
    [workOrders, selectedMonthKey, equipment]
  );

  const filteredUnitRows = useMemo(() => {
    return monthScopedAllUnitsReliability.unitRows.filter((row) => {
      if (onlyUnitsWithBreakdowns && row.breakdownFailures === 0) return false;
      if (unitSearch.trim()) {
        const q = unitSearch.toLowerCase();
        const match =
          row.unitNumber.toLowerCase().includes(q) ||
          row.equipmentName.toLowerCase().includes(q) ||
          row.station.toLowerCase().includes(q) ||
          row.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [monthScopedAllUnitsReliability.unitRows, onlyUnitsWithBreakdowns, unitSearch]);

  const getStatusBadgeClass = (status: string) => {
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
    <div className="space-y-4 @md:space-y-5">
      {/* 1. Overall Average / Selected Unit Summary Cards + Controls */}
      <div className="bg-white dark:bg-[#07263D] rounded-lg p-4 @md:p-5 border border-slate-200 dark:border-[#163854] shadow-2xs space-y-4 @md:space-y-5">
        <div className="flex flex-col @lg:flex-row @lg:items-center justify-between gap-3.5 @lg:gap-4 border-b border-slate-200 dark:border-[#163854] pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[#F37022] shrink-0" />
              <h2 className="text-sm @md:text-base font-semibold text-[#063452] dark:text-[#F0F7F8] tracking-tight truncate">
                {selectedUnitKey === 'ALL'
                  ? 'Per-Unit MTBF & MTTR — Overall Fleet Average'
                  : `Unit ${selectedUnitKey} — MTBF & MTTR Reliability`}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#98BAC9] mt-0.5">
              {selectedUnitKey === 'ALL'
                ? `Calculated per individual GSE unit and averaged across ${monthScopedAllUnitsReliability.totalUnitsAnalyzed} units (${monthScopedAllUnitsReliability.unitsWithBreakdowns} with breakdown events)`
                : 'Individual unit operating window, breakdown frequency, MTBF, and MTTR'}
            </p>
          </div>

          {/* Unit & Month Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Unit Selector Dropdown */}
            <div className="flex items-center justify-between @sm:justify-start gap-2 bg-slate-50 dark:bg-[#041B2D] px-3 py-1.5 rounded-md border border-slate-200 dark:border-[#163854] text-xs w-full @sm:w-auto">
              <span className="text-slate-500 dark:text-[#98BAC9] font-medium shrink-0">Unit:</span>
              <select
                value={selectedUnitKey}
                onChange={(e) => setSelectedUnitKey(e.target.value)}
                className="bg-transparent font-semibold text-[#063452] dark:text-[#F0F7F8] focus:outline-none cursor-pointer truncate max-w-[240px] @md:max-w-[300px]"
              >
                <option value="ALL" className="bg-white dark:bg-[#07263D]">
                  All Units — Overall Average ({fullReliability.unitRows.length})
                </option>
                {fullReliability.unitRows.map((u) => (
                  <option
                    key={u.normalizedUnitNumber}
                    value={u.normalizedUnitNumber}
                    className="bg-white dark:bg-[#07263D]"
                  >
                    {u.unitNumber} — {u.equipmentName} ({u.breakdownFailures} failures)
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selector Dropdown */}
            {fullReliability.monthlyRows.length > 0 && (
              <div className="flex items-center justify-between @sm:justify-start gap-2 bg-slate-50 dark:bg-[#041B2D] px-3 py-1.5 rounded-md border border-slate-200 dark:border-[#163854] text-xs w-full @sm:w-auto">
                <span className="text-slate-500 dark:text-[#98BAC9] font-medium shrink-0">Month:</span>
                <select
                  value={selectedMonthKey}
                  onChange={(e) => setSelectedMonthKey(e.target.value)}
                  className="bg-transparent font-semibold text-[#063452] dark:text-[#F0F7F8] focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-white dark:bg-[#07263D]">
                    All Months ({fullReliability.monthlyRows.length})
                  </option>
                  {fullReliability.monthlyRows.map((row) => (
                    <option
                      key={row.monthKey}
                      value={row.monthKey}
                      className="bg-white dark:bg-[#07263D]"
                    >
                      {row.monthLabel}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 4 Clean Business Reliability Metric Cards (Container-responsive across Mobile, Tablet, Desktop) */}
        <div className="grid grid-cols-1 @xs:grid-cols-2 @lg:grid-cols-4 gap-3 @md:gap-4">
          {/* Card 1: Per-Unit MTBF */}
          <div className="rounded-md p-3.5 @md:p-4 bg-slate-50/70 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-[#98BAC9]">
                {selectedUnitKey === 'ALL' ? 'Avg Per-Unit MTBF' : 'Unit MTBF'}
              </span>
              <Gauge className="w-4 h-4 text-[#063452] dark:text-sky-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2">
              {activeReliability.monthlyMTBFDays !== null ? (
                <>
                  <span className="text-xl @md:text-2xl font-bold text-[#063452] dark:text-white font-mono tabular-nums">
                    {activeReliability.monthlyMTBFDays.toFixed(1)}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-[#98BAC9]">
                    Days ({Math.round(activeReliability.monthlyMTBFHours || 0)}h)
                  </span>
                </>
              ) : (
                <span className="text-sm font-medium text-slate-400 dark:text-[#98BAC9]/50">
                  {isSignedOut ? 'Unavailable' : '-'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#98BAC9]">
              Mean operating time between breakdowns per individual GSE unit.
            </p>
          </div>

          {/* Card 2: Per-Unit MTTR */}
          <div className="rounded-md p-3.5 @md:p-4 bg-slate-50/70 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-[#98BAC9]">
                {selectedUnitKey === 'ALL' ? 'Avg Per-Unit MTTR' : 'Unit MTTR'}
              </span>
              <Clock className="w-4 h-4 text-[#F37022] shrink-0" />
            </div>
            <div className="flex items-baseline gap-2">
              {activeReliability.monthlyMTTRHours !== null ? (
                <>
                  <span className="text-xl @md:text-2xl font-bold text-[#063452] dark:text-white font-mono tabular-nums">
                    {Math.round(activeReliability.monthlyMTTRHours)}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-[#98BAC9]">
                    Hours / rep ({activeReliability.monthlyMTTRDays?.toFixed(1)}d)
                  </span>
                </>
              ) : (
                <span className="text-sm font-medium text-slate-400 dark:text-[#98BAC9]/50">
                  {isSignedOut ? 'Unavailable' : '0h (No Failures)'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#98BAC9]">
              Mean repair turnaround time per unit breakdown event.
            </p>
          </div>

          {/* Card 3: Per-Unit Availability */}
          <div className="rounded-md p-3.5 @md:p-4 bg-slate-50/70 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-[#98BAC9]">
                {selectedUnitKey === 'ALL' ? 'Avg Unit Availability' : 'Unit Availability'}
              </span>
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2">
              {activeReliability.monthlyAvailabilityPct !== null ? (
                <span className="text-xl @md:text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                  {activeReliability.monthlyAvailabilityPct}%
                </span>
              ) : (
                <span className="text-sm font-medium text-slate-400 dark:text-[#98BAC9]/50">
                  {isSignedOut ? 'Unavailable' : '-'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#98BAC9]">
              Average unit uptime vs breakdown downtime across scheduled hours.
            </p>
          </div>

          {/* Card 4: Breakdown Downtime */}
          <div className="rounded-md p-3.5 @md:p-4 bg-slate-50/70 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-[#98BAC9]">
                Breakdown Failures & Downtime
              </span>
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2">
              {activeReliability.totalBreakdownWOs !== null ? (
                <>
                  <span className="text-xl @md:text-2xl font-bold text-[#063452] dark:text-white font-mono tabular-nums">
                    {activeReliability.totalBreakdownWOs}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-[#98BAC9]">
                    WOs ({activeReliability.totalDowntimeDays?.toFixed(1)}d / {Math.round(activeReliability.totalDowntimeHours || 0)}h)
                  </span>
                </>
              ) : (
                <span className="text-sm font-medium text-slate-400 dark:text-[#98BAC9]/50">
                  {isSignedOut ? 'Unavailable' : '-'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#98BAC9]">
              {selectedUnitKey === 'ALL'
                ? `${activeReliability.unitsWithBreakdowns} of ${activeReliability.totalUnitsAnalyzed} units logged breakdown WOs.`
                : 'Total breakdown work orders and downtime for this unit.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Per-Unit MTBF & MTTR Breakdown Table (with Overall Fleet Average Row) */}
      {!compactMode && (
        <div className="bg-white dark:bg-[#07263D] rounded-lg p-4 @md:p-5 border border-slate-200 dark:border-[#163854] shadow-2xs space-y-4">
          <div className="flex flex-col @md:flex-row @md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#F37022] shrink-0" />
                <h3 className="text-sm @md:text-base font-semibold text-[#063452] dark:text-[#F0F7F8]">
                  Per-Unit MTBF & MTTR Breakdown ({filteredUnitRows.length} Units)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#98BAC9] mt-0.5">
                Individual unit reliability metrics and overall average across all units. Click any unit row to inspect its profile or filter monthly trend.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="relative flex-1 @sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="Search unit #, name, station..."
                  className="w-full @sm:w-56 pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] placeholder-slate-400 focus:outline-none focus:border-[#F37022]"
                />
              </div>

              <button
                onClick={() => setOnlyUnitsWithBreakdowns(!onlyUnitsWithBreakdowns)}
                className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors whitespace-nowrap ${
                  onlyUnitsWithBreakdowns
                    ? 'bg-[#063452] dark:bg-[#F37022] text-white border-[#063452] dark:border-[#F37022]'
                    : 'bg-slate-50 dark:bg-[#041B2D] text-slate-600 dark:text-[#98BAC9] border-slate-200 dark:border-[#163854] hover:border-[#063452]'
                }`}
              >
                Units with Failures Only ({monthScopedAllUnitsReliability.unitsWithBreakdowns})
              </button>
            </div>
          </div>

          {filteredUnitRows.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-[#163854]">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead>
                  <tr>
                    <th className="py-2.5 px-3">Unit #</th>
                    <th className="py-2.5 px-3">Equipment Name</th>
                    <th className="py-2.5 px-3">Station</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Tracked WOs</th>
                    <th className="py-2.5 px-3 text-right">Failures</th>
                    <th className="py-2.5 px-3 text-right">Closed</th>
                    <th className="py-2.5 px-3 text-right">Downtime</th>
                    <th className="py-2.5 px-3 text-right">AMH</th>
                    <th className="py-2.5 px-3 text-right bg-slate-200/60 dark:bg-[#0B3554]/50 text-[#063452] dark:text-sky-300">
                      Unit MTBF
                    </th>
                    <th className="py-2.5 px-3 text-right bg-slate-200/60 dark:bg-[#0B3554]/50 text-[#063452] dark:text-amber-300">
                      Unit MTTR
                    </th>
                    <th className="py-2.5 px-3 text-right">Availability</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnitRows.map((u) => {
                    const isSelectedUnit = selectedUnitKey === u.normalizedUnitNumber;
                    const stStyle = getEquipmentStatusBannerStyle(u.currentStatus);

                    return (
                      <tr
                        key={u.normalizedUnitNumber}
                        onClick={() =>
                          setSelectedUnitKey(
                            isSelectedUnit ? 'ALL' : u.normalizedUnitNumber
                          )
                        }
                        className={`transition-colors cursor-pointer ${
                          isSelectedUnit
                            ? '!bg-sky-50/90 dark:!bg-[#0B3554]/60'
                            : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 align-middle font-mono font-bold text-[#063452] dark:text-white whitespace-nowrap">
                          {u.unitNumber}
                        </td>
                        <td className="py-2.5 px-3 align-middle font-semibold text-[#063452] dark:text-[#F0F7F8] max-w-[200px] truncate">
                          {u.equipmentName}
                        </td>
                        <td className="py-2.5 px-3 align-middle font-mono text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                          {u.station}
                        </td>
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold inline-flex items-center gap-1.5 ${stStyle.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stStyle.dotClass}`} />
                            <span>{stStyle.label}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums font-semibold text-[#063452] dark:text-[#F0F7F8]">
                          {u.trackedWOs}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums font-semibold">
                          {u.breakdownFailures > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">
                              {u.breakdownFailures}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                          {u.repairsClosed}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                          {u.totalDowntimeDays > 0 ? (
                            <>
                              <span className="font-semibold">{u.totalDowntimeDays.toFixed(1)}d</span>{' '}
                              <span className="text-slate-400 text-[11px]">({Math.round(u.totalDowntimeHours)}h)</span>
                            </>
                          ) : (
                            <span className="text-slate-400">0d</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                          {u.totalAmhHours > 0 ? `${u.totalAmhHours.toFixed(1)}h` : '-'}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums bg-slate-50/90 dark:bg-[#0B3554]/25 text-[#063452] dark:text-sky-300 whitespace-nowrap">
                          {u.mtbfDays !== null ? (
                            <>
                              <strong>{u.mtbfDays.toFixed(1)}d</strong>{' '}
                              <span className="text-[11px] opacity-75">({Math.round(u.mtbfHours || 0)}h)</span>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums bg-slate-50/90 dark:bg-[#0B3554]/25 text-[#063452] dark:text-amber-300 whitespace-nowrap">
                          {u.mttrHours !== null ? (
                            <>
                              <strong>{Math.round(u.mttrHours)}h</strong>{' '}
                              <span className="text-[11px] opacity-75">({(u.mttrDays || 0).toFixed(1)}d)</span>
                            </>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No Failures</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                          {u.availabilityPct}%
                        </td>
                        <td className="py-2.5 px-3 align-middle text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            {u.failureWorkOrders.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDrilldownTitle(`${u.unitNumber} (${u.equipmentName})`);
                                  setDrilldownFailures(u.failureWorkOrders);
                                }}
                                className="px-2 py-1 rounded-xs bg-slate-100 dark:bg-[#041B2D] hover:bg-[#F37022] hover:text-white text-[#063452] dark:text-[#F0F7F8] border border-slate-200 dark:border-[#163854] font-semibold text-[11px] transition-colors"
                              >
                                WOs ({u.failureWorkOrders.length})
                              </button>
                            )}
                            {u.equipment && onSelectEquipment && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectEquipment(u.equipment!);
                                }}
                                className="px-2 py-1 rounded-xs bg-[#063452] hover:bg-[#09476e] text-white font-semibold text-[11px] transition-colors"
                              >
                                Profile
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Overall Average Across All Units Summary Footer Row */}
                <tfoot className="bg-[#063452] dark:bg-[#041B2D] text-white font-mono tabular-nums text-xs border-t-2 border-[#063452] dark:border-[#F37022]">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 align-middle font-sans font-bold text-white uppercase tracking-wide text-[11px]">
                      OVERALL AVERAGE ACROSS ALL UNITS ({monthScopedAllUnitsReliability.totalUnitsAnalyzed} Units)
                    </td>
                    <td className="py-3 px-3 align-middle text-right font-bold">
                      {monthScopedAllUnitsReliability.unitRows.reduce((a, r) => a + r.trackedWOs, 0)}
                    </td>
                    <td className="py-3 px-3 align-middle text-right font-bold text-rose-300">
                      {monthScopedAllUnitsReliability.totalBreakdownWOs ?? 0}
                    </td>
                    <td className="py-3 px-3 align-middle text-right font-bold text-emerald-300">
                      {monthScopedAllUnitsReliability.unitRows.reduce((a, r) => a + r.repairsClosed, 0)}
                    </td>
                    <td className="py-3 px-3 align-middle text-right font-bold whitespace-nowrap">
                      {(monthScopedAllUnitsReliability.totalDowntimeDays ?? 0).toFixed(1)}d ({Math.round(monthScopedAllUnitsReliability.totalDowntimeHours ?? 0)}h)
                    </td>
                    <td className="py-3 px-3 align-middle text-right font-bold whitespace-nowrap">
                      {monthScopedAllUnitsReliability.unitRows.reduce((a, r) => a + r.totalAmhHours, 0).toFixed(1)}h
                    </td>
                    <td className="py-3 px-3 align-middle text-right font-bold text-sky-300 whitespace-nowrap">
                      {monthScopedAllUnitsReliability.monthlyMTBFDays !== null
                        ? `${monthScopedAllUnitsReliability.monthlyMTBFDays.toFixed(1)}d (${Math.round(monthScopedAllUnitsReliability.monthlyMTBFHours || 0)}h)`
                        : '-'}
                    </td>
                    <td className="py-3 px-3 align-middle text-right font-bold text-amber-300 whitespace-nowrap">
                      {monthScopedAllUnitsReliability.monthlyMTTRHours !== null
                        ? `${Math.round(monthScopedAllUnitsReliability.monthlyMTTRHours)}h (${(monthScopedAllUnitsReliability.monthlyMTTRDays || 0).toFixed(1)}d)`
                        : '-'}
                    </td>
                    <td className="py-3 px-3 align-middle text-right font-bold text-emerald-300">
                      {monthScopedAllUnitsReliability.monthlyAvailabilityPct !== null
                        ? `${monthScopedAllUnitsReliability.monthlyAvailabilityPct}%`
                        : '-'}
                    </td>
                    <td className="py-3 px-3 align-middle text-center font-sans text-[11px] font-semibold text-slate-300">
                      Fleet Avg
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-[#98BAC9]/60">
              {isSignedOut
                ? 'Sign in with Google to load per-unit MTBF & MTTR analysis.'
                : 'No units match the current filter.'}
            </div>
          )}
        </div>
      )}

      {/* 3. Month-By-Month Per-Unit Reliability Cross-Tabulation Table */}
      <div className="bg-white dark:bg-[#07263D] rounded-lg p-4 @md:p-5 border border-slate-200 dark:border-[#163854] shadow-2xs space-y-4">
        <div className="flex flex-col @sm:flex-row @sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#F37022] shrink-0" />
              <h3 className="text-sm @md:text-base font-semibold text-[#063452] dark:text-[#F0F7F8]">
                Month-By-Month Per-Unit Reliability Cross-Tabulation
                {selectedUnitKey !== 'ALL' && ` — Unit ${selectedUnitKey}`}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#98BAC9] mt-0.5">
              Monthly operating window per unit, breakdown frequency, average unit MTBF, average unit MTTR, and availability percentage.
            </p>
          </div>

          {selectedUnitKey !== 'ALL' && (
            <button
              onClick={() => setSelectedUnitKey('ALL')}
              className="text-xs font-semibold text-[#F37022] hover:underline self-start @sm:self-auto"
            >
              Show All Units Average
            </button>
          )}
        </div>

        {activeReliability.monthlyRows.length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-[#163854]">
            <table className="w-full min-w-[940px] text-left text-xs">
              <thead>
                <tr>
                  <th className="py-2.5 px-3.5">Operating Month</th>
                  <th className="py-2.5 px-3.5 text-right">Units Tracked</th>
                  <th className="py-2.5 px-3.5 text-right">Tracked WOs</th>
                  <th className="py-2.5 px-3.5 text-right">Breakdown Failures</th>
                  <th className="py-2.5 px-3.5 text-right">Repairs Closed</th>
                  <th className="py-2.5 px-3.5 text-right">Total Downtime</th>
                  <th className="py-2.5 px-3.5 text-right">Unit Window</th>
                  <th className="py-2.5 px-3.5 text-right bg-slate-200/60 dark:bg-[#0B3554]/50 text-[#063452] dark:text-sky-300">
                    Per-Unit MTBF
                  </th>
                  <th className="py-2.5 px-3.5 text-right bg-slate-200/60 dark:bg-[#0B3554]/50 text-[#063452] dark:text-amber-300">
                    Per-Unit MTTR
                  </th>
                  <th className="py-2.5 px-3.5 text-right">Unit Availability</th>
                  <th className="py-2.5 px-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeReliability.monthlyRows.map((row) => (
                  <tr
                    key={row.monthKey}
                    className="transition-colors"
                  >
                    <td className="py-2.5 px-3.5 align-middle font-semibold text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                      {row.monthLabel}
                    </td>
                    <td className="py-2.5 px-3.5 align-middle text-right font-mono tabular-nums text-slate-600 dark:text-[#98BAC9]">
                      {row.activeUnitsCount}
                    </td>
                    <td className="py-2.5 px-3.5 align-middle text-right font-mono tabular-nums font-semibold text-[#063452] dark:text-[#F0F7F8]">
                      {row.trackedWOs}
                    </td>
                    <td className="py-2.5 px-3.5 align-middle text-right font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                      {row.breakdownFailures}
                    </td>
                    <td className="py-2.5 px-3.5 align-middle text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                      {row.repairsClosed}
                    </td>
                    <td className="py-2.5 px-3.5 align-middle text-right font-mono tabular-nums text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                      <strong>{row.totalDowntimeDays.toFixed(1)}d</strong>{' '}
                      <span className="text-slate-400 dark:text-[#98BAC9] text-[11px]">
                        ({Math.round(row.totalDowntimeHours)}h)
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 align-middle text-right font-mono tabular-nums text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                      {row.operatingWindowHoursPerUnit}h / unit
                    </td>
                    <td className="py-2.5 px-3.5 align-middle text-right font-mono tabular-nums bg-slate-50/90 dark:bg-[#0B3554]/25 text-[#063452] dark:text-sky-300 whitespace-nowrap">
                      <strong>{row.mtbfDays.toFixed(1)}d</strong>{' '}
                      <span className="text-[11px] opacity-75">({Math.round(row.mtbfHours)}h)</span>
                    </td>
                    <td className="py-2.5 px-3.5 align-middle text-right font-mono tabular-nums bg-slate-50/90 dark:bg-[#0B3554]/25 text-[#063452] dark:text-amber-300 whitespace-nowrap">
                      <strong>{Math.round(row.mttrHours)}h</strong>{' '}
                      <span className="text-[11px] opacity-75">({row.mttrDays.toFixed(1)}d)</span>
                    </td>
                    <td className="py-2.5 px-3.5 align-middle text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                      {row.availabilityPct}%
                    </td>
                    <td className="py-2.5 px-3.5 align-middle text-center">
                      <button
                        onClick={() => {
                          setDrilldownTitle(row.monthLabel);
                          setDrilldownFailures(row.failureWorkOrders);
                        }}
                        className="px-2.5 py-1 rounded-xs bg-slate-100 dark:bg-[#041B2D] hover:bg-[#063452] hover:text-white dark:hover:bg-[#F37022] text-[#063452] dark:text-[#F0F7F8] border border-slate-200 dark:border-[#163854] font-semibold text-[11px] transition-colors whitespace-nowrap"
                      >
                        View Failures
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-[#98BAC9]/60">
            {isSignedOut
              ? 'Sign in with Google to load monthly per-unit MTBF & MTTR cross-tabulation.'
              : 'No monthly work order records available.'}
          </div>
        )}
      </div>

      {/* View Failures Modal */}
      {drilldownTitle && (
        <div className="fixed inset-0 z-50 bg-[#041B2D]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#07263D] border border-slate-300 dark:border-[#163854] rounded-lg max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-[#063452] dark:bg-[#041B2D] text-white flex items-center justify-between border-b border-[#163854]">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#F37022]" />
                <h3 className="text-sm font-semibold">
                  {drilldownTitle} — Breakdown & Repair Work Orders ({drilldownFailures.length})
                </h3>
              </div>
              <button
                onClick={() => setDrilldownTitle(null)}
                className="p-1.5 rounded-xs text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 @md:p-5">
              <div className="border border-slate-200 dark:border-[#163854] rounded-md overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead>
                    <tr>
                      <th className="py-2.5 px-3">WO #</th>
                      <th className="py-2.5 px-3">Date Issued</th>
                      <th className="py-2.5 px-3">Unit #</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Defect / Repair Task</th>
                      <th className="py-2.5 px-3">Mechanic</th>
                      <th className="py-2.5 px-3 text-right">Downtime</th>
                      <th className="py-2.5 px-3 text-right">AMH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownFailures.map((wo) => (
                      <tr
                        key={wo.workOrderNumber}
                        onClick={() => {
                          setDrilldownTitle(null);
                          onSelectWorkOrder?.(wo);
                        }}
                        className="cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 align-middle font-mono font-bold text-[#F37022] whitespace-nowrap">
                          {wo.workOrderNumber}
                        </td>
                        <td className="py-2.5 px-3 align-middle font-mono text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                          {wo.dateIssued || '-'}
                        </td>
                        <td className="py-2.5 px-3 align-middle font-mono font-semibold text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                          {wo.unitNumber || '-'}
                        </td>
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold inline-block ${getStatusBadgeClass(wo.status)}`}>
                            {wo.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 align-middle font-medium text-[#063452] dark:text-[#F0F7F8] max-w-xs truncate">
                          {wo.defect || wo.description || '-'}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                          {wo.assignedMechanic || '-'}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                          {wo.downtimeDays !== null ? `${wo.downtimeDays}d` : '-'}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums font-semibold text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                          {wo.amh !== null ? `${wo.amh}h` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
