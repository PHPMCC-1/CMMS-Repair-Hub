import {
  GSEEquipment,
  MaterialInventoryItem,
  TransmittalRecord,
  WorkOrderRecord,
  DashboardKPIs,
  MonthlyReliabilityRow,
  UnitReliabilityRow,
  ReliabilitySummary,
  normalizeUnitId,
  isCancelledWorkOrderStatus,
  isClosedWorkOrderStatus,
  isOngoingWorkOrderStatus,
  isNotStartedWorkOrderStatus,
  isOpenWorkOrderStatus,
} from '../types/unifiedSheets';

export interface DateFilterRange {
  preset: 'all' | 'last7' | 'last30' | 'thisMonth' | 'custom';
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Robust date parser supporting MM/DD/YYYY, YYYY-MM-DD, ISO, etc.
 */
export function parseDateFlexible(val: any): Date | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'n/a') return null;

  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) return d;
  }

  const parts = str.split(/[\/\-.]/);
  if (parts.length === 3) {
    let p0 = parseInt(parts[0], 10);
    let p1 = parseInt(parts[1], 10);
    let p2 = parseInt(parts[2], 10);

    if (p2 < 100) p2 += 2000;

    if (p0 >= 1 && p0 <= 12 && p1 >= 1 && p1 <= 31 && p2 >= 1990) {
      const d = new Date(p2, p0 - 1, p1);
      if (!isNaN(d.getTime())) return d;
    }

    if (p0 >= 1990 && p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 31) {
      const d = new Date(p0, p1 - 1, p2);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

/**
 * Filter work orders by date issued according to chosen period
 */
export function isDateInPeriod(dateStr: string, range: DateFilterRange): boolean {
  if (range.preset === 'all') return true;
  const d = parseDateFlexible(dateStr);
  if (!d) return false;

  const now = new Date();
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const targetTime = startOfDay(d).getTime();

  if (range.preset === 'last7') {
    const sevenDaysAgo = startOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).getTime();
    return targetTime >= sevenDaysAgo && targetTime <= now.getTime();
  }

  if (range.preset === 'last30') {
    const thirtyDaysAgo = startOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)).getTime();
    return targetTime >= thirtyDaysAgo && targetTime <= now.getTime();
  }

  if (range.preset === 'thisMonth') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return targetTime >= firstDay && targetTime <= now.getTime();
  }

  if (range.preset === 'custom' && range.startDate && range.endDate) {
    const start = parseDateFlexible(range.startDate);
    const end = parseDateFlexible(range.endDate);
    if (!start || !end) return true;
    return targetTime >= startOfDay(start).getTime() && targetTime <= startOfDay(end).getTime();
  }

  return true;
}

/**
 * Determines if a work order represents a breakdown / corrective maintenance failure
 * (Excludes cancelled work orders and purely scheduled preventive PMS checks)
 */
export function isBreakdownWorkOrder(wo: WorkOrderRecord): boolean {
  if (isCancelledWorkOrderStatus(wo.status)) return false;
  const maintType = (wo.typeOfMaintenance || '').trim().toUpperCase();
  if (
    maintType.includes('PMS') ||
    maintType.includes('PREVENTIVE') ||
    maintType.includes('ROUTINE') ||
    maintType.includes('INSPECTION ONLY')
  ) {
    return false;
  }
  return true;
}

function getWorkOrderMonthKey(wo: WorkOrderRecord): {
  key: string;
  year: number;
  monthIdx: number;
  day: number;
} | null {
  const d =
    parseDateFlexible(wo.dateIssued) ||
    parseDateFlexible(wo.serviceStart) ||
    parseDateFlexible(wo.completionDate);
  if (!d) return null;
  const year = d.getFullYear();
  const monthIdx = d.getMonth();
  const day = d.getDate();
  const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
  return { key, year, monthIdx, day };
}

function extractWorkOrderDowntimeDays(wo: WorkOrderRecord): number {
  if (wo.downtimeDays !== null && !isNaN(wo.downtimeDays) && wo.downtimeDays >= 0) {
    return wo.downtimeDays;
  }
  if (isClosedWorkOrderStatus(wo.status)) {
    const start = parseDateFlexible(wo.serviceStart);
    const end = parseDateFlexible(wo.completionDate);
    if (start && end && end.getTime() >= start.getTime()) {
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    }
  }
  return 0;
}

/**
 * Calculates Per-Unit MTBF & MTTR and Overall Average Across All Units,
 * plus Month-By-Month Per-Unit Reliability Cross-Tabulation.
 */
export function calculateReliabilityAnalysis(
  workOrders: WorkOrderRecord[],
  monthFilter: string = 'ALL',
  equipment: GSEEquipment[] = [],
  unitFilter: string = 'ALL'
): ReliabilitySummary {
  const normalizedUnitFilter = unitFilter !== 'ALL' ? normalizeUnitId(unitFilter) : 'ALL';

  // Filter work orders by unit if a specific unit is selected
  const unitScopedWorkOrders =
    normalizedUnitFilter !== 'ALL'
      ? workOrders.filter(w => w.normalizedUnitNumber === normalizedUnitFilter)
      : workOrders;

  const validNonCancelledWOs = unitScopedWorkOrders.filter(
    w => w.workOrderNumber.trim() !== '' && !isCancelledWorkOrderStatus(w.status)
  );

  // Discover all operating months across the dataset
  const monthBuckets = new Map<
    string,
    {
      year: number;
      monthIdx: number;
      orders: WorkOrderRecord[];
      minDay: number;
      maxDay: number;
      operatingWindowHoursPerUnit: number;
    }
  >();

  // Build month buckets from all valid non-cancelled work orders
  const allDatasetNonCancelled = workOrders.filter(
    w => w.workOrderNumber.trim() !== '' && !isCancelledWorkOrderStatus(w.status)
  );

  allDatasetNonCancelled.forEach(wo => {
    const m = getWorkOrderMonthKey(wo);
    if (!m) return;
    const existing = monthBuckets.get(m.key);
    if (existing) {
      if (normalizedUnitFilter === 'ALL' || wo.normalizedUnitNumber === normalizedUnitFilter) {
        existing.orders.push(wo);
      }
      if (m.day < existing.minDay) existing.minDay = m.day;
      if (m.day > existing.maxDay) existing.maxDay = m.day;
    } else {
      monthBuckets.set(m.key, {
        year: m.year,
        monthIdx: m.monthIdx,
        orders:
          normalizedUnitFilter === 'ALL' || wo.normalizedUnitNumber === normalizedUnitFilter
            ? [wo]
            : [],
        minDay: m.day,
        maxDay: m.day,
        operatingWindowHoursPerUnit: 720,
      });
    }
  });

  const sortedMonthKeys = Array.from(monthBuckets.keys()).sort();
  sortedMonthKeys.forEach((key, idx) => {
    const bucket = monthBuckets.get(key)!;
    const daysInCalendarMonth = new Date(bucket.year, bucket.monthIdx + 1, 0).getDate();
    const spanDays = bucket.maxDay - bucket.minDay + 1;
    const operatingDays =
      idx === 0 && bucket.minDay > 15 && spanDays < 15
        ? Math.max(5, spanDays)
        : daysInCalendarMonth;
    bucket.operatingWindowHoursPerUnit = operatingDays * 24;
  });

  // Determine active month keys based on monthFilter
  const activeMonthKeys =
    monthFilter && monthFilter !== 'ALL'
      ? sortedMonthKeys.filter(k => {
          const b = monthBuckets.get(k)!;
          return (
            k === monthFilter ||
            SHORT_MONTH_NAMES[b.monthIdx].toUpperCase() === monthFilter.toUpperCase()
          );
        })
      : sortedMonthKeys;

  const effectiveMonthKeys = activeMonthKeys.length > 0 ? activeMonthKeys : sortedMonthKeys;

  // Total per-unit operating window hours in the selected month(s)
  const singleMonthWindowHours =
    effectiveMonthKeys.length > 0
      ? effectiveMonthKeys.reduce(
          (acc, k) => acc + (monthBuckets.get(k)?.operatingWindowHoursPerUnit || 720),
          0
        ) / effectiveMonthKeys.length
      : 720;

  const totalPeriodWindowHoursPerUnit =
    effectiveMonthKeys.length > 0
      ? effectiveMonthKeys.reduce(
          (acc, k) => acc + (monthBuckets.get(k)?.operatingWindowHoursPerUnit || 720),
          0
        )
      : 720;

  // Build map of all units (from Fleet Masterlist + any units in Work Orders)
  const unitMap = new Map<
    string,
    {
      unitNumber: string;
      normalizedUnitNumber: string;
      equipment?: GSEEquipment;
      allOrders: WorkOrderRecord[];
    }
  >();

  equipment.forEach(eq => {
    const norm = normalizeUnitId(eq.equipmentNumber);
    if (!norm) return;
    if (normalizedUnitFilter !== 'ALL' && norm !== normalizedUnitFilter) return;
    unitMap.set(norm, {
      unitNumber: eq.equipmentNumber,
      normalizedUnitNumber: norm,
      equipment: eq,
      allOrders: [],
    });
  });

  workOrders.forEach(wo => {
    if (!wo.workOrderNumber.trim()) return;
    const norm = wo.normalizedUnitNumber || normalizeUnitId(wo.unitNumber);
    if (!norm) return;
    if (normalizedUnitFilter !== 'ALL' && norm !== normalizedUnitFilter) return;

    // Check if work order falls in monthFilter when monthFilter !== 'ALL'
    if (monthFilter && monthFilter !== 'ALL') {
      const m = getWorkOrderMonthKey(wo);
      if (!m || !effectiveMonthKeys.includes(m.key)) return;
    }

    const existing = unitMap.get(norm);
    if (existing) {
      existing.allOrders.push(wo);
      if (!existing.equipment && wo.matchedEquipment) {
        existing.equipment = wo.matchedEquipment;
      }
    } else {
      unitMap.set(norm, {
        unitNumber: wo.unitNumber || norm,
        normalizedUnitNumber: norm,
        equipment: wo.matchedEquipment,
        allOrders: [wo],
      });
    }
  });

  // Compute Per-Unit Reliability Rows
  const unitRows: UnitReliabilityRow[] = [];
  const activeMonthsCount = Math.max(1, effectiveMonthKeys.length);

  unitMap.forEach(entry => {
    const { unitNumber, normalizedUnitNumber, equipment: eq, allOrders } = entry;

    let trackedWOs = 0;
    let ongoingWOs = 0;
    let notStartedWOs = 0;
    let openWOs = 0;
    let cancelledWOs = 0;
    let repairsClosed = 0;

    const nonCancelledOrders: WorkOrderRecord[] = [];

    allOrders.forEach(wo => {
      if (isCancelledWorkOrderStatus(wo.status)) {
        cancelledWOs++;
      } else {
        trackedWOs++;
        nonCancelledOrders.push(wo);
        if (isClosedWorkOrderStatus(wo.status)) {
          // handled below for breakdown repairs too
        } else {
          if (isOpenWorkOrderStatus(wo.status)) openWOs++;
          if (isOngoingWorkOrderStatus(wo.status)) ongoingWOs++;
          else if (isNotStartedWorkOrderStatus(wo.status)) notStartedWOs++;
        }
      }
    });

    const breakdownList = nonCancelledOrders.filter(isBreakdownWorkOrder);
    const failureWorkOrders = breakdownList.length > 0 ? breakdownList : nonCancelledOrders;
    const breakdownFailures = failureWorkOrders.length;

    repairsClosed = failureWorkOrders.filter(w => isClosedWorkOrderStatus(w.status)).length;

    let totalDowntimeDays = 0;
    let totalAmhHours = 0;

    failureWorkOrders.forEach(wo => {
      totalDowntimeDays += extractWorkOrderDowntimeDays(wo);
      if (wo.amh !== null && !isNaN(wo.amh) && wo.amh > 0) {
        totalAmhHours += wo.amh;
      }
    });

    const totalDowntimeHours = totalDowntimeDays * 24;
    const operatingWindowHours = totalPeriodWindowHoursPerUnit;

    // Per-Unit Uptime in the period
    const unitUptimeHours = Math.max(0, operatingWindowHours - totalDowntimeHours);

    // Per-Unit Availability %
    const availabilityPct =
      operatingWindowHours > 0
        ? Math.round(Math.max(0, Math.min(100, (unitUptimeHours / operatingWindowHours) * 100)))
        : 100;

    // Per-Unit Monthly MTBF:
    // If unit had breakdowns, MTBF = unitUptimeHours / breakdownFailures (capped to monthly operating window if 0 failures)
    const mtbfHours =
      breakdownFailures > 0
        ? Math.max(6, unitUptimeHours / breakdownFailures)
        : singleMonthWindowHours;
    const mtbfDays = mtbfHours / 24;

    // Per-Unit MTTR:
    // Calculated per repair for this unit
    let mttrHours: number | null = null;
    let mttrDays: number | null = null;
    if (breakdownFailures > 0) {
      const repairDivisor = repairsClosed > 0 ? repairsClosed : breakdownFailures;
      if (totalDowntimeHours > 0) {
        mttrHours = totalDowntimeHours / repairDivisor;
      } else if (totalAmhHours > 0) {
        mttrHours = totalAmhHours / repairDivisor;
      } else {
        mttrHours = 0;
      }
      mttrDays = mttrHours / 24;
    }

    unitRows.push({
      unitNumber,
      normalizedUnitNumber,
      equipmentName: eq?.equipmentName || 'Unspecified Unit',
      category: eq?.category || '-',
      station: eq?.station || '-',
      currentStatus: eq?.currentStatus || 'Unknown',
      equipment: eq,
      trackedWOs,
      breakdownFailures,
      repairsClosed,
      ongoingWOs,
      notStartedWOs,
      openWOs,
      cancelledWOs,
      totalDowntimeDays,
      totalDowntimeHours,
      totalAmhHours,
      operatingWindowHours,
      operatingMonthsCount: activeMonthsCount,
      mtbfDays,
      mtbfHours,
      mttrHours,
      mttrDays,
      availabilityPct,
      unitWorkOrders: allOrders,
      failureWorkOrders,
    });
  });

  // Sort unitRows: units with breakdowns/work orders first (by breakdown count desc, then unitNumber asc)
  unitRows.sort((a, b) => {
    if (b.breakdownFailures !== a.breakdownFailures) {
      return b.breakdownFailures - a.breakdownFailures;
    }
    if (b.trackedWOs !== a.trackedWOs) {
      return b.trackedWOs - a.trackedWOs;
    }
    return a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true });
  });

  // Compute Month-By-Month Cross-Tabulation on a PER-UNIT basis
  const monthlyRows: MonthlyReliabilityRow[] = [];
  const fleetUnitCount = Math.max(1, unitRows.length);

  sortedMonthKeys.forEach(key => {
    const bucket = monthBuckets.get(key)!;
    const { year, monthIdx, orders, operatingWindowHoursPerUnit } = bucket;

    if (normalizedUnitFilter !== 'ALL' && orders.length === 0) {
      // Still include month row with 0 failures if a single unit is being inspected
    }

    const trackedWOs = orders.length;
    const breakdownList = orders.filter(isBreakdownWorkOrder);
    const failureWorkOrders = breakdownList.length > 0 ? breakdownList : orders;
    const breakdownFailures = failureWorkOrders.length;
    const repairsClosed = failureWorkOrders.filter(w => isClosedWorkOrderStatus(w.status)).length;

    let totalDowntimeDays = 0;
    let totalAmhHours = 0;
    failureWorkOrders.forEach(wo => {
      totalDowntimeDays += extractWorkOrderDowntimeDays(wo);
      if (wo.amh !== null && !isNaN(wo.amh) && wo.amh > 0) {
        totalAmhHours += wo.amh;
      }
    });
    const totalDowntimeHours = totalDowntimeDays * 24;

    // Distinct units with breakdowns in this month
    const distinctUnitsInMonth = new Set(
      failureWorkOrders.map(w => w.normalizedUnitNumber).filter(Boolean)
    );
    const activeUnitsCount =
      normalizedUnitFilter !== 'ALL'
        ? 1
        : Math.max(1, distinctUnitsInMonth.size || fleetUnitCount);

    // Per-Unit MTBF in this month:
    // Average operating uptime per active unit divided by average failures per active unit
    const totalActiveUnitsWindowHours = operatingWindowHoursPerUnit * activeUnitsCount;
    const totalActiveUnitsUptimeHours = Math.max(
      12 * activeUnitsCount,
      totalActiveUnitsWindowHours - totalDowntimeHours
    );

    const mtbfHours =
      breakdownFailures > 0
        ? Math.min(
            operatingWindowHoursPerUnit,
            Math.max(12, totalActiveUnitsUptimeHours / breakdownFailures)
          )
        : operatingWindowHoursPerUnit;
    const mtbfDays = mtbfHours / 24;

    // Per-Unit / Per-Repair MTTR in this month
    let mttrHours = 0;
    if (breakdownFailures > 0) {
      const repairDivisor = repairsClosed > 0 ? repairsClosed : breakdownFailures;
      if (totalDowntimeHours > 0) {
        mttrHours = totalDowntimeHours / repairDivisor;
      } else if (totalAmhHours > 0) {
        mttrHours = totalAmhHours / repairDivisor;
      }
    }
    const mttrDays = mttrHours / 24;

    // Average Per-Unit Availability % in this month
    const avgDowntimePerUnitHours = totalDowntimeHours / activeUnitsCount;
    const availabilityPct =
      operatingWindowHoursPerUnit > 0
        ? Math.round(
            Math.max(
              0,
              Math.min(
                100,
                ((operatingWindowHoursPerUnit - avgDowntimePerUnitHours) /
                  operatingWindowHoursPerUnit) *
                  100
              )
            )
          )
        : 100;

    monthlyRows.push({
      monthKey: key,
      monthLabel: `${MONTH_NAMES[monthIdx]} ${year}`,
      shortMonthLabel: SHORT_MONTH_NAMES[monthIdx],
      activeUnitsCount,
      trackedWOs,
      breakdownFailures,
      repairsClosed,
      totalDowntimeDays,
      totalDowntimeHours,
      operatingWindowHoursPerUnit,
      mtbfDays,
      mtbfHours,
      mttrHours,
      mttrDays,
      availabilityPct,
      failureWorkOrders,
    });
  });

  if (validNonCancelledWOs.length === 0 && unitRows.length === 0) {
    return {
      monthlyMTBFDays: null,
      monthlyMTBFHours: null,
      monthlyMTTRHours: null,
      monthlyMTTRDays: null,
      monthlyAvailabilityPct: null,
      totalBreakdownWOs: null,
      totalDowntimeDays: null,
      totalDowntimeHours: null,
      totalUnitsAnalyzed: 0,
      unitsWithBreakdowns: 0,
      unitRows: [],
      monthlyRows: [],
    };
  }

  // Overall Average Across Units
  const unitsWithBreakdownsList = unitRows.filter(u => u.breakdownFailures > 0);
  const unitsForAverage =
    normalizedUnitFilter !== 'ALL'
      ? unitRows
      : unitsWithBreakdownsList.length > 0
      ? unitRows
      : unitRows;

  // Overall Per-Unit MTBF Average:
  // Average across units with tracked activity (or all units if selected)
  const activeEvaluationUnits =
    unitsWithBreakdownsList.length > 0 ? unitsWithBreakdownsList : unitsForAverage;

  const avgUnitMTBFHours =
    activeEvaluationUnits.length > 0
      ? activeEvaluationUnits.reduce((acc, u) => acc + (u.mtbfHours ?? singleMonthWindowHours), 0) /
        activeEvaluationUnits.length
      : null;
  const avgUnitMTBFDays = avgUnitMTBFHours !== null ? avgUnitMTBFHours / 24 : null;

  // Overall Per-Unit MTTR Average (across units that experienced breakdown repairs)
  const unitsWithValidMTTR = unitRows.filter(u => u.mttrHours !== null && u.mttrHours > 0);
  const avgUnitMTTRHours =
    unitsWithValidMTTR.length > 0
      ? unitsWithValidMTTR.reduce((acc, u) => acc + (u.mttrHours || 0), 0) /
        unitsWithValidMTTR.length
      : unitsWithBreakdownsList.length > 0
      ? 0
      : null;
  const avgUnitMTTRDays = avgUnitMTTRHours !== null ? avgUnitMTTRHours / 24 : null;

  // Overall Per-Unit Availability % Average
  const avgUnitAvailabilityPct =
    activeEvaluationUnits.length > 0
      ? Math.round(
          activeEvaluationUnits.reduce((acc, u) => acc + u.availabilityPct, 0) /
            activeEvaluationUnits.length
        )
      : null;

  const totalBreakdownWOs = unitRows.reduce((acc, u) => acc + u.breakdownFailures, 0);
  const totalDowntimeDays = unitRows.reduce((acc, u) => acc + u.totalDowntimeDays, 0);
  const totalDowntimeHours = unitRows.reduce((acc, u) => acc + u.totalDowntimeHours, 0);

  return {
    monthlyMTBFDays: avgUnitMTBFDays,
    monthlyMTBFHours: avgUnitMTBFHours,
    monthlyMTTRHours: avgUnitMTTRHours,
    monthlyMTTRDays: avgUnitMTTRDays,
    monthlyAvailabilityPct: avgUnitAvailabilityPct,
    totalBreakdownWOs,
    totalDowntimeDays,
    totalDowntimeHours,
    totalUnitsAnalyzed: unitRows.length,
    unitsWithBreakdowns: unitsWithBreakdownsList.length,
    unitRows,
    monthlyRows,
  };
}

/**
 * Calculates Dashboard KPIs
 * - Cancelled work orders are excluded from Open work orders and counted separately as Cancelled.
 * - On-going and Not Started work orders are counted distinctly.
 */
export function calculateDashboardKPIs(
  equipment: GSEEquipment[],
  inventory: MaterialInventoryItem[],
  workOrders: WorkOrderRecord[],
  transmittals: TransmittalRecord[],
  dateRange: DateFilterRange = { preset: 'all' }
): DashboardKPIs {
  // 1. Fleet KPIs
  const validEquipment = equipment.filter(e => e.equipmentNumber.trim() !== '');
  const fleetTotal = validEquipment.length > 0 ? validEquipment.length : (equipment.length > 0 ? 0 : null);

  const fleetByStatus: Record<string, number> = {};
  validEquipment.forEach(eq => {
    const status = eq.currentStatus.trim() || 'Unknown';
    fleetByStatus[status] = (fleetByStatus[status] || 0) + 1;
  });

  // 2. Inventory KPIs
  const validInventory = inventory.filter(i => i.itemCode.trim() !== '');
  const inventoryTotal = validInventory.length > 0 ? validInventory.length : (inventory.length > 0 ? 0 : null);

  let lowStockCount = 0;
  let reorderCount = 0;
  let outOfStockCount = 0;
  const inventoryByStatus: Record<string, number> = {};

  validInventory.forEach(item => {
    const rawStatus = (item.stockStatus || '').trim().toUpperCase();
    const cleanKey = item.stockStatus.trim() || 'Unspecified';
    inventoryByStatus[cleanKey] = (inventoryByStatus[cleanKey] || 0) + 1;

    if (rawStatus.includes('OUT') || rawStatus === 'OUT OF STOCK') {
      outOfStockCount++;
    } else if (rawStatus.includes('LOW')) {
      lowStockCount++;
    } else if (rawStatus.includes('REORDER') || (item.recommendedReorder && item.recommendedReorder > 0)) {
      reorderCount++;
    }
  });

  // 3. Work Orders in chosen period
  const validWorkOrders = workOrders.filter(w => w.workOrderNumber.trim() !== '');
  const periodWorkOrders = validWorkOrders.filter(w => isDateInPeriod(w.dateIssued, dateRange));

  const totalPeriodOrders = periodWorkOrders.length;
  const workOrdersIssuedInPeriod = validWorkOrders.length > 0 ? totalPeriodOrders : (workOrders.length > 0 ? 0 : null);

  let openCount = 0;
  let ongoingCount = 0;
  let notStartedCount = 0;
  let cancelledCount = 0;
  let closedCount = 0;
  let amhSum = 0;
  let hasValidAmh = false;
  let repeatDefects = 0;

  let completedWithVarianceCount = 0;
  let completedOnTimeCount = 0;

  let totalDaysElapsed = 0;
  let validClosedDaysCount = 0;

  periodWorkOrders.forEach(wo => {
    const status = wo.status || '';
    const isClosed = isClosedWorkOrderStatus(status);
    const isCancelled = isCancelledWorkOrderStatus(status);
    const isOngoing = isOngoingWorkOrderStatus(status);
    const isNotStarted = isNotStartedWorkOrderStatus(status);

    if (isClosed) {
      closedCount++;
    } else if (isCancelled) {
      cancelledCount++;
    } else {
      if (isOpenWorkOrderStatus(status)) {
        openCount++;
      }
      if (isOngoing) {
        ongoingCount++;
      } else if (isNotStarted) {
        notStartedCount++;
      }
    }

    if (wo.repeatDefect) {
      repeatDefects++;
    }

    if (wo.amh !== null && !isNaN(wo.amh)) {
      amhSum += wo.amh;
      hasValidAmh = true;
    }

    if (isClosed) {
      const variance = (wo.scheduleVariance || '').trim();
      if (variance !== '') {
        completedWithVarianceCount++;
        if (variance.toLowerCase() === 'on time') {
          completedOnTimeCount++;
        }
      }

      const start = parseDateFlexible(wo.serviceStart);
      const end = parseDateFlexible(wo.completionDate);
      if (start && end && end.getTime() >= start.getTime()) {
        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        totalDaysElapsed += diffDays;
        validClosedDaysCount++;
      }
    }
  });

  let completionRate: number | null = null;
  const nonCancelledTotal = totalPeriodOrders - cancelledCount;
  if (nonCancelledTotal > 0) {
    completionRate = closedCount / nonCancelledTotal;
  } else if (totalPeriodOrders > 0) {
    completionRate = closedCount / totalPeriodOrders;
  }

  let onTimeRate: number | null = null;
  if (completedWithVarianceCount > 0) {
    onTimeRate = completedOnTimeCount / completedWithVarianceCount;
  }

  let meanDaysToCompletion: number | null = null;
  if (validClosedDaysCount > 0) {
    meanDaysToCompletion = totalDaysElapsed / validClosedDaysCount;
  }

  // Calculate Per-Unit & Overall Fleet Average MTBF & MTTR Reliability
  const reliability = calculateDashboardReliability(validEquipment, periodWorkOrders);

  // 4. Receiving counts by CATERGORY
  const validTransmittals = transmittals.filter(t => t.transmittalNumber.trim() !== '');
  const transmittalsTotal = validTransmittals.length > 0 ? validTransmittals.length : (transmittals.length > 0 ? 0 : null);

  const receivingByCatergory: Record<string, number> = {};
  validTransmittals.forEach(tr => {
    const cat = tr.catergory.trim() || 'Unknown';
    receivingByCatergory[cat] = (receivingByCatergory[cat] || 0) + 1;
  });

  const hasWOs = validWorkOrders.length > 0;

  return {
    fleetTotal,
    fleetByStatus,
    inventoryTotal,
    inventoryLowStock: validInventory.length > 0 ? lowStockCount : null,
    inventoryReorder: validInventory.length > 0 ? reorderCount : null,
    inventoryOutOfStock: validInventory.length > 0 ? outOfStockCount : null,
    inventoryByStatus,
    workOrdersIssuedInPeriod,
    openWorkOrders: hasWOs ? openCount : null,
    ongoingWorkOrders: hasWOs ? ongoingCount : null,
    notStartedWorkOrders: hasWOs ? notStartedCount : null,
    cancelledWorkOrders: hasWOs ? cancelledCount : null,
    closedWorkOrders: hasWOs ? closedCount : null,
    completionRate,
    totalAMH: hasValidAmh ? amhSum : null,
    onTimeRate,
    repeatDefectCount: hasWOs ? repeatDefects : null,
    meanDaysToCompletion,
    reliability,
    transmittalsTotal,
    receivingByCatergory,
  };
}

function calculateDashboardReliability(
  equipment: GSEEquipment[],
  workOrders: WorkOrderRecord[]
): ReliabilitySummary {
  return calculateReliabilityAnalysis(workOrders, 'ALL', equipment, 'ALL');
}
