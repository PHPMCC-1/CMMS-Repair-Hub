import React from 'react';
import { useApp } from '../../context/AppContext';
import { ReliabilityAnalysisPanel } from './ReliabilityAnalysisPanel';
import { EquipmentProfileModal } from '../fleet/EquipmentProfileModal';
import { Gauge, ExternalLink } from 'lucide-react';

export const ReliabilityView: React.FC = () => {
  const {
    workOrders,
    equipment,
    selectedEquipment,
    setSelectedEquipment,
    setSelectedWorkOrder,
    setActiveTab,
    workbookUrls,
    syncStatus,
    isUsingCachedData,
    signInGoogle,
  } = useApp();

  const hasReliabilityData = isUsingCachedData || workOrders.length > 0 || equipment.length > 0;

  return (
    <div className="p-3 @md:p-6 max-w-7xl mx-auto space-y-4 @md:space-y-5 text-[#063452] dark:text-[#F0F7F8]">
      {/* Page Header */}
      <div className="flex flex-col @sm:flex-row @sm:items-center justify-between gap-3 bg-white dark:bg-[#07263D] px-4 @md:px-5 py-3.5 @md:py-4 rounded-lg border border-slate-200 dark:border-[#163854] shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-md bg-[#063452] text-[#F37022] flex items-center justify-center shrink-0">
            <Gauge className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base @md:text-xl font-bold text-[#063452] dark:text-[#F0F7F8] tracking-tight">
              Unit MTBF & MTTR Reliability Analysis
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#98BAC9] truncate">
              Per-unit Mean Time Between Failures (MTBF), Mean Time To Repair (MTTR), and overall fleet average across all units.
            </p>
          </div>
        </div>
      </div>

      {!hasReliabilityData && syncStatus === 'token_expired' ? (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-lg p-10 text-center space-y-3 shadow-2xs">
          <Gauge className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto" />
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Google Sheets access expired
          </h3>
          <p className="text-xs text-amber-800 dark:text-amber-300 max-w-md mx-auto">
            Connect Google once to load and persist per-unit MTBF, MTTR, and reliability analytics.
          </p>
          <button
            onClick={signInGoogle}
            className="px-4 py-2 bg-[#F37022] hover:bg-[#d95f16] text-white text-xs font-semibold rounded-md transition-colors"
          >
            Reconnect Google
          </button>
        </div>
      ) : !hasReliabilityData && syncStatus === 'signed_out' ? (
        <div className="bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-lg p-10 text-center space-y-3">
          <Gauge className="w-8 h-8 text-[#F37022] mx-auto" />
          <h3 className="text-sm font-semibold text-[#063452] dark:text-[#F0F7F8]">
            Sign In to Load Per-Unit MTBF & MTTR Reliability
          </h3>
          <button
            onClick={signInGoogle}
            className="px-4 py-2 bg-[#063452] dark:bg-[#F37022] text-white text-xs font-semibold rounded-md"
          >
            Sign in with Google
          </button>
        </div>
      ) : (
        <ReliabilityAnalysisPanel
          workOrders={workOrders}
          equipment={equipment}
          onSelectEquipment={(eq) => setSelectedEquipment(eq)}
          onSelectWorkOrder={(wo) => {
            setSelectedWorkOrder(wo);
            setActiveTab('work-orders');
          }}
        />
      )}

      {/* Equipment Profile Modal */}
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
