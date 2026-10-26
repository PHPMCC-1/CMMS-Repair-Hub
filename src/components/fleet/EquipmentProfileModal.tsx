import React, { useMemo, useState } from 'react';
import {
  GSEEquipment,
  EquipmentPhotoItem,
  WorkOrderRecord,
  normalizeUnitId,
  isClosedWorkOrderStatus,
  isCancelledWorkOrderStatus,
  isOngoingWorkOrderStatus,
  isNotStartedWorkOrderStatus,
  isOpenWorkOrderStatus,
  isClientEquipmentWorkOrder,
} from '../../types/unifiedSheets';
import { getIdentifiedEquipmentPhotos, sanitizeSheetText } from '../../services/unifiedSheetsService';
import { calculateReliabilityAnalysis } from '../../utils/kpiCalculator';
import { EquipmentPhoto, SinglePhotoViewer } from './EquipmentPhoto';
import {
  X,
  ExternalLink,
  Wrench,
  Camera,
  MapPin,
  FileSpreadsheet,
  Gauge,
  Clock,
  Activity,
  ShieldCheck,
  Tag,
  ZoomIn,
} from 'lucide-react';

interface EquipmentProfileModalProps {
  equipment: GSEEquipment | null;
  workOrders: WorkOrderRecord[];
  onClose: () => void;
  onSelectWorkOrder?: (wo: WorkOrderRecord) => void;
}

export function getEquipmentStatusBannerStyle(status: string): {
  bgClass: string;
  badgeClass: string;
  dotClass: string;
  label: string;
  category: 'serviceable' | 'observation' | 'out_of_service' | 'unknown';
} {
  const raw = (status || '').trim();
  const s = raw.toLowerCase();

  if (
    (s.includes('serviceable') && !s.includes('unserviceable')) ||
    s.includes('operat') ||
    s === 'active' ||
    s === 'good'
  ) {
    return {
      bgClass: 'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      dotClass: 'bg-emerald-600 dark:bg-emerald-400',
      label: raw || 'Serviceable',
      category: 'serviceable',
    };
  }

  if (
    s.includes('observation') ||
    s.includes('standby') ||
    s.includes('monitor') ||
    s.includes('pending')
  ) {
    return {
      bgClass: 'bg-amber-50/90 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/50',
      badgeClass: 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
      dotClass: 'bg-amber-500 dark:bg-amber-400',
      label: raw || 'Under Observation',
      category: 'observation',
    };
  }

  if (
    s.includes('out of service') ||
    s.includes('unserviceable') ||
    s.includes('maint') ||
    s.includes('repair') ||
    s.includes('down') ||
    s.includes('breakdown') ||
    s.includes('aog') ||
    s.includes('inop')
  ) {
    return {
      bgClass: 'bg-rose-50/90 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/50',
      badgeClass: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
      dotClass: 'bg-rose-600 dark:bg-rose-400',
      label: raw || 'Out of Service',
      category: 'out_of_service',
    };
  }

  return {
    bgClass: 'bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    dotClass: 'bg-slate-400',
    label: raw || 'Unknown',
    category: 'unknown',
  };
}

export const EquipmentProfileModal: React.FC<EquipmentProfileModalProps> = ({
  equipment,
  workOrders,
  onClose,
  onSelectWorkOrder,
}) => {
  const unitWorkOrders = useMemo(() => {
    if (!equipment) return [];
    const normId = normalizeUnitId(equipment.equipmentNumber);
    return workOrders.filter(wo => wo.normalizedUnitNumber === normId);
  }, [equipment, workOrders]);

  const unitReliability = useMemo(() => {
    if (!equipment) return null;
    const rel = calculateReliabilityAnalysis(
      workOrders,
      'ALL',
      [equipment],
      equipment.equipmentNumber
    );
    return rel.unitRows[0] || null;
  }, [equipment, workOrders]);

  const unitStats = useMemo(() => {
    let open = 0;
    let ongoing = 0;
    let notStarted = 0;
    let cancelled = 0;
    let closed = 0;
    let totalAmh = 0;
    let totalDowntime = 0;
    let repeatDefects = 0;

    unitWorkOrders.forEach(wo => {
      if (isClosedWorkOrderStatus(wo.status)) closed++;
      else if (isCancelledWorkOrderStatus(wo.status)) cancelled++;
      else {
        if (isOpenWorkOrderStatus(wo.status)) open++;
        if (isOngoingWorkOrderStatus(wo.status)) ongoing++;
        else if (isNotStartedWorkOrderStatus(wo.status)) notStarted++;
      }

      if (wo.amh !== null && !isNaN(wo.amh)) totalAmh += wo.amh;
      if (wo.downtimeDays !== null && !isNaN(wo.downtimeDays)) totalDowntime += wo.downtimeDays;
      if (wo.repeatDefect) repeatDefects++;
    });

    return {
      total: unitWorkOrders.length,
      open,
      ongoing,
      notStarted,
      cancelled,
      closed,
      totalAmh,
      totalDowntime,
      repeatDefects,
    };
  }, [unitWorkOrders]);

  const [zoomedPhoto, setZoomedPhoto] = useState<EquipmentPhotoItem | null>(null);

  const identifiedPhotos = useMemo(() => {
    if (!equipment) return [];
    return getIdentifiedEquipmentPhotos(equipment);
  }, [equipment]);

  const unitPhoto = useMemo(
    () =>
      identifiedPhotos.find((p) => p.category === 'unit' && p.sourceNote === 'Pic for reference') ||
      identifiedPhotos.find((p) => p.category === 'unit') ||
      identifiedPhotos[0] ||
      null,
    [identifiedPhotos]
  );
  const amaPlatePhoto = useMemo(
    () => identifiedPhotos.find((p) => p.category === 'ama_plate') || null,
    [identifiedPhotos]
  );
  const dataPlatePhoto = useMemo(
    () => identifiedPhotos.find((p) => p.category === 'data_plate' || p.category === 'date_plate') || null,
    [identifiedPhotos]
  );
  // Only show genuine plates (AMA Plate, Data Plate) or non-unit attachments in the Plates section;
  // never display unit photos ("Pic for reference") as a plate card.
  const additionalPhotos = useMemo(
    () => identifiedPhotos.filter((p) => p !== unitPhoto && p.category !== 'unit'),
    [identifiedPhotos, unitPhoto]
  );

  if (!equipment) return null;

  const cleanAmaExp = sanitizeSheetText(equipment.amaExpirationDate);

  const statusBanner = getEquipmentStatusBannerStyle(equipment.currentStatus);

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#041B2D]/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6">
      <div className="bg-white dark:bg-[#07263D] border border-slate-300 dark:border-[#163854] rounded-lg w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Modal Header */}
        <div className="bg-[#063452] dark:bg-[#041B2D] text-white px-5 py-3.5 flex items-center justify-between gap-4 border-b border-[#163854]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-2.5 py-1 rounded-xs bg-[#F37022] text-white font-mono font-bold text-sm tracking-tight">
              {equipment.equipmentNumber}
            </span>
            <div>
              <h2 className="text-base md:text-lg font-semibold text-white leading-tight">
                {equipment.equipmentName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                <span>{equipment.category || 'Ground Support Equipment'}</span>
                {equipment.station && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#F37022]" />
                      Station: {equipment.station}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2.5 py-1 rounded-xs text-xs font-semibold flex items-center gap-1.5 ${statusBanner.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusBanner.dotClass}`} />
              {statusBanner.label}
            </span>
            <a
              href={equipment.sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-xs bg-white/10 hover:bg-[#F37022] text-white transition-colors"
              title="Open unit row in Google Sheets"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xs bg-white/10 hover:bg-rose-600 text-white transition-colors"
              title="Close profile"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="@container flex-1 overflow-y-auto p-4 @md:p-6 space-y-6 text-xs text-[#063452] dark:text-[#F0F7F8]">
          {/* Unit Per-Unit MTBF & MTTR Summary Bar */}
          {unitReliability && (
            <div className="grid grid-cols-1 @xs:grid-cols-2 @md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-md bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854]">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#98BAC9]">
                  <span>Unit MTBF</span>
                  <Gauge className="w-3.5 h-3.5 text-[#063452] dark:text-sky-400 shrink-0" />
                </div>
                <div className="mt-1.5 font-mono tabular-nums text-lg font-bold text-[#063452] dark:text-white">
                  {unitReliability.mtbfDays !== null ? `${unitReliability.mtbfDays.toFixed(1)}d` : '-'}
                  {unitReliability.mtbfHours !== null && (
                    <span className="text-xs font-normal text-slate-500 dark:text-[#98BAC9] ml-1.5">
                      ({Math.round(unitReliability.mtbfHours)}h)
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-md bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854]">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#98BAC9]">
                  <span>Unit MTTR</span>
                  <Clock className="w-3.5 h-3.5 text-[#F37022] shrink-0" />
                </div>
                <div className="mt-1.5 font-mono tabular-nums text-lg font-bold text-[#063452] dark:text-white">
                  {unitReliability.mttrHours !== null
                    ? `${Math.round(unitReliability.mttrHours)}h / rep`
                    : '0h (No Failures)'}
                </div>
              </div>

              <div className="p-3.5 rounded-md bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854]">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#98BAC9]">
                  <span>Unit Availability</span>
                  <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </div>
                <div className="mt-1.5 font-mono tabular-nums text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {unitReliability.availabilityPct}%
                </div>
              </div>

              <div className="p-3.5 rounded-md bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854]">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#98BAC9]">
                  <span>Total Unit Downtime</span>
                  <Wrench className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                </div>
                <div className="mt-1.5 font-mono tabular-nums text-lg font-bold text-[#063452] dark:text-white">
                  {unitStats.totalDowntime.toFixed(1)}d
                  <span className="text-xs font-normal text-slate-500 dark:text-[#98BAC9] ml-1.5">
                    ({unitStats.totalAmh}h AMH)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Top Grid: Photo & Identified Plates (Left) + Full Equipment Specifications Table (Right) */}
          <div className="grid grid-cols-1 @lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Main Unit Photo + Automatically Displayed AMA Plate & Date Plate */}
            <div className="@lg:col-span-5 space-y-3">
              {/* Main Unit Asset Card */}
              <div
                onClick={() => unitPhoto && setZoomedPhoto(unitPhoto)}
                className={`border border-slate-200 dark:border-[#163854] rounded-md overflow-hidden bg-white dark:bg-[#041B2D] shadow-2xs group ${
                  unitPhoto ? 'cursor-pointer hover:border-[#F37022] transition-colors' : ''
                }`}
              >
                <div className={`py-2 px-3 flex items-center justify-between text-xs font-semibold border-b ${statusBanner.bgClass}`}>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusBanner.dotClass}`} />
                    {statusBanner.label}
                  </span>
                  <span className="font-mono text-[11px] opacity-80">Unit Photo · {equipment.station || '-'}</span>
                </div>
                <EquipmentPhoto equipment={equipment} variant="tile" />
                <div className="bg-[#063452] dark:bg-[#051C2C] text-white px-3 py-2 flex items-center justify-between border-t border-slate-200 dark:border-[#163854]">
                  <span className="font-mono font-bold text-sm">{equipment.equipmentNumber}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] text-slate-300 truncate max-w-[160px]">{equipment.equipmentName}</span>
                    {unitPhoto && <ZoomIn className="w-3.5 h-3.5 text-[#F37022] shrink-0" />}
                  </div>
                </div>
              </div>

              {/* Automatically Displayed AMA Plate & Data Plate Cards */}
              {additionalPhotos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#98BAC9]">
                      Identified Row Plates ({additionalPhotos.length})
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-[#98BAC9]/70">
                      Click plate to enlarge
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {additionalPhotos.map((photo, idx) => {
                      const isAma = photo.category === 'ama_plate';
                      const isDataPlate = photo.category === 'data_plate' || photo.category === 'date_plate';
                      const displayLabel = isDataPlate ? 'Data Plate' : photo.label;

                      return (
                        <div
                          key={`${photo.displayUrl}-${idx}`}
                          onClick={() => setZoomedPhoto({ ...photo, label: displayLabel })}
                          className="border border-slate-200 dark:border-[#163854] hover:border-[#F37022] rounded-md overflow-hidden bg-white dark:bg-[#041B2D] shadow-2xs transition-colors cursor-pointer flex flex-col justify-between group"
                        >
                          {/* Plate Header Badge */}
                          <div
                            className={`px-2.5 py-1.5 border-b flex items-center justify-between gap-1 text-[11px] font-bold ${
                              isAma
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/60'
                                : isDataPlate
                                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-800/60'
                                : 'bg-slate-50 dark:bg-[#07263D] text-[#063452] dark:text-[#F0F7F8] border-slate-200 dark:border-[#163854]'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              {isAma ? (
                                <ShieldCheck className="w-3.5 h-3.5 text-[#F37022] shrink-0" />
                              ) : (
                                <Tag className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                              )}
                              <span className="truncate">{displayLabel}</span>
                            </span>
                            <a
                              href={photo.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={`Open ${displayLabel} in Google Drive`}
                              className="p-0.5 rounded-xs hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>

                          {/* Automatically Rendered Plate Image */}
                          <div className="relative w-full aspect-4/3 bg-white dark:bg-[#0A2236] p-1.5">
                            <SinglePhotoViewer
                              url={photo.displayUrl}
                              alt={`${equipment.equipmentNumber} — ${displayLabel}`}
                              className="w-full h-full"
                              imgClassName="w-full h-full object-contain group-hover:scale-103 transition-transform duration-200"
                            />
                            <div className="absolute bottom-1.5 right-1.5 bg-[#063452]/80 text-white p-1 rounded-xs opacity-80 group-hover:opacity-100 group-hover:bg-[#F37022] transition-all">
                              <ZoomIn className="w-3 h-3" />
                            </div>
                          </div>

                          {/* Plate Footer Metadata */}
                          <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#051C2C] border-t border-slate-200 dark:border-[#163854] text-[10px] text-slate-600 dark:text-[#98BAC9] flex items-center justify-between truncate">
                            {isAma ? (
                              <span className="truncate font-mono">
                                {cleanAmaExp
                                  ? `Exp: ${cleanAmaExp}`
                                  : sanitizeSheetText(equipment.amaPlateText) || 'AMA Sticker / Plate'}
                              </span>
                            ) : isDataPlate ? (
                              <span className="truncate font-mono">
                                {sanitizeSheetText(equipment.serialNumber)
                                  ? `SN: ${sanitizeSheetText(equipment.serialNumber)}`
                                  : sanitizeSheetText(equipment.dataPlateText || equipment.datePlateText) || 'Unit Data Plate'}
                              </span>
                            ) : (
                              <span className="truncate font-mono">{equipment.equipmentNumber}</span>
                            )}
                            <span className="text-[#F37022] font-semibold ml-1 shrink-0">View</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Structured Grid Specification Table */}
            <div className="@lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#063452] dark:text-[#F0F7F8]">
                  Equipment Specifications & Plates
                </h3>
                <span className="font-mono text-[11px] text-slate-500 dark:text-[#98BAC9]">
                  Masterlist Row #{equipment.rowNumber}
                </span>
              </div>

              <div className="border border-slate-200 dark:border-[#163854] rounded-md overflow-x-auto">
                <table className="w-full min-w-[460px] text-left text-xs php-spec-table">
                  <tbody>
                    <tr>
                      <th className="py-2.5 px-3 align-middle w-1/4">
                        Equipment No.
                      </th>
                      <td className="py-2.5 px-3 align-middle font-mono font-bold text-[#F37022] w-1/4">
                        {equipment.equipmentNumber}
                      </td>
                      <th className="py-2.5 px-3 align-middle w-1/4">
                        Equipment Name
                      </th>
                      <td className="py-2.5 px-3 align-middle font-semibold text-[#063452] dark:text-[#F0F7F8] w-1/4">
                        {equipment.equipmentName}
                      </td>
                    </tr>
                    <tr>
                      <th className="py-2.5 px-3 align-middle">
                        Category
                      </th>
                      <td className="py-2.5 px-3 align-middle text-[#063452] dark:text-[#F0F7F8]">
                        {equipment.category || '-'}
                      </td>
                      <th className="py-2.5 px-3 align-middle">
                        Make / Manufacturer
                      </th>
                      <td className="py-2.5 px-3 align-middle text-[#063452] dark:text-[#F0F7F8]">
                        {equipment.manufacturer || '-'}
                      </td>
                    </tr>
                    <tr>
                      <th className="py-2.5 px-3 align-middle">
                        Model
                      </th>
                      <td className="py-2.5 px-3 align-middle text-[#063452] dark:text-[#F0F7F8]">
                        {equipment.model || '-'}
                      </td>
                      <th className="py-2.5 px-3 align-middle">
                        Serial Number
                      </th>
                      <td className="py-2.5 px-3 align-middle font-mono text-[#063452] dark:text-[#F0F7F8]">
                        {sanitizeSheetText(equipment.serialNumber) || '-'}
                      </td>
                    </tr>
                    <tr>
                      <th className="py-2.5 px-3 align-middle">
                        Asset Number
                      </th>
                      <td className="py-2.5 px-3 align-middle font-mono text-[#063452] dark:text-[#F0F7F8]">
                        {sanitizeSheetText(equipment.assetNumber) || '-'}
                      </td>
                      <th className="py-2.5 px-3 align-middle">
                        Physical Condition
                      </th>
                      <td className="py-2.5 px-3 align-middle text-[#063452] dark:text-[#F0F7F8]">
                        {sanitizeSheetText(equipment.condition) || '-'}
                      </td>
                    </tr>
                    <tr>
                      <th className="py-2.5 px-3 align-middle">
                        Station
                      </th>
                      <td className="py-2.5 px-3 align-middle font-mono font-medium text-[#063452] dark:text-[#F0F7F8]">
                        {sanitizeSheetText(equipment.station) || '-'}
                      </td>
                      <th className="py-2.5 px-3 align-middle">
                        Current Location
                      </th>
                      <td className="py-2.5 px-3 align-middle text-[#063452] dark:text-[#F0F7F8]">
                        {sanitizeSheetText(equipment.currentLocation) || '-'}
                      </td>
                    </tr>
                    <tr>
                      <th className="py-2.5 px-3 align-middle">
                        Department
                      </th>
                      <td className="py-2.5 px-3 align-middle text-[#063452] dark:text-[#F0F7F8]">
                        {sanitizeSheetText(equipment.assignedDepartment) || '-'}
                      </td>
                      <th className="py-2.5 px-3 align-middle">
                        AMA Expiration
                      </th>
                      <td className="py-2.5 px-3 align-middle font-mono text-[#063452] dark:text-[#F0F7F8]">
                        {cleanAmaExp || '-'}
                      </td>
                    </tr>
                    <tr>
                      <th className="py-2.5 px-3 align-middle">
                        AMA Plate
                      </th>
                      <td className="py-2.5 px-3 align-middle">
                        {amaPlatePhoto ? (
                          <button
                            type="button"
                            onClick={() => setZoomedPhoto(amaPlatePhoto)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold text-[11px] hover:border-[#F37022]"
                          >
                            <ShieldCheck className="w-3 h-3 text-[#F37022]" />
                            <span>AMA Plate Identified</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 dark:text-[#98BAC9]/50">
                            {sanitizeSheetText(equipment.amaPlateText) || 'Not linked in row'}
                          </span>
                        )}
                      </td>
                      <th className="py-2.5 px-3 align-middle">
                        Data Plate
                      </th>
                      <td className="py-2.5 px-3 align-middle">
                        {dataPlatePhoto ? (
                          <button
                            type="button"
                            onClick={() => setZoomedPhoto({ ...dataPlatePhoto, label: 'Data Plate' })}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-sky-50 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-semibold text-[11px] hover:border-[#F37022]"
                          >
                            <Tag className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                            <span>Data Plate Identified</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 dark:text-[#98BAC9]/50">
                            {sanitizeSheetText(equipment.dataPlateText || equipment.datePlateText) || 'Not linked in row'}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {equipment.remarks && (
                <div className="bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] p-3 rounded-md text-[#063452] dark:text-[#F0F7F8]">
                  <span className="font-semibold text-[11px] uppercase tracking-wide text-slate-500 dark:text-[#98BAC9] block">Remarks</span>
                  <p className="mt-0.5 leading-relaxed">{equipment.remarks}</p>
                </div>
              )}
            </div>
          </div>

          {/* Unit Maintenance History Table */}
          <div className="space-y-3">
            <div className="flex flex-col @sm:flex-row @sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-[#163854] pb-2.5">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#F37022]" />
                <h3 className="text-sm font-semibold text-[#063452] dark:text-[#F0F7F8]">
                  Unit Maintenance Work Order History ({unitStats.total})
                </h3>
              </div>

              {/* Clean unboxed/segmented status summary */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <span className="text-[#F37022] font-semibold">On-going: {unitStats.ongoing}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-amber-700 dark:text-amber-300 font-semibold">Open: {unitStats.open}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-sky-700 dark:text-sky-300 font-semibold">Not Started: {unitStats.notStarted}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Cancelled: {unitStats.cancelled}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Closed: {unitStats.closed}</span>
              </div>
            </div>

            {unitWorkOrders.length > 0 ? (
              <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-[#163854]">
                <table className="w-full min-w-[920px] text-left text-xs">
                  <thead>
                    <tr>
                      <th className="py-2.5 px-3">WO #</th>
                      <th className="py-2.5 px-3">Date Issued</th>
                      <th className="py-2.5 px-3">Client / Ownership</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Defect / Diagnosis</th>
                      <th className="py-2.5 px-3">Action Taken</th>
                      <th className="py-2.5 px-3">Mechanic</th>
                      <th className="py-2.5 px-3 text-right">AMH</th>
                      <th className="py-2.5 px-3 text-right">Downtime</th>
                      <th className="py-2.5 px-3">Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitWorkOrders.map((wo) => {
                      const isClientEq = isClientEquipmentWorkOrder(wo.client);
                      return (
                        <tr
                          key={wo.workOrderNumber}
                          onClick={() => {
                            if (onSelectWorkOrder) {
                              onClose();
                              onSelectWorkOrder(wo);
                            }
                          }}
                          className="transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 align-middle font-mono font-bold text-[#F37022] whitespace-nowrap">
                            {wo.workOrderNumber}
                          </td>
                          <td className="py-2.5 px-3 align-middle font-mono text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                            {wo.dateIssued || '-'}
                          </td>
                          <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                            {isClientEq ? (
                              <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 inline-block">
                                Client Eq.{wo.client ? `: ${wo.client}` : ''}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-block">
                                Internal
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold inline-block ${getWorkOrderBadgeClass(wo.status)}`}>
                              {wo.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 align-middle text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                            {wo.typeOfMaintenance || '-'}
                          </td>
                          <td className="py-2.5 px-3 align-middle font-medium text-[#063452] dark:text-[#F0F7F8] max-w-xs">
                            {wo.defect || wo.description || '-'}
                          </td>
                          <td className="py-2.5 px-3 align-middle text-slate-600 dark:text-[#98BAC9] max-w-xs">
                            {wo.actionTaken || wo.recommendation || '-'}
                          </td>
                          <td className="py-2.5 px-3 align-middle text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                            {wo.assignedMechanic || '-'}
                          </td>
                          <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums font-semibold text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                            {wo.amh !== null ? `${wo.amh}h` : '-'}
                          </td>
                          <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                            {wo.downtimeDays !== null ? `${wo.downtimeDays}d` : '-'}
                          </td>
                          <td className="py-2.5 px-3 align-middle font-mono text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                            {wo.completionDate || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 rounded-md bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] text-center text-slate-500 dark:text-[#98BAC9]">
                No maintenance work orders found for unit <strong>{equipment.equipmentNumber}</strong>.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-[#041B2D] border-t border-slate-200 dark:border-[#163854] flex items-center justify-between">
          <a
            href={equipment.sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#063452] dark:text-[#98BAC9] hover:text-[#F37022]"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#F37022]" />
            <span>Open Masterlist Row #{equipment.rowNumber} in Google Sheets</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#063452] hover:bg-[#09476e] dark:bg-[#F37022] dark:hover:bg-[#d95f16] text-white text-xs font-semibold transition-colors"
          >
            Close Profile
          </button>
        </div>

        {/* Lightbox overlay for enlarged Unit Photo, AMA Plate, or Date Plate inspection */}
        {zoomedPhoto && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
            onClick={() => setZoomedPhoto(null)}
          >
            <div
              className="relative w-full max-w-3xl bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-md shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 bg-[#063452] dark:bg-[#041B2D] border-b border-[#163854] flex items-center justify-between text-white">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold bg-[#F37022] text-white">
                    {equipment.equipmentNumber}
                  </span>
                  <h4 className="text-sm font-bold truncate">{zoomedPhoto.label}</h4>
                  {zoomedPhoto.sourceNote && (
                    <span className="text-xs font-mono text-[#98BAC9] truncate">
                      ({zoomedPhoto.sourceNote})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {zoomedPhoto.linkUrl && (
                    <a
                      href={zoomedPhoto.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition-colors"
                    >
                      <span>Open Original</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setZoomedPhoto(null)}
                    className="p-1.5 rounded-xs text-[#98BAC9] hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Close enlarged photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="w-full h-[65vh] max-h-[540px] bg-slate-900/95 flex items-center justify-center p-2">
                <SinglePhotoViewer
                  url={zoomedPhoto.displayUrl}
                  alt={`${equipment.equipmentNumber} ${zoomedPhoto.label}`}
                  className="w-full h-full rounded-xs overflow-hidden"
                  imgClassName="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


