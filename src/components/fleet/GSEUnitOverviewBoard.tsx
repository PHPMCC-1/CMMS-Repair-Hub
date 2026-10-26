import React, { useMemo } from 'react';
import { GSEEquipment } from '../../types/unifiedSheets';
import { EquipmentPhoto } from './EquipmentPhoto';
import { getEquipmentStatusBannerStyle } from './EquipmentProfileModal';
import { ChevronRight, Layers } from 'lucide-react';

interface GSEUnitOverviewBoardProps {
  equipment: GSEEquipment[];
  onSelectEquipment: (eq: GSEEquipment) => void;
  title?: string;
  maxItems?: number;
}

export const GSEUnitOverviewBoard: React.FC<GSEUnitOverviewBoardProps> = ({
  equipment,
  onSelectEquipment,
  title = 'Ground Support Equipment — Unit Overview',
  maxItems,
}) => {
  const displayedUnits = maxItems ? equipment.slice(0, maxItems) : equipment;

  const statusCounts = useMemo(() => {
    let serviceable = 0;
    let observation = 0;
    let outOfService = 0;
    equipment.forEach((eq) => {
      const st = getEquipmentStatusBannerStyle(eq.currentStatus);
      if (st.category === 'serviceable') serviceable++;
      else if (st.category === 'observation') observation++;
      else if (st.category === 'out_of_service') outOfService++;
    });
    return { serviceable, observation, outOfService };
  }, [equipment]);

  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-[#163854] bg-white dark:bg-[#07263D] shadow-2xs">
      {/* Executive Header Bar */}
      <div className="bg-[#063452] dark:bg-[#051C2C] text-white py-3 px-4 @md:px-5 border-b border-[#163854] flex flex-col @md:flex-row @md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Layers className="w-4 h-4 text-[#F37022] shrink-0" />
          <h2 className="text-sm @md:text-base font-semibold tracking-tight text-white truncate">
            {title}
          </h2>
          <span className="text-xs font-mono text-slate-300 shrink-0">
            ({displayedUnits.length}{maxItems && equipment.length > maxItems ? ` of ${equipment.length}` : ''} units)
          </span>
        </div>

        {/* Status Summary Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] @md:text-xs text-slate-200 font-mono">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Serviceable: <strong>{statusCounts.serviceable}</strong></span>
          </span>
          <span className="text-white/20">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Observation: <strong>{statusCounts.observation}</strong></span>
          </span>
          <span className="text-white/20">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Out of Service: <strong>{statusCounts.outOfService}</strong></span>
          </span>
        </div>
      </div>

      {/* Corporate Unit Grid Container (Container-responsive across Mobile 2-col, Tablet 3-col, Desktop 4-6 col) */}
      <div className="bg-slate-50/70 dark:bg-[#041B2D]/60 p-3.5 @md:p-5">
        {displayedUnits.length > 0 ? (
          <div className="grid grid-cols-1 @xs:grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4 @xl:grid-cols-6 gap-3 @md:gap-3.5">
            {displayedUnits.map((eq) => {
              const statusBanner = getEquipmentStatusBannerStyle(eq.currentStatus);

              return (
                <div
                  key={eq.equipmentNumber}
                  onClick={() => onSelectEquipment(eq)}
                  className="bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] hover:border-[#F37022] dark:hover:border-[#F37022] rounded-md overflow-hidden flex flex-col justify-between shadow-2xs transition-colors cursor-pointer group"
                >
                  <div>
                    {/* Top Semantic Status Strip */}
                    <div
                      className={`py-1.5 px-2.5 text-[11px] font-semibold border-b flex items-center justify-between gap-1.5 ${statusBanner.bgClass}`}
                      title={eq.currentStatus}
                    >
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusBanner.dotClass}`} />
                        <span className="truncate">{statusBanner.label}</span>
                      </span>
                      {eq.station && (
                        <span className="font-mono text-[10px] opacity-75 shrink-0">
                          {eq.station}
                        </span>
                      )}
                    </div>

                    {/* Studio Photo Container */}
                    <EquipmentPhoto equipment={eq} variant="tile" />

                    {/* Unit Identification Block */}
                    <div className="px-2.5 py-2 bg-white dark:bg-[#07263D]">
                      <div className="font-mono font-bold text-xs text-[#063452] dark:text-white group-hover:text-[#F37022] transition-colors truncate">
                        {eq.equipmentNumber}
                      </div>
                      <div className="text-[11px] font-medium text-slate-600 dark:text-[#98BAC9] truncate mt-0.5" title={eq.equipmentName}>
                        {eq.equipmentName || 'Ground Support Unit'}
                      </div>
                    </div>
                  </div>

                  {/* Subtle Corporate Action Footer */}
                  <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#041B2D] border-t border-slate-100 dark:border-[#163854] flex items-center justify-between text-[10px] font-semibold text-slate-600 dark:text-[#98BAC9] group-hover:bg-[#063452] group-hover:text-white dark:group-hover:bg-[#F37022] dark:group-hover:text-white transition-colors">
                    <span>Equipment Profile</span>
                    <ChevronRight className="w-3 h-3 shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 dark:text-[#98BAC9] text-xs">
            No Ground Support Equipment units available.
          </div>
        )}
      </div>
    </div>
  );
};
