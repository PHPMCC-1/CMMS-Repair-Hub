/**
 * Read-Only Service for Google Sheets API v4
 * strictly read-only: no writes, no appending, no creating spreadsheets.
 */

import {
  GSEEquipment,
  EquipmentPhotoItem,
  MaterialInventoryItem,
  MaterialTransaction,
  TransmittalRecord,
  WorkOrderRecord,
  SheetSourceStatus,
  normalizeUnitId,
} from '../types/unifiedSheets';

export const WORKBOOK_IDS = {
  GSE: '1P9oP0CM4HxMzwDemNpTku0tgWIt0ItFqqol6mj2cSdQ',
  MATERIALS: '1owbG5ndHqRYJgmO7TRv3jnoA0UO5cD3BVCclR91Jp1M',
  PERFORMANCE: '1gOh75Ex8J2cEDbnS5dKmpeqTLPjU3oEB-EZylnIhzxg',
} as const;

export const TAB_GIDS = {
  GSE_MASTERLIST: '268558321',
  GSE_OVERVIEW: '1069474470',
  MATERIALS_INVENTORY: '19225061',
  MATERIALS_TRANSACTIONS: '824873906',
  TRANSMITTALS_AND_RECEIVING: '968985708',
  PERFORMANCE_MONITORING: '1033316680',
} as const;

export const WORKBOOK_URLS = {
  GSE: `https://docs.google.com/spreadsheets/d/${WORKBOOK_IDS.GSE}/edit#gid=${TAB_GIDS.GSE_MASTERLIST}`,
  GSE_MASTERLIST: `https://docs.google.com/spreadsheets/d/${WORKBOOK_IDS.GSE}/edit#gid=${TAB_GIDS.GSE_MASTERLIST}`,
  GSE_OVERVIEW: `https://docs.google.com/spreadsheets/d/${WORKBOOK_IDS.GSE}/edit#gid=${TAB_GIDS.GSE_OVERVIEW}`,
  MATERIALS: `https://docs.google.com/spreadsheets/d/${WORKBOOK_IDS.MATERIALS}/edit#gid=${TAB_GIDS.MATERIALS_INVENTORY}`,
  MATERIALS_INVENTORY: `https://docs.google.com/spreadsheets/d/${WORKBOOK_IDS.MATERIALS}/edit#gid=${TAB_GIDS.MATERIALS_INVENTORY}`,
  MATERIALS_TRANSACTIONS: `https://docs.google.com/spreadsheets/d/${WORKBOOK_IDS.MATERIALS}/edit#gid=${TAB_GIDS.MATERIALS_TRANSACTIONS}`,
  TRANSMITTALS_AND_RECEIVING: `https://docs.google.com/spreadsheets/d/${WORKBOOK_IDS.MATERIALS}/edit#gid=${TAB_GIDS.TRANSMITTALS_AND_RECEIVING}`,
  PERFORMANCE: `https://docs.google.com/spreadsheets/d/${WORKBOOK_IDS.PERFORMANCE}/edit#gid=${TAB_GIDS.PERFORMANCE_MONITORING}`,
  PERFORMANCE_MONITORING: `https://docs.google.com/spreadsheets/d/${WORKBOOK_IDS.PERFORMANCE}/edit#gid=${TAB_GIDS.PERFORMANCE_MONITORING}`,
} as const;

export interface IngestionResult {
  equipment: GSEEquipment[];
  inventory: MaterialInventoryItem[];
  transactions: MaterialTransaction[];
  transmittals: TransmittalRecord[];
  workOrders: WorkOrderRecord[];
  statuses: {
    gse: SheetSourceStatus;
    materials: SheetSourceStatus;
    performance: SheetSourceStatus;
  };
  overallStatus: 'success' | 'partial' | 'error';
  errorMessage?: string;
  syncedAt: string;
}

// Helper to normalize header text for comparison
function cleanHeader(str: string | null | undefined): string {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Sanitize spreadsheet formula errors (#N/A, #REF!, #VALUE!, etc.)
export function sanitizeSheetText(val: any): string {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (!str) return '';
  const upper = str.toUpperCase();
  if (
    upper === '#N/A' ||
    upper === '#REF!' ||
    upper === '#VALUE!' ||
    upper === '#NAME?' ||
    upper === '#ERROR!' ||
    upper === '#DIV/0!' ||
    upper === '#NUM!' ||
    upper === 'N/A'
  ) {
    return '';
  }
  return str;
}

// Classify whether a column header or cell label refers to Unit Photo ("Pic for reference"), AMA Plate, or Data Plate
export function classifyPhotoCategoryFromText(
  rawText: string | null | undefined
): { category: 'unit' | 'ama_plate' | 'data_plate'; label: string } | null {
  if (!rawText) return null;
  const trimmed = String(rawText).trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return null;
  const clean = cleanHeader(trimmed);
  if (!clean) return null;

  // 1. Unit picture ("Pic for reference", "Unit Photo", "Equipment Photo", etc.)
  if (
    clean.includes('picforreference') ||
    clean.includes('pictureforreference') ||
    clean.includes('photoforreference') ||
    clean.includes('forreference') ||
    clean.includes('referencepic') ||
    clean.includes('referencephoto') ||
    clean.includes('referenceimage') ||
    clean === 'reference' ||
    clean.includes('unitpic') ||
    clean.includes('unitphoto') ||
    clean.includes('unitimage') ||
    clean.includes('mainphoto') ||
    clean.includes('equipmentphoto') ||
    clean.includes('equipmentpic')
  ) {
    return { category: 'unit', label: 'Unit Photo' };
  }

  // 2. Data Plate (also handle "Date Plate" or "Name Plate" / "Serial Plate")
  if (
    clean.includes('dataplate') ||
    clean.includes('dateplate') ||
    clean.includes('nameplate') ||
    clean.includes('specplate') ||
    clean.includes('serialplate') ||
    (clean.includes('plate') &&
      (clean.includes('data') ||
        clean.includes('date') ||
        clean.includes('name') ||
        clean.includes('spec') ||
        clean.includes('serial') ||
        clean.includes('unit')))
  ) {
    return { category: 'data_plate', label: 'Data Plate' };
  }

  // 3. AMA Plate / Sticker
  if (
    clean.includes('amaplate') ||
    clean.includes('amasticker') ||
    clean.includes('amaphoto') ||
    clean.includes('amapic') ||
    clean.includes('amareg') ||
    (clean.includes('ama') && !clean.includes('expiration') && !clean.includes('expdate'))
  ) {
    return { category: 'ama_plate', label: 'AMA Plate' };
  }

  // 4. Generic photo / picture column
  if (
    clean === 'pic' ||
    clean === 'photo' ||
    clean === 'picture' ||
    clean === 'image' ||
    clean.includes('thumbnail')
  ) {
    return { category: 'unit', label: 'Unit Photo' };
  }

  return null;
}

// Extract optional label from =HYPERLINK("url", "label") formula
function extractHyperlinkLabel(formulaCell?: any, formattedCell?: any): string {
  const rawFormula = formulaCell !== undefined && formulaCell !== null ? String(formulaCell).trim() : '';
  if (rawFormula) {
    const hlMatch = rawFormula.match(/HYPERLINK\s*\(\s*"[^"]+"\s*[,;]\s*"([^"]+)"\s*\)/i);
    if (hlMatch?.[1]) {
      return hlMatch[1].trim();
    }
  }
  const rawFormatted = formattedCell !== undefined && formattedCell !== null ? String(formattedCell).trim() : '';
  if (rawFormatted && !/^https?:\/\//i.test(rawFormatted)) {
    return rawFormatted;
  }
  return '';
}

// Safe number parser
function parseNumber(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  const cleaned = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Extract Google Drive file ID from common Drive URL formats
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Do not treat folder URLs as image file IDs
  if (trimmed.includes('/drive/folders/') || trimmed.includes('/folders/')) {
    return null;
  }
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
  if (fileMatch?.[1]) return fileMatch[1];

  const openMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (openMatch?.[1]) return openMatch[1];

  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (dMatch?.[1]) return dMatch[1];

  return null;
}

// Convert a raw URL or Drive link into a direct renderable image URL + external link
export function normalizePhotoUrl(rawUrl: string): { displayUrl: string; linkUrl: string } | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) return null;

  const driveId = extractGoogleDriveFileId(url);
  if (driveId) {
    return {
      displayUrl: `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`,
      linkUrl: `https://drive.google.com/file/d/${driveId}/view`,
    };
  }

  return {
    displayUrl: url,
    linkUrl: url,
  };
}

// Extract URLs from either a plain text cell or a Google Sheets formula (=IMAGE("..."), =HYPERLINK("..."))
function extractUrlsFromCell(formattedCell: any, formulaCell?: any): string[] {
  const candidates: string[] = [];
  const rawFormula = formulaCell !== undefined && formulaCell !== null ? String(formulaCell).trim() : '';
  const rawFormatted = formattedCell !== undefined && formattedCell !== null ? String(formattedCell).trim() : '';

  for (const source of [rawFormula, rawFormatted]) {
    if (!source) continue;
    // Match URLs inside quotes (e.g. =IMAGE("https://...") or =HYPERLINK("https://...", "Photo")) or standalone URLs
    const matches = source.match(/https?:\/\/[^\s"'<>)]+/gi);
    if (matches) {
      for (const m of matches) {
        const cleanUrl = m.replace(/[",;)+]+$/, '');
        if (cleanUrl && !candidates.includes(cleanUrl)) {
          candidates.push(cleanUrl);
        }
      }
    }
  }
  return candidates;
}

export class SheetsAuthExpiredError extends Error {
  constructor(message = 'Google Sheets access expired') {
    super(message);
    this.name = 'SheetsAuthExpiredError';
  }
}

// Parse RFC-4180 CSV text into a 2D array of cell values
function parseCsvToGrid(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function getGidForSheetTab(spreadsheetId: string, sheetName: string): string | null {
  const cleanTab = sheetName.trim().toUpperCase();
  if (spreadsheetId === WORKBOOK_IDS.GSE) {
    if (cleanTab === 'MASTERLIST') return TAB_GIDS.GSE_MASTERLIST;
    if (cleanTab === 'OVERVIEW') return TAB_GIDS.GSE_OVERVIEW;
  } else if (spreadsheetId === WORKBOOK_IDS.MATERIALS) {
    if (cleanTab === 'INVENTORY') return TAB_GIDS.MATERIALS_INVENTORY;
    if (cleanTab === 'MATERIALS TRANSACTIONS') return TAB_GIDS.MATERIALS_TRANSACTIONS;
    if (cleanTab === 'TRANSMITTALS AND RECEIVING') return TAB_GIDS.TRANSMITTALS_AND_RECEIVING;
  } else if (spreadsheetId === WORKBOOK_IDS.PERFORMANCE) {
    if (cleanTab === 'MONITORING') return TAB_GIDS.PERFORMANCE_MONITORING;
  }
  return null;
}

// Fallback fetcher via Google Sheets gviz/CSV endpoint when OAuth token is absent or refreshing
async function fetchSheetValuesPublicFallback(
  spreadsheetId: string,
  range: string,
  valueRenderOption: 'FORMATTED_VALUE' | 'FORMULA'
): Promise<{ values: any[][]; ok: boolean }> {
  // Formula layer is not distinct in CSV export, so return empty for FORMULA pass
  if (valueRenderOption === 'FORMULA') {
    return { values: [], ok: true };
  }

  const tabMatch = range.match(/^'?([^'!]+)'?!/);
  const sheetName = tabMatch?.[1] ? tabMatch[1].trim() : '';
  const gid = getGidForSheetTab(spreadsheetId, sheetName);

  const candidateUrls: string[] = [];
  if (gid) {
    candidateUrls.push(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}&_ts=${Date.now()}`
    );
  }
  if (sheetName) {
    candidateUrls.push(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&_ts=${Date.now()}`
    );
  }

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
      });
      if (!res.ok) continue;
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      // If redirected to a Google sign-in HTML page, skip
      if (contentType.includes('text/html')) continue;
      const text = await res.text();
      if (!text || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        continue;
      }
      const grid = parseCsvToGrid(text);
      if (grid.length > 0) {
        return { values: grid, ok: true };
      }
    } catch {
      // try next candidate
    }
  }

  return { values: [], ok: false };
}

// Fetch values from a specific sheet range (cache: 'no-store' to ensure newly added rows are always detected)
async function fetchSheetValues(
  spreadsheetId: string,
  range: string,
  accessToken?: string | null,
  valueRenderOption: 'FORMATTED_VALUE' | 'FORMULA' = 'FORMATTED_VALUE'
): Promise<{
  values: any[][];
  error?: string;
  status?: number;
  isAuthExpired?: boolean;
  isForbidden?: boolean;
}> {
  if (accessToken) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=${valueRenderOption}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        return { values: data.values || [] };
      }

      if (res.status === 401) {
        const fallback = await fetchSheetValuesPublicFallback(spreadsheetId, range, valueRenderOption);
        if (fallback.ok) {
          return { values: fallback.values };
        }
        return {
          values: [],
          error: 'Google Sheets access expired or invalid credentials.',
          status: 401,
          isAuthExpired: true,
        };
      }

      if (res.status === 403) {
        const fallback = await fetchSheetValuesPublicFallback(spreadsheetId, range, valueRenderOption);
        if (fallback.ok) {
          return { values: fallback.values };
        }
        return {
          values: [],
          error: 'Access forbidden. Please ensure your Google account has viewer access to this spreadsheet.',
          status: 403,
          isForbidden: true,
        };
      }

      return {
        values: [],
        error: `Failed to load spreadsheet data (HTTP ${res.status}).`,
        status: res.status,
      };
    } catch {
      const fallback = await fetchSheetValuesPublicFallback(spreadsheetId, range, valueRenderOption);
      if (fallback.ok) {
        return { values: fallback.values };
      }
      return { values: [], error: 'Network error connecting to Google Sheets API' };
    }
  }

  // No OAuth token present: attempt direct gviz/CSV fallback
  const fallback = await fetchSheetValuesPublicFallback(spreadsheetId, range, valueRenderOption);
  if (fallback.ok) {
    return { values: fallback.values };
  }

  return {
    values: [],
    error: 'Google Sheets access expired or invalid credentials.',
    status: 401,
    isAuthExpired: true,
  };
}

/**
 * 1. GSE Masterlist Parser
 * Header row 2, data row 3+
 */
export function parseGSEMasterlist(
  rows: any[][],
  spreadsheetId: string,
  formulaRows?: any[][]
): GSEEquipment[] {
  if (!rows || rows.length < 2) return [];

  // Find header row: look for row containing 'equipmentno' and supporting column in first 5 rows
  let headerRowIdx = 1; // 0-indexed for row 2
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const rowCleaned = (rows[r] || []).map(cell => cleanHeader(cell));
    const hasEqNo = rowCleaned.some(c => 
      c === 'equipmentno' || 
      c.includes('equipmentno') || 
      c === 'equipmentnum' || 
      c.includes('equipmentnum') || 
      c === 'equipmentnumber'
    );
    const hasSupporting = rowCleaned.some(c => 
      c.includes('equipmentname') || 
      c === 'category' || 
      c.includes('status') || 
      c.includes('manufacturer')
    );
    if (hasEqNo && hasSupporting) {
      headerRowIdx = r;
      break;
    }
  }

  const headerRow = rows[headerRowIdx] || [];
  const prevHeaderRow = headerRowIdx > 0 ? rows[headerRowIdx - 1] || [] : [];
  const colMap: Record<string, number> = {};
  const unitPhotoCols: number[] = [];
  const amaPlateCols: number[] = [];
  const dataPlateCols: number[] = [];

  headerRow.forEach((cell, idx) => {
    const rawHeader = String(cell || prevHeaderRow[idx] || '').trim();
    const clean = cleanHeader(rawHeader);
    const photoClassification = classifyPhotoCategoryFromText(rawHeader);

    if (clean.includes('equipmentno') || clean.includes('equipmentnum')) colMap['equipmentNumber'] = idx;
    else if (clean.includes('equipmentname')) colMap['equipmentName'] = idx;
    else if (clean === 'category') colMap['category'] = idx;
    else if (clean.includes('manufacturer')) colMap['manufacturer'] = idx;
    else if (clean === 'model') colMap['model'] = idx;
    else if (clean.includes('serialnumber')) colMap['serialNumber'] = idx;
    else if (clean.includes('assetnumber')) colMap['assetNumber'] = idx;
    else if (clean.includes('currentstatus')) colMap['currentStatus'] = idx;
    else if (clean === 'condition') colMap['condition'] = idx;
    else if (clean === 'station') colMap['station'] = idx;
    else if (clean.includes('assigneddepartment') || clean.includes('department')) colMap['assignedDepartment'] = idx;
    else if (clean.includes('currentlocation') || clean.includes('location')) colMap['currentLocation'] = idx;
    else if (clean.includes('assignedmechanic') || clean.includes('mechanic')) colMap['assignedMechanic'] = idx;
    else if (clean.includes('amaexpirationdate') || clean.includes('amaexpiration')) colMap['amaExpirationDate'] = idx;
    else if (clean.includes('remarks') || clean.includes('remark') || clean.includes('notes')) {
      colMap['remarks'] = idx;
    }

    if (photoClassification?.category === 'unit') {
      unitPhotoCols.push(idx);
      if (colMap['mainPhotoUrl'] === undefined) colMap['mainPhotoUrl'] = idx;
    } else if (photoClassification?.category === 'ama_plate') {
      amaPlateCols.push(idx);
      if (colMap['amaExpirationDate'] === undefined && clean === 'ama') {
        colMap['amaExpirationDate'] = idx;
      }
    } else if (photoClassification?.category === 'data_plate') {
      dataPlateCols.push(idx);
    }
  });

  const results: GSEEquipment[] = [];
  const seenEquipmentNos = new Set<string>();

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const fRow = formulaRows?.[r] || [];
    const rawNo = colMap['equipmentNumber'] !== undefined ? row[colMap['equipmentNumber']] : '';
    const equipmentNumber = String(rawNo || '').trim();

    // Skip empty or header rows or duplicates
    if (!equipmentNumber || seenEquipmentNos.has(equipmentNumber.toUpperCase())) continue;
    seenEquipmentNos.add(equipmentNumber.toUpperCase());

    const actualRowNumber = r + 1;

    const discoveredDisplayUrls: string[] = [];
    const discoveredLinkUrls: string[] = [];
    const rowLabeledPhotos: EquipmentPhotoItem[] = [];
    let amaPlateText = '';
    let dataPlateText = '';

    // Capture plain text fallback in AMA Plate / Data Plate columns if no URL
    for (const c of amaPlateCols) {
      const txt = sanitizeSheetText(row[c]);
      if (txt && !/^https?:\/\//i.test(txt) && !amaPlateText) {
        amaPlateText = txt;
      }
    }
    for (const c of dataPlateCols) {
      const txt = sanitizeSheetText(row[c]);
      if (txt && !/^https?:\/\//i.test(txt) && !dataPlateText) {
        dataPlateText = txt;
      }
    }

    const addClassifiedUrl = (
      u: string,
      explicitCat: 'unit' | 'ama_plate' | 'data_plate' | 'other',
      explicitLabel: string,
      sourceNote?: string
    ) => {
      const norm = normalizePhotoUrl(u);
      if (!norm) return;
      const isFolder = u.includes('/drive/folders/') || u.includes('/folders/');
      if (isFolder) return;

      if (!discoveredDisplayUrls.includes(norm.displayUrl)) {
        discoveredDisplayUrls.push(norm.displayUrl);
      }
      if (!discoveredLinkUrls.includes(norm.linkUrl)) {
        discoveredLinkUrls.push(norm.linkUrl);
      }

      const existing = rowLabeledPhotos.find((p) => p.displayUrl === norm.displayUrl);
      if (!existing) {
        rowLabeledPhotos.push({
          label: explicitLabel,
          category: explicitCat,
          displayUrl: norm.displayUrl,
          linkUrl: norm.linkUrl,
          sourceNote,
        });
      } else if (existing.category === 'other' && explicitCat !== 'other') {
        existing.category = explicitCat;
        existing.label = explicitLabel;
        if (sourceNote) existing.sourceNote = sourceNote;
      }
    };

    const maxCols = Math.max(row.length, fRow.length, headerRow.length);

    // Scan all columns in row r and classify each discovered photo URL using cell hyperlink label or column header
    for (let c = 0; c < maxCols; c++) {
      const urls = extractUrlsFromCell(row[c], fRow[c]);
      if (urls.length === 0) continue;

      const cellLabel = extractHyperlinkLabel(fRow[c], row[c]);
      const colHeader = String(headerRow[c] || prevHeaderRow[c] || '').trim();
      const leftNeighborText =
        c > 0 && extractUrlsFromCell(row[c - 1], fRow[c - 1]).length === 0
          ? sanitizeSheetText(row[c - 1])
          : '';

      const classified =
        classifyPhotoCategoryFromText(cellLabel) ||
        classifyPhotoCategoryFromText(colHeader) ||
        (unitPhotoCols.includes(c) ? { category: 'unit' as const, label: 'Unit Photo' } : null) ||
        (amaPlateCols.includes(c) ? { category: 'ama_plate' as const, label: 'AMA Plate' } : null) ||
        (dataPlateCols.includes(c) ? { category: 'data_plate' as const, label: 'Data Plate' } : null) ||
        classifyPhotoCategoryFromText(leftNeighborText);

      for (const u of urls) {
        const isImageOrDrive =
          extractGoogleDriveFileId(u) ||
          /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(u) ||
          u.includes('googleusercontent.com') ||
          u.includes('drive.google.com/thumbnail') ||
          u.includes('drive.google.com/uc') ||
          classified !== null;

        if (!isImageOrDrive) continue;

        const note = cellLabel || colHeader || undefined;
        if (classified) {
          addClassifiedUrl(u, classified.category, classified.label, note);
        } else {
          addClassifiedUrl(u, 'other', colHeader || cellLabel || 'Photo', note);
        }
      }
    }

    // Within Masterlist itself (before Overview enrichment), if there are still 'other' photos:
    // 1st Masterlist photo = Unit Photo ("Pic for reference")
    // 2nd Masterlist photo = AMA Plate
    // 3rd Masterlist photo = Data Plate
    let hasUnit = rowLabeledPhotos.some((p) => p.category === 'unit');
    let hasAma = rowLabeledPhotos.some((p) => p.category === 'ama_plate');
    let hasData = rowLabeledPhotos.some((p) => p.category === 'data_plate');

    for (const item of rowLabeledPhotos) {
      if (item.category !== 'other') continue;
      if (!hasUnit) {
        item.category = 'unit';
        item.label = 'Unit Photo';
        item.sourceNote = item.sourceNote || 'Pic for reference';
        hasUnit = true;
      } else if (!hasAma) {
        item.category = 'ama_plate';
        item.label = 'AMA Plate';
        item.sourceNote = item.sourceNote || 'AMA Plate';
        hasAma = true;
      } else if (!hasData) {
        item.category = 'data_plate';
        item.label = 'Data Plate';
        item.sourceNote = item.sourceNote || 'Data Plate';
        hasData = true;
      }
    }

    const unitPhotoItem = rowLabeledPhotos.find((p) => p.category === 'unit') || rowLabeledPhotos[0];
    const amaPhotoItem = rowLabeledPhotos.find((p) => p.category === 'ama_plate');
    const dataPhotoItem = rowLabeledPhotos.find((p) => p.category === 'data_plate');

    const primaryDisplayUrl = unitPhotoItem?.displayUrl || discoveredDisplayUrls[0] || '';
    const primaryLinkUrl = unitPhotoItem?.linkUrl || discoveredLinkUrls[0] || primaryDisplayUrl || '';

    results.push({
      equipmentNumber,
      equipmentName: colMap['equipmentName'] !== undefined ? String(row[colMap['equipmentName']] || '').trim() || equipmentNumber : equipmentNumber,
      category: colMap['category'] !== undefined ? String(row[colMap['category']] || '').trim() || 'Unavailable' : 'Unavailable',
      manufacturer: colMap['manufacturer'] !== undefined ? String(row[colMap['manufacturer']] || '').trim() : '',
      model: colMap['model'] !== undefined ? String(row[colMap['model']] || '').trim() : '',
      serialNumber: colMap['serialNumber'] !== undefined ? sanitizeSheetText(row[colMap['serialNumber']]) : '',
      assetNumber: colMap['assetNumber'] !== undefined ? sanitizeSheetText(row[colMap['assetNumber']]) : '',
      currentStatus: colMap['currentStatus'] !== undefined ? String(row[colMap['currentStatus']] || '').trim() || 'Unknown' : 'Unknown',
      condition: colMap['condition'] !== undefined ? sanitizeSheetText(row[colMap['condition']]) : '',
      station: colMap['station'] !== undefined ? sanitizeSheetText(row[colMap['station']]) : '',
      assignedDepartment: colMap['assignedDepartment'] !== undefined ? sanitizeSheetText(row[colMap['assignedDepartment']]) : '',
      currentLocation: colMap['currentLocation'] !== undefined ? sanitizeSheetText(row[colMap['currentLocation']]) : '',
      assignedMechanic: colMap['assignedMechanic'] !== undefined ? sanitizeSheetText(row[colMap['assignedMechanic']]) : '',
      amaExpirationDate: colMap['amaExpirationDate'] !== undefined ? sanitizeSheetText(row[colMap['amaExpirationDate']]) : '',
      amaPlateUrl: amaPhotoItem?.displayUrl,
      amaPlateLink: amaPhotoItem?.linkUrl,
      amaPlateText: amaPlateText || undefined,
      dataPlateUrl: dataPhotoItem?.displayUrl,
      dataPlateLink: dataPhotoItem?.linkUrl,
      dataPlateText: dataPlateText || undefined,
      datePlateUrl: dataPhotoItem?.displayUrl,
      datePlateLink: dataPhotoItem?.linkUrl,
      datePlateText: dataPlateText || undefined,
      mainPhotoLink: primaryLinkUrl,
      mainPhotoUrl: primaryDisplayUrl,
      photoUrls: discoveredDisplayUrls,
      labeledPhotos: rowLabeledPhotos,
      remarks: colMap['remarks'] !== undefined ? sanitizeSheetText(row[colMap['remarks']]) : '',
      rowNumber: actualRowNumber,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${TAB_GIDS.GSE_MASTERLIST}&range=A${actualRowNumber}`,
    });
  }

  return results;
}

/**
 * 2. Materials INVENTORY Parser
 * Header row 6 / data 7+
 */
export function parseMaterialsInventory(rows: any[][], spreadsheetId: string): MaterialInventoryItem[] {
  if (!rows || rows.length < 6) return [];

  // Find header row: look for row containing 'itemcode' and supporting column in first 12 rows
  let headerRowIdx = 5; // row 6 (0-indexed)
  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const rowCleaned = (rows[r] || []).map(cell => cleanHeader(cell));
    const hasItemCode = rowCleaned.some(c => c === 'itemcode' || c.includes('itemcode'));
    const hasSupporting = rowCleaned.some(c => 
      c === 'item' || 
      c.includes('itemdescription') || 
      c.includes('materialtype') || 
      c === 'category' || 
      c === 'uom'
    );
    if (hasItemCode && hasSupporting) {
      headerRowIdx = r;
      break;
    }
  }

  const headerRow = rows[headerRowIdx] || [];
  const colMap: Record<string, number> = {};

  headerRow.forEach((cell, idx) => {
    const clean = cleanHeader(cell);
    if (clean === 'itemcode' || clean.includes('itemcode')) colMap['itemCode'] = idx;
    else if (clean === 'item' || clean === 'itemdescription') colMap['item'] = idx;
    else if (clean.includes('materialtype')) colMap['materialType'] = idx;
    else if (clean === 'category') colMap['category'] = idx;
    else if (clean === 'uom') colMap['uom'] = idx;
    else if (clean.includes('partnumber') || clean === 'partno') colMap['partNumber'] = idx;
    else if (clean === 'make') colMap['make'] = idx;
    else if (clean.includes('specification') || clean === 'specs') colMap['specification'] = idx;
    else if (clean === 'min') colMap['min'] = idx;
    else if (clean === 'max') colMap['max'] = idx;
    else if (clean.includes('totalinbound') || clean === 'inbound') colMap['totalInbound'] = idx;
    else if (clean.includes('totaloutbound') || clean === 'outbound') colMap['totalOutbound'] = idx;
    else if (clean.includes('stockonhand') || clean === 'onhand' || clean === 'currentstock') colMap['stockOnHand'] = idx;
    else if (clean.includes('stockstatus')) colMap['stockStatus'] = idx;
    else if (clean.includes('recommendedreorder') || clean.includes('reorder')) colMap['recommendedReorder'] = idx;
  });

  const results: MaterialInventoryItem[] = [];
  const seenItemCodes = new Set<string>();

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const rawCode = colMap['itemCode'] !== undefined ? row[colMap['itemCode']] : '';
    const itemCode = String(rawCode || '').trim();

    if (!itemCode || seenItemCodes.has(itemCode.toUpperCase())) continue;
    seenItemCodes.add(itemCode.toUpperCase());

    const actualRowNumber = r + 1;

    results.push({
      itemCode,
      item: colMap['item'] !== undefined ? String(row[colMap['item']] || '').trim() : itemCode,
      materialType: colMap['materialType'] !== undefined ? String(row[colMap['materialType']] || '').trim() || 'Unavailable' : 'Unavailable',
      category: colMap['category'] !== undefined ? String(row[colMap['category']] || '').trim() : '',
      uom: colMap['uom'] !== undefined ? String(row[colMap['uom']] || '').trim() || 'Unavailable' : 'Unavailable',
      partNumber: colMap['partNumber'] !== undefined ? String(row[colMap['partNumber']] || '').trim() : '',
      make: colMap['make'] !== undefined ? String(row[colMap['make']] || '').trim() : '',
      specification: colMap['specification'] !== undefined ? String(row[colMap['specification']] || '').trim() : '',
      min: colMap['min'] !== undefined ? parseNumber(row[colMap['min']]) : null,
      max: colMap['max'] !== undefined ? parseNumber(row[colMap['max']]) : null,
      totalInbound: colMap['totalInbound'] !== undefined ? parseNumber(row[colMap['totalInbound']]) : null,
      totalOutbound: colMap['totalOutbound'] !== undefined ? parseNumber(row[colMap['totalOutbound']]) : null,
      stockOnHand: colMap['stockOnHand'] !== undefined ? parseNumber(row[colMap['stockOnHand']]) : null,
      stockStatus: colMap['stockStatus'] !== undefined ? String(row[colMap['stockStatus']] || '').trim() || 'Unknown' : 'Unknown',
      recommendedReorder: colMap['recommendedReorder'] !== undefined ? parseNumber(row[colMap['recommendedReorder']]) : null,
      rowNumber: actualRowNumber,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${TAB_GIDS.MATERIALS_INVENTORY}&range=A${actualRowNumber}`,
    });
  }

  return results;
}

/**
 * 3. Materials MATERIALS TRANSACTIONS Parser
 * "Detect bottom header within first 20 rows"
 */
export function parseMaterialsTransactions(rows: any[][], spreadsheetId: string): MaterialTransaction[] {
  if (!rows || rows.length < 2) return [];

  // Detect bottom-most header row within first 20 rows
  let headerRowIdx = 7; // fallback row 8 (0-indexed = 7)
  const maxScan = Math.min(rows.length, 20);

  for (let r = 0; r < maxScan; r++) {
    const rowCleaned = (rows[r] || []).map(cell => cleanHeader(cell));
    const hasTxCol = rowCleaned.some(c => 
      c === 'transaction' || 
      c === 'transaction#' || 
      c === 'transactionno' || 
      c === 'transactionnumber' || 
      c.includes('transactiontype') || 
      c === 'tx' || 
      c === 'tx#' || 
      c === 'txno'
    );
    const hasSupportingCols = rowCleaned.some(c => c === 'date') && 
      rowCleaned.some(c => c === 'itemcode' || c === 'item' || c.includes('qty') || c === 'uom');

    if (hasTxCol && hasSupportingCols) {
      headerRowIdx = r; // keep advancing to pick bottom-most in the first 20 rows
    }
  }

  const headerRow = rows[headerRowIdx] || [];
  const colMap: Record<string, number> = {};

  headerRow.forEach((cell, idx) => {
    const clean = cleanHeader(cell);
    if (clean.includes('transaction') || clean === 'tx' || clean === 'txno') {
      if (clean.includes('type')) {
        colMap['transactionType'] = idx;
      } else {
        colMap['transactionNumber'] = idx;
      }
    } else if (clean === 'date') colMap['date'] = idx;
    else if (clean.includes('transactiontype') || clean === 'type') colMap['transactionType'] = idx;
    else if (clean === 'itemcode' || clean.includes('itemcode')) colMap['itemCode'] = idx;
    else if (clean === 'item' || clean.includes('itemname')) colMap['item'] = idx;
    else if (clean === 'qty' || clean.includes('quantity')) colMap['qty'] = idx;
    else if (clean === 'uom') colMap['uom'] = idx;
    else if (clean.includes('provider') || clean.includes('supplier') || clean.includes('vendor')) colMap['provider'] = idx;
    else if (clean.includes('supporting') || clean.includes('docs') || clean.includes('attachment') || clean.includes('file')) colMap['supportingDocs'] = idx;
    else if (clean.includes('remarks') || clean.includes('notes')) colMap['remarks'] = idx;
  });

  const results: MaterialTransaction[] = [];

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const txNo = colMap['transactionNumber'] !== undefined ? String(row[colMap['transactionNumber']] || '').trim() : '';
    const date = colMap['date'] !== undefined ? String(row[colMap['date']] || '').trim() : '';
    const itemCode = colMap['itemCode'] !== undefined ? String(row[colMap['itemCode']] || '').trim() : '';

    // If completely blank or no identifier, skip
    if (!txNo && !itemCode && !date) continue;

    const actualRowNumber = r + 1;
    const generatedId = txNo || `TX-${actualRowNumber}`;

    results.push({
      transactionNumber: generatedId,
      date,
      transactionType: colMap['transactionType'] !== undefined ? String(row[colMap['transactionType']] || '').trim() || 'Unknown' : 'Unknown',
      itemCode,
      item: colMap['item'] !== undefined ? String(row[colMap['item']] || '').trim() : '',
      qty: colMap['qty'] !== undefined ? parseNumber(row[colMap['qty']]) : null,
      uom: colMap['uom'] !== undefined ? String(row[colMap['uom']] || '').trim() || 'Unavailable' : 'Unavailable',
      provider: colMap['provider'] !== undefined ? String(row[colMap['provider']] || '').trim() : '',
      remarks: colMap['remarks'] !== undefined ? String(row[colMap['remarks']] || '').trim() : '',
      supportingDocs: colMap['supportingDocs'] !== undefined ? String(row[colMap['supportingDocs']] || '').trim() : '',
      rowNumber: actualRowNumber,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${TAB_GIDS.MATERIALS_TRANSACTIONS}&range=A${actualRowNumber}`,
    });
  }

  return results;
}

/**
 * 4. Materials TRANSMITTALS AND RECEIVING Parser
 * Header row 4 / data 5+
 */
export function parseTransmittals(rows: any[][], spreadsheetId: string): TransmittalRecord[] {
  if (!rows || rows.length < 4) return [];

  // Header row 4 (0-indexed = 3), data row 5+
  // Specifically select only a row containing the cleaned header 'transmittalnumber'
  // (and preferably 'catergory' or 'client') so title rows like 'TRANSMITTALS AND RECEIVING' are never mistaken for headers.
  let headerRowIdx = 3; // fallback row 4 (0-indexed = 3)
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const rowCleaned = (rows[r] || []).map(cell => cleanHeader(cell));
    const hasTransmittalNumber = rowCleaned.some(c => 
      c === 'transmittalnumber' || 
      c.includes('transmittalnumber') || 
      c === 'transmittalno' || 
      c.includes('transmittalno')
    );
    const hasSupporting = rowCleaned.some(c => 
      c === 'catergory' || 
      c === 'category' || 
      c === 'client' || 
      c.includes('itemstransmitted') || 
      c.includes('dateofsubmission')
    );
    if (hasTransmittalNumber && hasSupporting) {
      headerRowIdx = r;
      break;
    }
  }

  const headerRow = rows[headerRowIdx] || [];
  const colMap: Record<string, number> = {};

  headerRow.forEach((cell, idx) => {
    const clean = cleanHeader(cell);
    if (clean.includes('transmittalnumber') || clean.includes('transmittalno')) colMap['transmittalNumber'] = idx;
    else if (clean === 'catergory' || clean === 'category') colMap['catergory'] = idx; // preserved source typo
    else if (clean === 'client') colMap['client'] = idx;
    else if (clean.includes('projectname') || clean === 'project') colMap['projectName'] = idx;
    else if (clean.includes('itemstransmitted') || clean.includes('transmittedreceived')) colMap['itemsTransmitted'] = idx;
    else if (clean.includes('dateofsubmission') || clean.includes('submissiondate') || clean === 'date') colMap['dateOfSubmission'] = idx;
    else if (clean.includes('transmittedby')) colMap['transmittedBy'] = idx;
    else if (clean.includes('receivedby')) colMap['receivedBy'] = idx;
    else if (clean === 'files' || clean.includes('file')) colMap['files'] = idx;
    else if (clean.includes('attachment')) colMap['attachment'] = idx;
    else if (clean.includes('remarks') || clean.includes('notes')) colMap['remarks'] = idx;
  });

  const results: TransmittalRecord[] = [];
  const seenTransmittalNos = new Set<string>();

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const rawNo = colMap['transmittalNumber'] !== undefined ? row[colMap['transmittalNumber']] : '';
    const transmittalNumber = String(rawNo || '').trim();

    if (!transmittalNumber || seenTransmittalNos.has(transmittalNumber.toUpperCase())) continue;
    seenTransmittalNos.add(transmittalNumber.toUpperCase());

    const actualRowNumber = r + 1;

    results.push({
      transmittalNumber,
      catergory: colMap['catergory'] !== undefined ? String(row[colMap['catergory']] || '').trim() || 'Unknown' : 'Unknown',
      client: colMap['client'] !== undefined ? String(row[colMap['client']] || '').trim() : '',
      projectName: colMap['projectName'] !== undefined ? String(row[colMap['projectName']] || '').trim() : '',
      itemsTransmitted: colMap['itemsTransmitted'] !== undefined ? String(row[colMap['itemsTransmitted']] || '').trim() : '',
      dateOfSubmission: colMap['dateOfSubmission'] !== undefined ? String(row[colMap['dateOfSubmission']] || '').trim() : '',
      transmittedBy: colMap['transmittedBy'] !== undefined ? String(row[colMap['transmittedBy']] || '').trim() : '',
      receivedBy: colMap['receivedBy'] !== undefined ? String(row[colMap['receivedBy']] || '').trim() : '',
      files: colMap['files'] !== undefined ? String(row[colMap['files']] || '').trim() : '',
      attachment: colMap['attachment'] !== undefined ? String(row[colMap['attachment']] || '').trim() : '',
      remarks: colMap['remarks'] !== undefined ? String(row[colMap['remarks']] || '').trim() : '',
      rowNumber: actualRowNumber,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${TAB_GIDS.TRANSMITTALS_AND_RECEIVING}&range=A${actualRowNumber}`,
    });
  }

  return results;
}

/**
 * /**
 * 5. Performance MONITORING Parser
 * Header row 3 / data row 4+
 * Continues indefinitely for all added work orders (including rows after RH-0706).
 */
export function parsePerformanceMonitoring(rows: any[][], spreadsheetId: string): WorkOrderRecord[] {
  if (!rows || rows.length < 3) return [];

  // Header row 3 (0-indexed = 2), data row 4+
  // Require specific work order number and supporting column (unit, client, date issued, or status)
  let headerRowIdx = 2; // fallback row 3 (0-indexed = 2)
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const rowCleaned = (rows[r] || []).map(cell => cleanHeader(cell));
    const hasWONo = rowCleaned.some(c => 
      c === 'workordernumber' || 
      c.includes('workordernumber') || 
      c === 'workorderno' || 
      c.includes('workorderno') || 
      c === 'wono' || 
      c === 'wo#' ||
      c === 'wo'
    );
    const hasSupporting = rowCleaned.some(c => 
      c.includes('dateissued') || 
      c === 'unit' || 
      c === 'unit#' || 
      c === 'unitno' || 
      c === 'status' || 
      c === 'defect' ||
      c === 'client'
    );
    if (hasWONo && hasSupporting) {
      headerRowIdx = r;
      break;
    }
  }

  const headerRow = rows[headerRowIdx] || [];
  const colMap: Record<string, number> = {};

  headerRow.forEach((cell, idx) => {
    const clean = cleanHeader(cell);
    if (
      colMap['workOrderNumber'] === undefined &&
      (clean.includes('workordernumber') || clean.includes('workorderno') || clean === 'workorder' || clean === 'wono' || clean === 'wo')
    ) {
      colMap['workOrderNumber'] = idx;
    } else if (colMap['dateIssued'] === undefined && (clean.includes('dateissued') || clean === 'issueddate' || clean === 'issued')) {
      colMap['dateIssued'] = idx;
    } else if (colMap['unitNumber'] === undefined && (clean === 'unit' || clean === 'unitno' || clean.includes('unit'))) {
      colMap['unitNumber'] = idx;
    } else if (colMap['client'] === undefined && clean === 'client') {
      colMap['client'] = idx;
    } else if (colMap['status'] === undefined && clean === 'status') {
      colMap['status'] = idx;
    } else if (colMap['description'] === undefined && (clean.includes('descriptionoftaskrepair') || clean.includes('taskrepair') || clean.includes('description'))) {
      colMap['description'] = idx;
    } else if (colMap['defect'] === undefined && clean === 'defect') {
      colMap['defect'] = idx;
    } else if (colMap['recommendation'] === undefined && clean.includes('recommendation')) {
      colMap['recommendation'] = idx;
    } else if (colMap['actionTaken'] === undefined && (clean.includes('actiontaken') || clean.includes('taskdone'))) {
      colMap['actionTaken'] = idx;
    } else if (colMap['typeOfMaintenance'] === undefined && (clean.includes('typeofmaintenance') || clean.includes('maintenancetype'))) {
      colMap['typeOfMaintenance'] = idx;
    } else if (colMap['releaseStatus'] === undefined && clean.includes('releasestatus')) {
      colMap['releaseStatus'] = idx;
    } else if (colMap['assignedMechanic'] === undefined && (clean.includes('assignedmechanic') || clean === 'mechanic')) {
      colMap['assignedMechanic'] = idx;
    } else if (colMap['totalManpower'] === undefined && (clean.includes('totalmanpower') || clean === 'manpower')) {
      colMap['totalManpower'] = idx;
    } else if (colMap['repeatDefect'] === undefined && clean.includes('repeatdefect')) {
      colMap['repeatDefect'] = idx;
    } else if (colMap['incident'] === undefined && clean === 'incident') {
      colMap['incident'] = idx;
    } else if (colMap['emh'] === undefined && clean === 'emh') {
      colMap['emh'] = idx;
    } else if (colMap['amh'] === undefined && clean === 'amh') {
      colMap['amh'] = idx;
    } else if (colMap['serviceStart'] === undefined && clean.includes('servicestart')) {
      colMap['serviceStart'] = idx;
    } else if (colMap['targetDate'] === undefined && clean.includes('targetdate')) {
      colMap['targetDate'] = idx;
    } else if (colMap['completionDate'] === undefined && clean.includes('completiondate')) {
      colMap['completionDate'] = idx;
    } else if (colMap['scheduleVariance'] === undefined && clean.includes('schedulevariance')) {
      colMap['scheduleVariance'] = idx;
    } else if (colMap['downtimeDays'] === undefined && (clean.includes('totaldaysequipmentdowntime') || clean.includes('downtime'))) {
      colMap['downtimeDays'] = idx;
    }
  });

  const results: WorkOrderRecord[] = [];
  const seenWorkOrderNos = new Set<string>();

  // Track last sequential work order ID (e.g. RH-0706 -> prefix "RH-", num 706, pad 4)
  // so that if new work order rows are added at the bottom before dragging the WO# formula,
  // or if duplicate/auto numbers occur, every added work order row is still detected.
  let lastPrefix = 'RH-';
  let lastSeqNum = 0;
  let lastPadLen = 4;

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const actualRowNumber = r + 1;

    const rawNoCell = colMap['workOrderNumber'] !== undefined ? row[colMap['workOrderNumber']] : '';
    const cleanedNo = sanitizeSheetText(rawNoCell);

    const rawUnit = colMap['unitNumber'] !== undefined ? sanitizeSheetText(row[colMap['unitNumber']]) : '';
    const dateIssued = colMap['dateIssued'] !== undefined ? sanitizeSheetText(row[colMap['dateIssued']]) : '';
    const client = colMap['client'] !== undefined ? sanitizeSheetText(row[colMap['client']]) : '';
    const status = colMap['status'] !== undefined ? sanitizeSheetText(row[colMap['status']]) : '';
    const description = colMap['description'] !== undefined ? sanitizeSheetText(row[colMap['description']]) : '';
    const defect = colMap['defect'] !== undefined ? sanitizeSheetText(row[colMap['defect']]) : '';
    const recommendation = colMap['recommendation'] !== undefined ? sanitizeSheetText(row[colMap['recommendation']]) : '';
    const actionTaken = colMap['actionTaken'] !== undefined ? sanitizeSheetText(row[colMap['actionTaken']]) : '';
    const typeOfMaintenance = colMap['typeOfMaintenance'] !== undefined ? sanitizeSheetText(row[colMap['typeOfMaintenance']]) : '';
    const releaseStatus = colMap['releaseStatus'] !== undefined ? sanitizeSheetText(row[colMap['releaseStatus']]) : '';
    const assignedMechanic = colMap['assignedMechanic'] !== undefined ? sanitizeSheetText(row[colMap['assignedMechanic']]) : '';

    // Check if the row has genuine work order details even if WO# cell was left blank
    const hasMeaningfulDetails =
      Boolean(rawUnit || defect || description || actionTaken) &&
      [rawUnit, dateIssued, client, status, description, defect, actionTaken, assignedMechanic].filter(Boolean).length >= 2;

    // Ignore summary/footer rows if any
    if (
      rawUnit.toUpperCase() === 'TOTAL' ||
      rawUnit.toUpperCase() === 'AVERAGE' ||
      cleanedNo.toUpperCase() === 'TOTAL'
    ) {
      continue;
    }

    let workOrderNumber = cleanedNo;

    if (workOrderNumber) {
      // Update sequence tracker if WO# matches pattern like RH-0706
      const seqMatch = workOrderNumber.match(/^([A-Za-z]+-\s*)(\d+)$/);
      if (seqMatch) {
        lastPrefix = seqMatch[1];
        const parsedSeq = parseInt(seqMatch[2], 10);
        if (!isNaN(parsedSeq) && parsedSeq >= lastSeqNum) {
          lastSeqNum = parsedSeq;
          lastPadLen = seqMatch[2].length;
        }
      }
    } else if (hasMeaningfulDetails) {
      // Row has work order details (Unit, Date, Defect/Task, Status, etc.) but WO# cell wasn't filled in yet
      lastSeqNum += 1;
      workOrderNumber = `${lastPrefix}${String(lastSeqNum).padStart(lastPadLen, '0')}`;
    } else {
      // Completely empty row
      continue;
    }

    // If duplicate WO# appears on a distinct work order row, disambiguate instead of dropping the row
    const upperKey = workOrderNumber.toUpperCase();
    if (seenWorkOrderNos.has(upperKey)) {
      if (!hasMeaningfulDetails) continue;
      lastSeqNum += 1;
      const candidateNext = `${lastPrefix}${String(lastSeqNum).padStart(lastPadLen, '0')}`;
      if (!seenWorkOrderNos.has(candidateNext.toUpperCase())) {
        workOrderNumber = candidateNext;
      } else {
        workOrderNumber = `${workOrderNumber}-${actualRowNumber}`;
      }
    }
    seenWorkOrderNos.add(workOrderNumber.toUpperCase());

    const repeatRaw = colMap['repeatDefect'] !== undefined ? sanitizeSheetText(row[colMap['repeatDefect']]) : '';
    const isRepeat = ['YES', 'Y', 'TRUE', '1'].includes(repeatRaw.toUpperCase());

    results.push({
      workOrderNumber,
      dateIssued,
      unitNumber: rawUnit,
      normalizedUnitNumber: normalizeUnitId(rawUnit),
      client,
      status: status || 'Open',
      description,
      defect,
      recommendation,
      actionTaken,
      typeOfMaintenance: typeOfMaintenance || 'Unknown',
      releaseStatus,
      assignedMechanic,
      totalManpower: colMap['totalManpower'] !== undefined ? parseNumber(row[colMap['totalManpower']]) : null,
      repeatDefect: isRepeat,
      repeatDefectRaw: repeatRaw,
      incident: colMap['incident'] !== undefined ? sanitizeSheetText(row[colMap['incident']]) : '',
      emh: colMap['emh'] !== undefined ? parseNumber(row[colMap['emh']]) : null,
      amh: colMap['amh'] !== undefined ? parseNumber(row[colMap['amh']]) : null,
      serviceStart: colMap['serviceStart'] !== undefined ? sanitizeSheetText(row[colMap['serviceStart']]) : '',
      targetDate: colMap['targetDate'] !== undefined ? sanitizeSheetText(row[colMap['targetDate']]) : '',
      completionDate: colMap['completionDate'] !== undefined ? sanitizeSheetText(row[colMap['completionDate']]) : '',
      scheduleVariance: colMap['scheduleVariance'] !== undefined ? sanitizeSheetText(row[colMap['scheduleVariance']]) : '',
      downtimeDays: colMap['downtimeDays'] !== undefined ? parseNumber(row[colMap['downtimeDays']]) : null,
      rowNumber: actualRowNumber,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${TAB_GIDS.PERFORMANCE_MONITORING}&range=A${actualRowNumber}`,
    });
  }

  return results;
}

/**
 * Join work orders to fleet equipment:
 * Normalizes UNIT # to Equipment No. (trim, uppercase, collapse spaces)
 * Keeps unmatched work orders!
 */
export function joinWorkOrdersWithEquipment(
  workOrders: WorkOrderRecord[],
  equipment: GSEEquipment[]
): WorkOrderRecord[] {
  const equipMap = new Map<string, GSEEquipment>();
  equipment.forEach(eq => {
    const norm = normalizeUnitId(eq.equipmentNumber);
    if (norm) {
      equipMap.set(norm, eq);
    }
  });

  return workOrders.map(wo => {
    const matched = wo.normalizedUnitNumber ? equipMap.get(wo.normalizedUnitNumber) : undefined;
    return {
      ...wo,
      matchedEquipment: matched,
    };
  });
}

/**
 * Enrich GSEEquipment records with unit pictures and statuses from the 'Overview' tab (gid=1069474470)
 * where each unit tile has:
 * - Row r-2: Status ('Out of Service', 'Under Observation', 'Serviceable')
 * - Row r-1: Unit picture (=IMAGE("...") formula or URL)
 * - Row r:   Equipment No. ('ACU 001', 'ASU 001', 'GPU 004', 'FL 001', etc.)
 * - Row r+1: 'Press for Equipment Profile'
 */
export function enrichEquipmentFromOverviewTab(
  equipment: GSEEquipment[],
  overviewRows?: any[][],
  overviewFormulaRows?: any[][]
): GSEEquipment[] {
  if (!overviewRows || overviewRows.length === 0) return equipment;

  const equipByNormId = new Map<string, GSEEquipment>();
  equipment.forEach(eq => {
    const norm = normalizeUnitId(eq.equipmentNumber);
    if (norm) equipByNormId.set(norm, eq);
  });

  for (let r = 1; r < overviewRows.length; r++) {
    const row = overviewRows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cellText = String(row[c] || '').trim();
      if (!cellText) continue;

      const normCell = normalizeUnitId(cellText);
      const matchedEq = equipByNormId.get(normCell);
      if (!matchedEq) continue;

      // Check 1 row above (r - 1) at column c (and c+1 for merged cells) for =IMAGE(...) or photo URL
      const candidateCells: Array<{ formatted: any; formula: any }> = [
        { formatted: overviewRows[r - 1]?.[c], formula: overviewFormulaRows?.[r - 1]?.[c] },
        { formatted: overviewRows[r - 1]?.[c + 1], formula: overviewFormulaRows?.[r - 1]?.[c + 1] },
      ];

      for (const cand of candidateCells) {
        const urls = extractUrlsFromCell(cand.formatted, cand.formula);
        for (const u of urls) {
          const normPhoto = normalizePhotoUrl(u);
          if (normPhoto) {
            if (!matchedEq.mainPhotoUrl) {
              matchedEq.mainPhotoUrl = normPhoto.displayUrl;
            }
            if (!matchedEq.mainPhotoLink) {
              matchedEq.mainPhotoLink = normPhoto.linkUrl;
            }
            if (!matchedEq.photoUrls) {
              matchedEq.photoUrls = [];
            }
            if (!matchedEq.photoUrls.includes(normPhoto.displayUrl)) {
              matchedEq.photoUrls.unshift(normPhoto.displayUrl);
            }
            if (!matchedEq.labeledPhotos) {
              matchedEq.labeledPhotos = [];
            }
            if (!matchedEq.labeledPhotos.some((p) => p.displayUrl === normPhoto.displayUrl)) {
              matchedEq.labeledPhotos.unshift({
                label: 'Unit Photo',
                category: 'unit',
                displayUrl: normPhoto.displayUrl,
                linkUrl: normPhoto.linkUrl,
                sourceNote: 'Overview Unit Photo',
              });
            }
          }
        }
      }

      // Check 2 rows above (r - 2) for status if Masterlist status is Unknown/blank
      if (r >= 2 && (!matchedEq.currentStatus || matchedEq.currentStatus === 'Unknown')) {
        const statusCell = String(overviewRows[r - 2]?.[c] || '').trim();
        if (statusCell) {
          matchedEq.currentStatus = statusCell;
        }
      }
    }
  }

  // Finalize plate labels across all equipment rows
  equipment.forEach((eq) => {
    const finalized = getIdentifiedEquipmentPhotos(eq);
    eq.labeledPhotos = finalized;
    const ama = finalized.find((p) => p.category === 'ama_plate');
    const dataP = finalized.find((p) => p.category === 'data_plate' || p.category === 'date_plate');
    if (ama) {
      eq.amaPlateUrl = ama.displayUrl;
      eq.amaPlateLink = ama.linkUrl;
    }
    if (dataP) {
      eq.dataPlateUrl = dataP.displayUrl;
      eq.dataPlateLink = dataP.linkUrl;
      eq.datePlateUrl = dataP.displayUrl;
      eq.datePlateLink = dataP.linkUrl;
    }
  });

  return equipment;
}

/**
 * Resolves all photos for a GSE unit with accurate identification for:
 * - Unit Photo ("Pic for reference" / Overview unit picture)
 * - AMA Plate (indicated in the row)
 * - Data Plate (indicated in the row)
 * Also repairs any legacy cached snapshot items where "Pic for reference" was shifted after Overview Unit Photo
 * or where Data Plate was labeled "Date Plate".
 */
export function getIdentifiedEquipmentPhotos(equipment: GSEEquipment): EquipmentPhotoItem[] {
  const baseItems: EquipmentPhotoItem[] = [];

  if (equipment.labeledPhotos && equipment.labeledPhotos.length > 0) {
    // Detect if this equipment record came from the legacy cache where:
    // index 0 had sourceNote === 'Overview Unit Photo' and index 1+ had sourceNote === undefined
    // (which shifted Masterlist's 1st photo "Pic for reference" into index 1 as AMA Plate).
    const isLegacyShiftedCache =
      equipment.labeledPhotos[0]?.sourceNote === 'Overview Unit Photo' &&
      equipment.labeledPhotos.length >= 2 &&
      !equipment.labeledPhotos[1]?.sourceNote;

    if (isLegacyShiftedCache) {
      equipment.labeledPhotos.forEach((item, idx) => {
        if (!item.displayUrl || baseItems.some((b) => b.displayUrl === item.displayUrl)) return;
        if (idx === 0) {
          baseItems.push({
            ...item,
            category: 'unit',
            label: 'Unit Photo',
            sourceNote: 'Overview Unit Photo',
          });
        } else if (idx === 1) {
          // 1st Masterlist photo is "Pic for reference" (Unit Photo), NOT AMA Plate!
          baseItems.push({
            ...item,
            category: 'unit',
            label: 'Unit Photo',
            sourceNote: 'Pic for reference',
          });
        } else if (idx === 2) {
          baseItems.push({
            ...item,
            category: 'ama_plate',
            label: 'AMA Plate',
            sourceNote: 'AMA Plate',
          });
        } else if (idx === 3) {
          baseItems.push({
            ...item,
            category: 'data_plate',
            label: 'Data Plate',
            sourceNote: 'Data Plate',
          });
        } else {
          baseItems.push({
            ...item,
            category: 'other',
            label: item.sourceNote || `Additional Photo ${idx}`,
          });
        }
      });
      return baseItems;
    }

    equipment.labeledPhotos.forEach((item) => {
      if (!item.displayUrl || baseItems.some((b) => b.displayUrl === item.displayUrl)) return;

      const copy: EquipmentPhotoItem = { ...item };

      // Re-verify against sourceNote / label so "Pic for reference" is always 'unit' and "Date Plate" is always 'Data Plate'
      const fromNote = classifyPhotoCategoryFromText(copy.sourceNote);
      const fromLabel = classifyPhotoCategoryFromText(copy.label);

      if (fromNote?.category === 'unit' || fromLabel?.category === 'unit') {
        copy.category = 'unit';
        copy.label = 'Unit Photo';
      } else if (
        copy.category === 'date_plate' ||
        copy.category === 'data_plate' ||
        fromNote?.category === 'data_plate' ||
        fromLabel?.category === 'data_plate'
      ) {
        copy.category = 'data_plate';
        copy.label = 'Data Plate';
      } else if (
        copy.category === 'ama_plate' ||
        fromNote?.category === 'ama_plate' ||
        fromLabel?.category === 'ama_plate'
      ) {
        copy.category = 'ama_plate';
        copy.label = 'AMA Plate';
      }

      baseItems.push(copy);
    });
  }

  const rawUrls =
    equipment.photoUrls && equipment.photoUrls.length > 0
      ? equipment.photoUrls
      : equipment.mainPhotoUrl
      ? [equipment.mainPhotoUrl]
      : [];

  rawUrls.forEach((u) => {
    const norm = normalizePhotoUrl(u);
    const displayUrl = norm ? norm.displayUrl : u;
    const linkUrl = norm ? norm.linkUrl : u;
    if (displayUrl && !baseItems.some((b) => b.displayUrl === displayUrl)) {
      baseItems.push({
        label: 'Photo',
        category: 'other',
        displayUrl,
        linkUrl,
      });
    }
  });

  if (baseItems.length === 0) return [];

  // Ensure the primary photo (index 0) is marked as Unit Photo if no unit photo is marked yet
  if (!baseItems.some((b) => b.category === 'unit')) {
    baseItems[0].category = 'unit';
    baseItems[0].label = 'Unit Photo';
    baseItems[0].sourceNote = baseItems[0].sourceNote || 'Pic for reference';
  }

  let hasAma = baseItems.some((b) => b.category === 'ama_plate');
  let hasData = baseItems.some((b) => b.category === 'data_plate' || b.category === 'date_plate');

  for (let i = 0; i < baseItems.length; i++) {
    const item = baseItems[i];
    if (
      item.category === 'unit' ||
      item.category === 'ama_plate' ||
      item.category === 'data_plate' ||
      item.category === 'date_plate'
    ) {
      if (item.category === 'date_plate') {
        item.category = 'data_plate';
        item.label = 'Data Plate';
      }
      continue;
    }
    if (!hasAma) {
      item.category = 'ama_plate';
      item.label = 'AMA Plate';
      hasAma = true;
    } else if (!hasData) {
      item.category = 'data_plate';
      item.label = 'Data Plate';
      hasData = true;
    } else {
      item.label = item.sourceNote || `Additional Photo ${i + 1}`;
    }
  }

  return baseItems;
}

/**
 * Main ingestion function: strictly reads from the 3 user-provided Google Sheets
 * Uses unbounded row ranges (A1:AZ) so all rows are read indefinitely as new records are added.
 */
export async function ingestAllGoogleSheets(
  accessToken?: string | null,
  previousEquipment?: GSEEquipment[]
): Promise<IngestionResult> {
  const statuses: IngestionResult['statuses'] = {
    gse: {
      sheetId: WORKBOOK_IDS.GSE,
      title: 'GSE Masterlist',
      tabNames: ['Masterlist', 'Overview'],
      status: 'loading',
      rowCount: 0,
    },
    materials: {
      sheetId: WORKBOOK_IDS.MATERIALS,
      title: 'Materials & Transmittals',
      tabNames: ['INVENTORY', 'MATERIALS TRANSACTIONS', 'TRANSMITTALS AND RECEIVING'],
      status: 'loading',
      rowCount: 0,
    },
    performance: {
      sheetId: WORKBOOK_IDS.PERFORMANCE,
      title: 'Performance Monitoring',
      tabNames: ['MONITORING'],
      status: 'loading',
      rowCount: 0,
    },
  };

  let parsedEquipment: GSEEquipment[] = [];
  let parsedInventory: MaterialInventoryItem[] = [];
  let parsedTransactions: MaterialTransaction[] = [];
  let parsedTransmittals: TransmittalRecord[] = [];
  let parsedWorkOrders: WorkOrderRecord[] = [];

  const errorMessages: string[] = [];

  // 1. Fetch GSE Masterlist + Overview tab (both formatted values and formulas to capture =IMAGE / =HYPERLINK unit photos)
  try {
    const [gseRes, gseFormulaRes, overviewRes, overviewFormulaRes] = await Promise.all([
      fetchSheetValues(WORKBOOK_IDS.GSE, "'Masterlist'!A1:AZ", accessToken, 'FORMATTED_VALUE'),
      fetchSheetValues(WORKBOOK_IDS.GSE, "'Masterlist'!A1:AZ", accessToken, 'FORMULA'),
      fetchSheetValues(WORKBOOK_IDS.GSE, "'Overview'!A1:Z200", accessToken, 'FORMATTED_VALUE'),
      fetchSheetValues(WORKBOOK_IDS.GSE, "'Overview'!A1:Z200", accessToken, 'FORMULA'),
    ]);

    // Fast-fail if credentials expired (401)
    if (gseRes.isAuthExpired || gseFormulaRes.isAuthExpired || overviewRes.isAuthExpired || overviewFormulaRes.isAuthExpired) {
      throw new SheetsAuthExpiredError('Google Sheets credentials expired (401)');
    }

    if (gseRes.isForbidden) {
      statuses.gse.status = 'error';
      statuses.gse.errorMessage = 'Access forbidden (403): Check GSE Masterlist viewer permissions.';
      errorMessages.push('GSE Masterlist: Access forbidden (403)');
    } else if (gseRes.error) {
      statuses.gse.status = 'error';
      statuses.gse.errorMessage = gseRes.error;
      errorMessages.push(`GSE Masterlist: ${gseRes.error}`);
    } else {
      parsedEquipment = parseGSEMasterlist(gseRes.values, WORKBOOK_IDS.GSE, gseFormulaRes.values);
      if (!overviewRes.error && overviewRes.values.length > 0) {
        parsedEquipment = enrichEquipmentFromOverviewTab(
          parsedEquipment,
          overviewRes.values,
          overviewFormulaRes.values
        );
      }

      // If synced via CSV fallback where formula cells are empty, preserve previously extracted unit photos/plates
      if (previousEquipment && previousEquipment.length > 0 && (!gseFormulaRes.values || gseFormulaRes.values.length === 0)) {
        const prevMap = new Map<string, GSEEquipment>();
        for (const prev of previousEquipment) {
          const norm = normalizeUnitId(prev.equipmentNumber);
          if (norm) prevMap.set(norm, prev);
        }
        parsedEquipment = parsedEquipment.map((eq) => {
          const prev = prevMap.get(normalizeUnitId(eq.equipmentNumber));
          if (!prev) return eq;
          return {
            ...eq,
            mainPhotoUrl: eq.mainPhotoUrl || prev.mainPhotoUrl,
            mainPhotoLink: eq.mainPhotoLink || prev.mainPhotoLink,
            photoUrls: eq.photoUrls && eq.photoUrls.length > 0 ? eq.photoUrls : prev.photoUrls,
            labeledPhotos: eq.labeledPhotos && eq.labeledPhotos.length > 0 ? eq.labeledPhotos : prev.labeledPhotos,
            amaPlateUrl: eq.amaPlateUrl || prev.amaPlateUrl,
            amaPlateLink: eq.amaPlateLink || prev.amaPlateLink,
            dataPlateUrl: eq.dataPlateUrl || prev.dataPlateUrl,
            dataPlateLink: eq.dataPlateLink || prev.dataPlateLink,
            datePlateUrl: eq.datePlateUrl || prev.datePlateUrl,
            datePlateLink: eq.datePlateLink || prev.datePlateLink,
          };
        });
      }

      statuses.gse.status = 'success';
      statuses.gse.rowCount = parsedEquipment.length;
    }
  } catch (err: any) {
    if (err instanceof SheetsAuthExpiredError || err?.name === 'SheetsAuthExpiredError') {
      throw err;
    }
    statuses.gse.status = 'error';
    statuses.gse.errorMessage = err.message || 'Error connecting to GSE Masterlist';
    errorMessages.push(`GSE Masterlist network error: ${err.message || 'connection failed'}`);
  }

  // 2. Fetch Materials Workbook (3 tabs)
  try {
    const [invRes, txRes, trRes] = await Promise.all([
      fetchSheetValues(WORKBOOK_IDS.MATERIALS, "'INVENTORY'!A1:AZ", accessToken),
      fetchSheetValues(WORKBOOK_IDS.MATERIALS, "'MATERIALS TRANSACTIONS'!A1:AZ", accessToken),
      fetchSheetValues(WORKBOOK_IDS.MATERIALS, "'TRANSMITTALS AND RECEIVING'!A1:AZ", accessToken),
    ]);

    // Fast-fail if credentials expired (401)
    if (invRes.isAuthExpired || txRes.isAuthExpired || trRes.isAuthExpired) {
      throw new SheetsAuthExpiredError('Google Sheets credentials expired (401)');
    }

    const errors: string[] = [];
    if (invRes.isForbidden || txRes.isForbidden || trRes.isForbidden) {
      errors.push('Access forbidden (403): Check Materials workbook viewer permissions.');
    } else {
      if (invRes.error) errors.push(`INVENTORY: ${invRes.error}`);
      else parsedInventory = parseMaterialsInventory(invRes.values, WORKBOOK_IDS.MATERIALS);

      if (txRes.error) errors.push(`TRANSACTIONS: ${txRes.error}`);
      else parsedTransactions = parseMaterialsTransactions(txRes.values, WORKBOOK_IDS.MATERIALS);

      if (trRes.error) errors.push(`TRANSMITTALS: ${trRes.error}`);
      else parsedTransmittals = parseTransmittals(trRes.values, WORKBOOK_IDS.MATERIALS);
    }

    const totalMaterialsRows = parsedInventory.length + parsedTransactions.length + parsedTransmittals.length;
    statuses.materials.rowCount = totalMaterialsRows;

    if (errors.length > 0 && totalMaterialsRows === 0) {
      statuses.materials.status = 'error';
      statuses.materials.errorMessage = errors.join('; ');
      errorMessages.push(`Materials: ${errors.join('; ')}`);
    } else {
      statuses.materials.status = 'success';
      if (errors.length > 0) {
        statuses.materials.errorMessage = `Partial notice: ${errors.join('; ')}`;
      }
    }
  } catch (err: any) {
    if (err instanceof SheetsAuthExpiredError || err?.name === 'SheetsAuthExpiredError') {
      throw err;
    }
    statuses.materials.status = 'error';
    statuses.materials.errorMessage = err.message || 'Error connecting to Materials workbook';
    errorMessages.push(`Materials network error: ${err.message || 'connection failed'}`);
  }

  // 3. Fetch Performance Monitoring (unbounded range A1:AZ to capture all work orders indefinitely)
  try {
    const perfRes = await fetchSheetValues(WORKBOOK_IDS.PERFORMANCE, "'MONITORING'!A1:AZ", accessToken);
    
    // Fast-fail if credentials expired (401)
    if (perfRes.isAuthExpired) {
      throw new SheetsAuthExpiredError('Google Sheets credentials expired (401)');
    }

    if (perfRes.isForbidden) {
      statuses.performance.status = 'error';
      statuses.performance.errorMessage = 'Access forbidden (403): Check Performance Monitoring viewer permissions.';
      errorMessages.push('Performance Monitoring: Access forbidden (403)');
    } else if (perfRes.error) {
      statuses.performance.status = 'error';
      statuses.performance.errorMessage = perfRes.error;
      errorMessages.push(`Performance Monitoring: ${perfRes.error}`);
    } else {
      parsedWorkOrders = parsePerformanceMonitoring(perfRes.values, WORKBOOK_IDS.PERFORMANCE);
      statuses.performance.status = 'success';
      statuses.performance.rowCount = parsedWorkOrders.length;
    }
  } catch (err: any) {
    if (err instanceof SheetsAuthExpiredError || err?.name === 'SheetsAuthExpiredError') {
      throw err;
    }
    statuses.performance.status = 'error';
    statuses.performance.errorMessage = err.message || 'Error connecting to Performance Monitoring';
    errorMessages.push(`Performance Monitoring network error: ${err.message || 'connection failed'}`);
  }

  // Join Work Orders to Equipment
  const joinedWorkOrders = joinWorkOrdersWithEquipment(parsedWorkOrders, parsedEquipment);

  const successCount = [statuses.gse, statuses.materials, statuses.performance].filter(s => s.status === 'success').length;
  let overallStatus: 'success' | 'partial' | 'error' = 'success';
  if (successCount === 0) overallStatus = 'error';
  else if (successCount < 3) overallStatus = 'partial';

  return {
    equipment: parsedEquipment,
    inventory: parsedInventory,
    transactions: parsedTransactions,
    transmittals: parsedTransmittals,
    workOrders: joinedWorkOrders,
    statuses,
    overallStatus,
    errorMessage: errorMessages.length > 0 ? errorMessages.join(' | ') : undefined,
    syncedAt: new Date().toLocaleTimeString(),
  };
}
