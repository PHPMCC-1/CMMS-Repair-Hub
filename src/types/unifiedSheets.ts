/**
 * Unified types for the 3 authoritative Google Sheets workbooks:
 * 1. GSE Workbook (Masterlist, Overview)
 * 2. Materials Workbook (INVENTORY, MATERIALS TRANSACTIONS, TRANSMITTALS AND RECEIVING)
 * 3. Performance Workbook (MONITORING)
 */

export interface EquipmentPhotoItem {
  label: string; // e.g., 'Unit Photo', 'AMA Plate', 'Data Plate'
  category: 'unit' | 'ama_plate' | 'data_plate' | 'date_plate' | 'other';
  displayUrl: string;
  linkUrl: string;
  sourceNote?: string;
}

export interface GSEEquipment {
  equipmentNumber: string; // [key]
  equipmentName: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  assetNumber: string;
  currentStatus: string;
  condition: string;
  station: string;
  assignedDepartment: string;
  currentLocation: string;
  assignedMechanic: string;
  amaExpirationDate: string;
  amaPlateUrl?: string;
  amaPlateLink?: string;
  amaPlateText?: string;
  dataPlateUrl?: string;
  dataPlateLink?: string;
  dataPlateText?: string;
  datePlateUrl?: string;
  datePlateLink?: string;
  datePlateText?: string;
  mainPhotoLink: string;
  mainPhotoUrl: string;
  photoUrls?: string[];
  labeledPhotos?: EquipmentPhotoItem[];
  remarks: string;
  rowNumber: number;
  sheetUrl: string;
}

export interface MaterialInventoryItem {
  itemCode: string; // [key]
  item: string;
  materialType: string;
  category: string;
  uom: string;
  partNumber: string;
  make: string;
  specification: string;
  min: number | null;
  max: number | null;
  totalInbound: number | null;
  totalOutbound: number | null;
  stockOnHand: number | null;
  stockStatus: string;
  recommendedReorder: number | null;
  rowNumber: number;
  sheetUrl: string;
}

export interface MaterialTransaction {
  transactionNumber: string; // [key]
  date: string;
  transactionType: string;
  itemCode: string;
  item: string;
  qty: number | null;
  uom: string;
  provider: string;
  remarks: string;
  supportingDocs: string;
  rowNumber: number;
  sheetUrl: string;
}

export interface TransmittalRecord {
  transmittalNumber: string; // [key]
  catergory: string; // Preserved source typo "CATERGORY"
  client: string;
  projectName: string;
  itemsTransmitted: string;
  dateOfSubmission: string;
  transmittedBy: string;
  receivedBy: string;
  files: string;
  attachment: string;
  remarks: string;
  rowNumber: number;
  sheetUrl: string;
}

export interface WorkOrderRecord {
  workOrderNumber: string; // [key]
  dateIssued: string;
  unitNumber: string; // raw source UNIT #
  normalizedUnitNumber: string; // normalized for join
  client: string;
  status: string;
  description: string;
  defect: string;
  recommendation: string;
  actionTaken: string;
  typeOfMaintenance: string;
  releaseStatus: string;
  assignedMechanic: string;
  totalManpower: number | null;
  repeatDefect: boolean;
  repeatDefectRaw: string;
  incident: string;
  emh: number | null;
  amh: number | null;
  serviceStart: string;
  targetDate: string;
  completionDate: string;
  scheduleVariance: string;
  downtimeDays: number | null;
  rowNumber: number;
  sheetUrl: string;
  matchedEquipment?: GSEEquipment;
}

export interface SheetSourceStatus {
  sheetId: string;
  title: string;
  tabNames: string[];
  status: 'idle' | 'loading' | 'success' | 'error';
  rowCount: number;
  errorMessage?: string;
}

export interface UnitReliabilityRow {
  unitNumber: string;
  normalizedUnitNumber: string;
  equipmentName: string;
  category: string;
  station: string;
  currentStatus: string;
  equipment?: GSEEquipment;
  trackedWOs: number;
  breakdownFailures: number;
  repairsClosed: number;
  ongoingWOs: number;
  notStartedWOs: number;
  openWOs: number;
  cancelledWOs: number;
  totalDowntimeDays: number;
  totalDowntimeHours: number;
  totalAmhHours: number;
  operatingWindowHours: number;
  operatingMonthsCount: number;
  mtbfDays: number | null; // per-unit MTBF in days
  mtbfHours: number | null; // per-unit MTBF in hours
  mttrHours: number | null; // per-unit MTTR in hours
  mttrDays: number | null; // per-unit MTTR in days
  availabilityPct: number;
  unitWorkOrders: WorkOrderRecord[];
  failureWorkOrders: WorkOrderRecord[];
}

export interface MonthlyReliabilityRow {
  monthKey: string; // e.g. '2026-05'
  monthLabel: string; // e.g. 'May 2026'
  shortMonthLabel: string; // e.g. 'May'
  activeUnitsCount: number;
  trackedWOs: number;
  breakdownFailures: number;
  repairsClosed: number;
  totalDowntimeDays: number;
  totalDowntimeHours: number;
  operatingWindowHoursPerUnit: number;
  mtbfDays: number; // average per-unit MTBF in this month (days)
  mtbfHours: number; // average per-unit MTBF in this month (hours)
  mttrHours: number; // average per-unit MTTR in this month (hours)
  mttrDays: number; // average per-unit MTTR in this month (days)
  availabilityPct: number; // average unit availability % in this month
  failureWorkOrders: WorkOrderRecord[];
}

export interface ReliabilitySummary {
  // Overall Average across all units
  monthlyMTBFDays: number | null;
  monthlyMTBFHours: number | null;
  monthlyMTTRHours: number | null;
  monthlyMTTRDays: number | null;
  monthlyAvailabilityPct: number | null;
  totalBreakdownWOs: number | null;
  totalDowntimeDays: number | null;
  totalDowntimeHours: number | null;
  totalUnitsAnalyzed: number;
  unitsWithBreakdowns: number;
  unitRows: UnitReliabilityRow[];
  monthlyRows: MonthlyReliabilityRow[];
}

export interface DashboardKPIs {
  // Fleet
  fleetTotal: number | null;
  fleetByStatus: Record<string, number>;

  // Inventory
  inventoryTotal: number | null;
  inventoryLowStock: number | null;
  inventoryReorder: number | null;
  inventoryOutOfStock: number | null;
  inventoryByStatus: Record<string, number>;

  // Performance / Work Orders
  workOrdersIssuedInPeriod: number | null;
  openWorkOrders: number | null;
  ongoingWorkOrders: number | null;
  notStartedWorkOrders: number | null;
  cancelledWorkOrders: number | null;
  closedWorkOrders: number | null;
  completionRate: number | null; // 0..1 or null if unavailable
  totalAMH: number | null;
  onTimeRate: number | null; // 0..1 or null if unavailable
  repeatDefectCount: number | null;
  meanDaysToCompletion: number | null; // days or null

  // Per-Unit & Overall Average MTBF & MTTR Reliability
  reliability: ReliabilitySummary;

  // Receiving / Transmittals
  transmittalsTotal: number | null;
  receivingByCatergory: Record<string, number>;
}

/**
 * Normalization rule: trim, uppercase, collapse spaces
 */
export function normalizeUnitId(val: string | null | undefined): string {
  if (!val) return '';
  return String(val)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

/**
 * Work Order Status Helpers
 * - Cancelled work orders are NOT considered Open work orders; they are tracked as Cancelled.
 * - On-going and Not Started are tracked distinctly.
 */
export function isCancelledWorkOrderStatus(status: string | null | undefined): boolean {
  const s = String(status || '').trim().toUpperCase();
  return s.includes('CANCEL');
}

export function isClosedWorkOrderStatus(status: string | null | undefined): boolean {
  const s = String(status || '').trim().toUpperCase();
  return s === 'CLOSED' || s === 'COMPLETED';
}

export function isOngoingWorkOrderStatus(status: string | null | undefined): boolean {
  const s = String(status || '').trim().toUpperCase();
  return (
    s.includes('ON-GOING') ||
    s.includes('ONGOING') ||
    s.includes('ON GOING') ||
    s.includes('IN PROGRESS') ||
    s.includes('IN-PROGRESS')
  );
}

export function isNotStartedWorkOrderStatus(status: string | null | undefined): boolean {
  const s = String(status || '').trim().toUpperCase();
  return s.includes('NOT STARTED') || s.includes('NOT YET STARTED');
}

export function isOpenWorkOrderStatus(status: string | null | undefined): boolean {
  const s = String(status || '').trim().toUpperCase();
  if (!s || s === 'UNKNOWN') return false;
  return !isClosedWorkOrderStatus(s) && !isCancelledWorkOrderStatus(s);
}

/**
 * Work Order Equipment Ownership Helpers
 * Rule: Any work order NOT marked as "Internal" is considered the Client's Equipment.
 */
export function isInternalWorkOrder(client: string | null | undefined): boolean {
  const c = String(client || '').trim().toUpperCase();
  return c === 'INTERNAL';
}

export function isClientEquipmentWorkOrder(client: string | null | undefined): boolean {
  return !isInternalWorkOrder(client);
}

