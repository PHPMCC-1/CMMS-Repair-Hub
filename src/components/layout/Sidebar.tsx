import React from 'react';
import { useApp, AppTab } from '../../context/AppContext';
import { 
  Home, 
  Layers, 
  Wrench, 
  Package, 
  FileCheck2, 
  PanelLeftClose, 
  PanelLeftOpen,
  AlertCircle,
  Gauge,
} from 'lucide-react';
import { PHPLogo } from './PHPLogo';
import { isOpenWorkOrderStatus } from '../../types/unifiedSheets';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  variant?: 'sidebar' | 'mobile-bar';
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
  variant = 'sidebar',
}) => {
  const { 
    activeTab, 
    setActiveTab, 
    activePersona, 
    equipment,
    inventory,
    transmittals,
    workOrders,
    isAdmin,
    deviceMode,
  } = useApp();

  const openWorkOrdersCount = workOrders.filter(w => isOpenWorkOrderStatus(w.status)).length;
  const inventoryAlertsCount = inventory.filter(i => {
    const s = i.stockStatus.toUpperCase();
    return s.includes('LOW') || s.includes('OUT') || s.includes('REORDER');
  }).length;

  interface NavItem {
    id: AppTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    isAlertBadge?: boolean;
  }

  const navItems: NavItem[] = [
    { id: 'home', label: 'Command Center', shortLabel: 'Home', icon: Home },
    { 
      id: 'fleet', 
      label: 'Fleet Masterlist', 
      shortLabel: 'Fleet',
      icon: Layers,
      badge: equipment.length > 0 ? equipment.length : undefined,
    },
    { 
      id: 'reliability', 
      label: 'MTBF & MTTR Reliability', 
      shortLabel: 'MTBF/MTTR',
      icon: Gauge,
    },
    { 
      id: 'inventory', 
      label: 'Materials and Inventory', 
      shortLabel: 'Materials',
      icon: Package,
      badge: inventoryAlertsCount > 0 ? inventoryAlertsCount : undefined,
      isAlertBadge: true,
    },
    { 
      id: 'transmittals', 
      label: 'Receiving / Transmittals', 
      shortLabel: 'Receiving',
      icon: FileCheck2,
      badge: transmittals.length > 0 ? transmittals.length : undefined,
    },
    { 
      id: 'work-orders', 
      label: 'Work Orders', 
      shortLabel: 'Work Orders',
      icon: Wrench,
      badge: openWorkOrdersCount > 0 ? openWorkOrdersCount : undefined,
      isAlertBadge: true,
    },
  ];

  const isItemActive = (id: AppTab) =>
    activeTab === id ||
    (id === 'fleet' && activeTab === 'equipment') ||
    (id === 'inventory' && activeTab === 'materials') ||
    (id === 'work-orders' && (activeTab === 'requests' || activeTab === 'reports'));

  if (variant === 'mobile-bar') {
    return (
      <div className="bg-white dark:bg-[#07263D] border-b border-slate-200 dark:border-[#123E5E] px-2.5 py-2 shrink-0">
        <div className="flex items-center justify-between gap-2 pb-2 mb-1.5 border-b border-slate-100 dark:border-[#123E5E]/70">
          <div className="flex items-center gap-2 dark:bg-white/95 dark:px-2 dark:py-0.5 dark:rounded-xs">
            <PHPLogo size="sm" />
          </div>
          {!isAdmin && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#F37022] truncate max-w-[160px]">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span className="truncate">{activePersona.company}</span>
            </span>
          )}
        </div>
        <nav className="grid grid-cols-3 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-xs text-[11px] font-medium transition-colors truncate ${
                  isActive
                    ? 'bg-[#063452] dark:bg-[#0B3554] text-white font-semibold'
                    : 'bg-slate-50 dark:bg-[#041B2D] text-slate-700 dark:text-[#98BAC9] hover:text-[#063452] dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0 truncate">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#F37022]' : 'text-slate-400 dark:text-[#98BAC9]/70'}`} />
                  <span className="truncate">{item.shortLabel}</span>
                </span>
                {item.badge !== undefined && (
                  <span className={`font-mono text-[10px] font-semibold px-1 rounded-xs ml-1 shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : item.isAlertBadge
                      ? 'bg-[#F37022]/15 text-[#F37022]'
                      : 'bg-slate-200/70 dark:bg-[#07263D] text-slate-600 dark:text-[#98BAC9]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  if (collapsed) {
    return (
      <aside className="w-14 bg-white dark:bg-[#07263D] border-r border-slate-200 dark:border-[#123E5E] flex flex-col items-center py-2.5 gap-2 select-none shrink-0 min-h-full transition-all">
        <button
          onClick={onToggleCollapse}
          title="Expand navigation sidebar"
          className="p-2 rounded-md text-[#063452] dark:text-[#F0F7F8] hover:bg-slate-100 dark:hover:bg-[#041B2D] transition-colors mb-1"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

        <nav className="flex flex-col items-center gap-1.5 w-full px-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`relative w-full h-9 flex items-center justify-center rounded-md transition-colors ${
                  isActive
                    ? 'bg-[#063452] dark:bg-[#0B3554] text-[#F37022]'
                    : 'text-slate-500 dark:text-[#98BAC9] hover:bg-slate-100 dark:hover:bg-[#041B2D] hover:text-[#063452] dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.badge !== undefined && item.isAlertBadge && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#F37022]" />
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside className={`${deviceMode === 'tablet' ? 'w-52' : 'w-60'} bg-white dark:bg-[#07263D] border-r border-slate-200 dark:border-[#123E5E] flex flex-col justify-between select-none shrink-0 min-h-full transition-all`}>
      {/* Top Header */}
      <div>
        <div className="h-14 px-3.5 flex items-center justify-between border-b border-slate-200 dark:border-[#123E5E]">
          <div className="flex items-center gap-2 overflow-hidden dark:bg-white/95 dark:px-2 dark:py-1 dark:rounded-md">
            <PHPLogo size="sm" />
          </div>

          <div className="flex items-center gap-1 text-slate-500 dark:text-[#98BAC9]">
            <button 
              onClick={onToggleCollapse}
              title="Collapse sidebar" 
              className="p-1.5 hover:text-[#063452] dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-[#041B2D] transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-2.5 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.id);

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#063452] dark:bg-[#0B3554] text-white font-semibold'
                    : 'text-slate-700 dark:text-[#98BAC9] hover:bg-slate-100 dark:hover:bg-[#041B2D] hover:text-[#063452] dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#F37022]' : 'text-slate-400 dark:text-[#98BAC9]/70'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-xs ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : item.isAlertBadge
                      ? 'bg-[#F37022]/15 text-[#F37022]'
                      : 'bg-slate-100 dark:bg-[#041B2D] text-slate-600 dark:text-[#98BAC9]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Client Access Notice */}
        {!isAdmin && (
          <div className="mx-2.5 mt-2 p-2.5 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#123E5E] rounded-md text-[11px] text-[#063452] dark:text-[#F0F7F8]">
            <div className="font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-[#F37022] shrink-0" />
              <span className="truncate">{activePersona.company}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

