import { IngestionResult } from './unifiedSheetsService';
import { normalizeUnitId, GSEEquipment } from '../types/unifiedSheets';

const SNAPSHOT_STORAGE_KEY = 'php_repairhub_sheets_snapshot_v1';

/**
 * Persist the latest synced Google Sheets dataset locally so that
 * fixed source sheets remain readable across page reloads and after
 * the 60-minute OAuth access token expires.
 */
export function saveSheetsSnapshot(result: IngestionResult): void {
  if (typeof window === 'undefined') return;
  try {
    // Only persist if we actually received rows from at least one workbook
    const hasData =
      result.equipment.length > 0 ||
      result.inventory.length > 0 ||
      result.transactions.length > 0 ||
      result.transmittals.length > 0 ||
      result.workOrders.length > 0;

    if (!hasData) return;

    const payload: IngestionResult = {
      equipment: result.equipment,
      inventory: result.inventory,
      transactions: result.transactions,
      transmittals: result.transmittals,
      workOrders: result.workOrders,
      statuses: result.statuses,
      overallStatus: result.overallStatus,
      errorMessage: result.errorMessage,
      syncedAt: result.syncedAt,
    };

    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota or private-browsing exceptions silently
  }
}

/**
 * Load the persisted Google Sheets dataset snapshot from localStorage
 * and re-link workOrder.matchedEquipment references.
 */
export function loadSheetsSnapshot(): IngestionResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as IngestionResult;
    if (!parsed || !Array.isArray(parsed.equipment) || !Array.isArray(parsed.workOrders)) {
      return null;
    }

    // Re-build equipment lookup map to ensure matchedEquipment references are intact
    const equipmentMap = new Map<string, GSEEquipment>();
    for (const eq of parsed.equipment) {
      const normId = normalizeUnitId(eq.equipmentNumber);
      if (normId) {
        equipmentMap.set(normId, eq);
      }
    }

    const hydratedWorkOrders = parsed.workOrders.map((wo) => {
      const normUnit = normalizeUnitId(wo.unitNumber);
      const matched = normUnit ? equipmentMap.get(normUnit) || wo.matchedEquipment : wo.matchedEquipment;
      return {
        ...wo,
        matchedEquipment: matched,
      };
    });

    return {
      ...parsed,
      workOrders: hydratedWorkOrders,
    };
  } catch {
    return null;
  }
}

/**
 * Clear the locally persisted Google Sheets snapshot (called on explicit Sign Out)
 */
export function clearSheetsSnapshot(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SNAPSHOT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
