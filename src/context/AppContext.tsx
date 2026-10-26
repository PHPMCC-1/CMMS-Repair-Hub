import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  GSEEquipment,
  MaterialInventoryItem,
  MaterialTransaction,
  TransmittalRecord,
  WorkOrderRecord,
  SheetSourceStatus,
  DashboardKPIs,
  normalizeUnitId,
  isInternalWorkOrder,
  isClientEquipmentWorkOrder,
} from '../types/unifiedSheets';
import {
  ingestAllGoogleSheets,
  WORKBOOK_IDS,
  WORKBOOK_URLS,
  IngestionResult,
  SheetsAuthExpiredError,
} from '../services/unifiedSheetsService';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  invalidateToken,
  hasValidToken,
} from '../services/googleAuth';
import {
  saveSheetsSnapshot,
  loadSheetsSnapshot,
  clearSheetsSnapshot,
} from '../services/sheetsCacheService';
import {
  calculateDashboardKPIs,
  DateFilterRange,
  isDateInPeriod,
} from '../utils/kpiCalculator';
import { UserPersona } from '../types';

export type AppTab = 
  | 'home'
  | 'fleet'
  | 'reliability'
  | 'inventory'
  | 'transmittals'
  | 'work-orders'
  // Legacy aliases
  | 'equipment'
  | 'materials'
  | 'reports'
  | 'pms'
  | 'directory'
  | 'requests';

export type SyncStatusType = 'signed_out' | 'loading' | 'success' | 'partial' | 'error' | 'token_expired';

const ACCOUNTS_STORAGE_KEY = 'php_repairhub_user_accounts_v2';
const ACTIVE_ACCOUNT_EMAIL_KEY = 'php_repairhub_active_account_email_v2';

export const INITIAL_USER_PERSONAS: UserPersona[] = [
  {
    email: 'maint.commandcenter@gmail.com',
    name: 'Joseph Ramos',
    role: 'admin',
    company: 'PHP Repair Hub Command Center',
    clientScope: 'ALL',
    avatarLetter: 'J',
    avatarBg: 'bg-[#063452] text-white',
  },
  {
    email: 'client.portal@phprepairhub.com',
    name: 'Client Equipment Portal',
    role: 'client',
    company: 'All Client Equipment (Non-Internal)',
    clientScope: 'ALL_CLIENT_EQUIPMENT',
    avatarLetter: 'C',
    avatarBg: 'bg-[#F37022] text-white',
  },
];

interface AppContextType {
  // Navigation & View
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  deviceMode: 'desktop' | 'tablet' | 'mobile';
  setDeviceMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  themeMode: 'day' | 'night';
  toggleThemeMode: () => void;

  // Personas & Account Access Control
  personas: UserPersona[];
  activePersona: UserPersona;
  setActivePersona: (p: UserPersona) => void;
  isAdmin: boolean;
  addPersona: (input: {
    email: string;
    name: string;
    role: 'admin' | 'client';
    clientScope?: string;
    company?: string;
  }) => void;
  updatePersona: (email: string, updates: Partial<UserPersona>) => void;
  removePersona: (email: string) => void;
  resetPersonas: () => void;
  isAccountManagerOpen: boolean;
  setIsAccountManagerOpen: (open: boolean) => void;

  // Google Sheets Connection State (Strictly Read-Only, Continuous Auto-Sync)
  isGoogleConnected: boolean;
  isTokenExpired: boolean;
  isUsingCachedData: boolean;
  googleUser: User | null;
  isSyncingSheets: boolean;
  syncStatus: SyncStatusType;
  lastSyncTime: string | null;
  syncError: string | null;
  sourceStatuses: IngestionResult['statuses'] | null;
  nextAutoRefreshIn: number; // seconds countdown to next auto sync
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => void;
  autoSyncIntervalSeconds: number;
  setAutoSyncIntervalSeconds: (seconds: number) => void;
  signInGoogle: () => Promise<void>;
  signOutGoogle: () => Promise<void>;
  refreshSheets: () => Promise<void>;

  // Authoritative Domain Data
  equipment: GSEEquipment[];
  filteredEquipment: GSEEquipment[];
  selectedEquipment: GSEEquipment | null;
  setSelectedEquipment: (eq: GSEEquipment | null) => void;

  inventory: MaterialInventoryItem[];
  filteredInventory: MaterialInventoryItem[];
  selectedInventoryItem: MaterialInventoryItem | null;
  setSelectedInventoryItem: (item: MaterialInventoryItem | null) => void;

  transactions: MaterialTransaction[];
  filteredTransactions: MaterialTransaction[];

  transmittals: TransmittalRecord[];
  filteredTransmittals: TransmittalRecord[];
  selectedTransmittal: TransmittalRecord | null;
  setSelectedTransmittal: (t: TransmittalRecord | null) => void;

  workOrders: WorkOrderRecord[];
  filteredWorkOrders: WorkOrderRecord[];
  selectedWorkOrder: WorkOrderRecord | null;
  setSelectedWorkOrder: (wo: WorkOrderRecord | null) => void;

  // Provisional Dashboard KPIs
  kpis: DashboardKPIs;

  // Global & Drill-Down Filters
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  stationFilter: string;
  setStationFilter: (s: string) => void;
  clientFilter: string;
  setClientFilter: (c: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  materialTypeFilter: string;
  setMaterialTypeFilter: (m: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  dateFilter: DateFilterRange;
  setDateFilter: (d: DateFilterRange) => void;
  resetAllFilters: () => void;
  activeFilterCount: number;

  // Sheet Links
  workbookIds: typeof WORKBOOK_IDS;
  workbookUrls: typeof WORKBOOK_URLS;

  // Unaltered Photo Logo
  customLogoUrl: string | null;
  setCustomLogoUrl: (url: string | null) => void;
  resetCustomLogo: () => void;

  // Legacy drawer compatibility
  isDatabaseSettingsOpen: boolean;
  setIsDatabaseSettingsOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [activeTab, setActiveTabRaw] = useState<AppTab>('home');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [themeMode, setThemeMode] = useState<'day' | 'night'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('php_repairhub_theme_mode');
      if (saved === 'night' || saved === 'day') return saved;
    }
    return 'day';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (themeMode === 'night') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('php_repairhub_theme_mode', themeMode);
    }
  }, [themeMode]);

  const toggleThemeMode = useCallback(() => {
    setThemeMode((prev) => (prev === 'day' ? 'night' : 'day'));
  }, []);

  // Normalize legacy tab names
  const setActiveTab = (tab: AppTab) => {
    if (tab === 'equipment') setActiveTabRaw('fleet');
    else if (tab === 'materials') setActiveTabRaw('inventory');
    else if (tab === 'reports' || tab === 'requests') setActiveTabRaw('work-orders');
    else setActiveTabRaw(tab);
  };

  // Personas & Account Access Directory (persisted in localStorage)
  const [personas, setPersonasState] = useState<UserPersona[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // fallback to default
      }
    }
    return INITIAL_USER_PERSONAS;
  });

  const [activePersona, setActivePersonaState] = useState<UserPersona>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedEmail = localStorage.getItem(ACTIVE_ACCOUNT_EMAIL_KEY);
        if (savedEmail) {
          const found = personas.find((p) => p.email.toLowerCase() === savedEmail.toLowerCase());
          if (found) return found;
        }
      } catch {
        // ignore
      }
    }
    return personas[0] || INITIAL_USER_PERSONAS[0];
  });

  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);

  const savePersonas = useCallback((nextPersonas: UserPersona[]) => {
    setPersonasState(nextPersonas);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(nextPersonas));
      } catch {
        // ignore storage quota errors
      }
    }
  }, []);

  const setActivePersona = useCallback((p: UserPersona) => {
    setActivePersonaState(p);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_ACCOUNT_EMAIL_KEY, p.email);
      } catch {
        // ignore
      }
    }
  }, []);

  const addPersona = useCallback(
    (input: {
      email: string;
      name: string;
      role: 'admin' | 'client';
      clientScope?: string;
      company?: string;
    }) => {
      const cleanEmail = input.email.trim().toLowerCase();
      if (!cleanEmail) return;
      const cleanName = input.name.trim() || cleanEmail.split('@')[0];
      const scope =
        input.role === 'admin'
          ? 'ALL'
          : input.clientScope?.trim() || 'ALL_CLIENT_EQUIPMENT';
      const companyLabel =
        input.role === 'admin'
          ? input.company?.trim() || 'PHP Repair Hub Command Center'
          : scope === 'ALL_CLIENT_EQUIPMENT'
          ? 'All Client Equipment (Non-Internal)'
          : `Client: ${scope}`;
      const avatarLetter = cleanName.charAt(0).toUpperCase() || 'U';
      const avatarBg =
        input.role === 'admin'
          ? 'bg-[#063452] text-white'
          : 'bg-[#F37022] text-white';

      const newPersona: UserPersona = {
        email: cleanEmail,
        name: cleanName,
        role: input.role,
        company: companyLabel,
        clientScope: scope,
        avatarLetter,
        avatarBg,
      };

      setPersonasState((prev) => {
        const exists = prev.some((p) => p.email.toLowerCase() === cleanEmail);
        const updated = exists
          ? prev.map((p) => (p.email.toLowerCase() === cleanEmail ? newPersona : p))
          : [...prev, newPersona];
        if (typeof window !== 'undefined') {
          localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
        }
        return updated;
      });
    },
    []
  );

  const updatePersona = useCallback(
    (email: string, updates: Partial<UserPersona>) => {
      const targetEmail = email.trim().toLowerCase();
      setPersonasState((prev) => {
        const updated = prev.map((p) => {
          if (p.email.toLowerCase() !== targetEmail) return p;
          const nextRole = updates.role ?? p.role;
          const nextScope =
            nextRole === 'admin'
              ? 'ALL'
              : updates.clientScope !== undefined
              ? updates.clientScope
              : p.clientScope || 'ALL_CLIENT_EQUIPMENT';
          const nextCompany =
            updates.company !== undefined
              ? updates.company
              : nextRole === 'admin'
              ? 'PHP Repair Hub Command Center'
              : nextScope === 'ALL_CLIENT_EQUIPMENT'
              ? 'All Client Equipment (Non-Internal)'
              : `Client: ${nextScope}`;
          const nextName = updates.name !== undefined ? updates.name : p.name;
          const nextAvatarBg =
            nextRole === 'admin' ? 'bg-[#063452] text-white' : 'bg-[#F37022] text-white';

          const merged: UserPersona = {
            ...p,
            ...updates,
            name: nextName,
            role: nextRole,
            clientScope: nextScope,
            company: nextCompany,
            avatarLetter: (nextName.charAt(0) || p.avatarLetter || 'U').toUpperCase(),
            avatarBg: nextAvatarBg,
          };
          return merged;
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
        }

        const matchedActive = updated.find(
          (u) => u.email.toLowerCase() === activePersona.email.toLowerCase()
        );
        if (matchedActive) {
          setActivePersonaState(matchedActive);
        }
        return updated;
      });
    },
    [activePersona.email]
  );

  const removePersona = useCallback(
    (email: string) => {
      const targetEmail = email.trim().toLowerCase();
      setPersonasState((prev) => {
        if (prev.length <= 1) return prev;
        const remaining = prev.filter((p) => p.email.toLowerCase() !== targetEmail);
        // Ensure at least 1 admin remains
        if (!remaining.some((p) => p.role === 'admin')) {
          remaining[0] = {
            ...remaining[0],
            role: 'admin',
            company: 'PHP Repair Hub Command Center',
            clientScope: 'ALL',
            avatarBg: 'bg-[#063452] text-white',
          };
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(remaining));
        }
        if (activePersona.email.toLowerCase() === targetEmail) {
          setActivePersona(remaining[0]);
        }
        return remaining;
      });
    },
    [activePersona.email, setActivePersona]
  );

  const resetPersonas = useCallback(() => {
    savePersonas(INITIAL_USER_PERSONAS);
    setActivePersona(INITIAL_USER_PERSONAS[0]);
  }, [savePersonas, setActivePersona]);

  const isAdmin = activePersona.role === 'admin';

  // Photo Logo
  const [customLogoUrl, setCustomLogoUrlState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('php_repairhub_custom_photo_logo');
    }
    return null;
  });

  const setCustomLogoUrl = (url: string | null) => {
    setCustomLogoUrlState(url);
    if (typeof window !== 'undefined') {
      if (url) localStorage.setItem('php_repairhub_custom_photo_logo', url);
      else localStorage.removeItem('php_repairhub_custom_photo_logo');
    }
  };

  const resetCustomLogo = () => setCustomLogoUrl(null);

  // Hydrate initial persisted Google Sheets snapshot if present
  const initialSnapshot = useMemo(() => loadSheetsSnapshot(), []);

  // Auto-sync preferences (default: enabled, every 60 seconds)
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('php_repairhub_autosync_enabled');
      if (saved === 'false') return false;
    }
    return true;
  });

  const [autoSyncIntervalSeconds, setAutoSyncIntervalSecondsState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(localStorage.getItem('php_repairhub_autosync_interval_sec'));
      if (saved && [30, 60, 120, 300].includes(saved)) return saved;
    }
    return 60;
  });

  const setAutoSyncEnabled = useCallback((enabled: boolean) => {
    setAutoSyncEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('php_repairhub_autosync_enabled', String(enabled));
    }
  }, []);

  const setAutoSyncIntervalSeconds = useCallback((seconds: number) => {
    const clean = [30, 60, 120, 300].includes(seconds) ? seconds : 60;
    setAutoSyncIntervalSecondsState(clean);
    setNextAutoRefreshIn(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('php_repairhub_autosync_interval_sec', String(clean));
    }
  }, []);

  // Auth & Connection State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>(() =>
    initialSnapshot ? 'success' : 'signed_out'
  );
  const [isUsingCachedData, setIsUsingCachedData] = useState<boolean>(() => !!initialSnapshot);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => initialSnapshot?.syncedAt ?? null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [sourceStatuses, setSourceStatuses] = useState<IngestionResult['statuses'] | null>(
    () => initialSnapshot?.statuses ?? null
  );
  const [nextAutoRefreshIn, setNextAutoRefreshIn] = useState<number>(autoSyncIntervalSeconds);

  // Real Domain Data (strictly from Google Sheets, persisted locally across token expirations)
  const [equipment, setEquipment] = useState<GSEEquipment[]>(() => initialSnapshot?.equipment ?? []);
  const [inventory, setInventory] = useState<MaterialInventoryItem[]>(() => initialSnapshot?.inventory ?? []);
  const [transactions, setTransactions] = useState<MaterialTransaction[]>(() => initialSnapshot?.transactions ?? []);
  const [transmittals, setTransmittals] = useState<TransmittalRecord[]>(() => initialSnapshot?.transmittals ?? []);
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>(() => initialSnapshot?.workOrders ?? []);

  const equipmentRef = useRef<GSEEquipment[]>(equipment);
  useEffect(() => {
    equipmentRef.current = equipment;
  }, [equipment]);

  const lastSyncTimestampMsRef = useRef<number>(0);
  const isIngestingRef = useRef<boolean>(false);

  // Selected Items for Drawers/Modals
  const [selectedEquipment, setSelectedEquipment] = useState<GSEEquipment | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<MaterialInventoryItem | null>(null);
  const [selectedTransmittal, setSelectedTransmittal] = useState<TransmittalRecord | null>(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderRecord | null>(null);

  // Global & Drill-Down Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stationFilter, setStationFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [materialTypeFilter, setMaterialTypeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterRange>({ preset: 'all' });

  // Reset Filters
  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setStationFilter('ALL');
    setClientFilter('ALL');
    setStatusFilter('ALL');
    setMaterialTypeFilter('ALL');
    setCategoryFilter('ALL');
    setDateFilter({ preset: 'all' });
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (stationFilter !== 'ALL') count++;
    if (clientFilter !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (materialTypeFilter !== 'ALL') count++;
    if (categoryFilter !== 'ALL') count++;
    if (dateFilter.preset !== 'all') count++;
    return count;
  }, [searchQuery, stationFilter, clientFilter, statusFilter, materialTypeFilter, categoryFilter, dateFilter]);

  // Sync signed-in Google user email with Account Directory
  useEffect(() => {
    if (!googleUser?.email) return;
    const userEmail = googleUser.email.trim().toLowerCase();
    const existing = personas.find((p) => p.email.toLowerCase() === userEmail);
    if (existing) {
      // Ensure activePersona stays in sync if it matches the signed-in Google email
      if (activePersona.email.toLowerCase() === userEmail && activePersona !== existing) {
        setActivePersonaState(existing);
      }
    } else {
      // Automatically register newly signed-in Google email into the Account Directory
      // so the Admin can see and control its role (Admin vs Client)
      const isDefaultAdmin = userEmail === 'maint.commandcenter@gmail.com';
      const displayName = googleUser.displayName || userEmail.split('@')[0];
      addPersona({
        email: userEmail,
        name: displayName,
        role: isDefaultAdmin ? 'admin' : 'client',
        clientScope: isDefaultAdmin ? 'ALL' : 'ALL_CLIENT_EQUIPMENT',
      });
    }
  }, [googleUser, personas, activePersona, addPersona]);

  // Perform Real Read-Only Ingestion with automatic silent token renewal, fallback transport & local snapshot persistence
  const executeIngest = useCallback(
    async (
      token?: string | null,
      options?: { isFreshSignIn?: boolean; isSilentBackground?: boolean }
    ) => {
      if (isIngestingRef.current) return;
      isIngestingRef.current = true;

      const isFreshSignIn = options?.isFreshSignIn ?? false;
      const hasExistingData = equipmentRef.current.length > 0 || !!loadSheetsSnapshot();
      const isSilentBackground = options?.isSilentBackground ?? hasExistingData;

      setIsSyncingSheets(true);
      if (!isSilentBackground) {
        setSyncStatus('loading');
      }
      setSyncError(null);

      const applyIngestionResult = (result: IngestionResult, usedLiveToken: boolean) => {
        setEquipment(result.equipment);
        setInventory(result.inventory);
        setTransactions(result.transactions);
        setTransmittals(result.transmittals);
        setWorkOrders(result.workOrders);
        setSourceStatuses(result.statuses);
        setLastSyncTime(result.syncedAt);
        setSyncStatus(result.overallStatus);
        setIsUsingCachedData(!usedLiveToken);
        setNextAutoRefreshIn(autoSyncIntervalSeconds);
        lastSyncTimestampMsRef.current = Date.now();

        // Persist snapshot locally so data remains available indefinitely and syncs across tabs
        saveSheetsSnapshot(result);

        if (result.errorMessage) {
          setSyncError(result.errorMessage);
        }
      };

      try {
        const prevEq = equipmentRef.current.length > 0 ? equipmentRef.current : loadSheetsSnapshot()?.equipment;
        const result = await ingestAllGoogleSheets(token, prevEq);
        const isLiveSuccess = result.overallStatus === 'success' || result.overallStatus === 'partial';
        applyIngestionResult(result, isLiveSuccess || !!token);
      } catch (err: any) {
        if (err instanceof SheetsAuthExpiredError || err?.name === 'SheetsAuthExpiredError') {
          // 1. Discard expired token and retry immediately via direct gviz/CSV live fallback
          invalidateToken();
          try {
            const prevEq = equipmentRef.current.length > 0 ? equipmentRef.current : loadSheetsSnapshot()?.equipment;
            const retryResult = await ingestAllGoogleSheets(null, prevEq);
            if (retryResult.overallStatus === 'success' || retryResult.overallStatus === 'partial') {
              applyIngestionResult(retryResult, true);
              return;
            }
          } catch {
            // fallback to cached snapshot below
          }

          // 2. Retain cached snapshot seamlessly without interrupting the user's workflow
          const cached = loadSheetsSnapshot();
          if (cached) {
            setEquipment(cached.equipment);
            setInventory(cached.inventory);
            setTransactions(cached.transactions);
            setTransmittals(cached.transmittals);
            setWorkOrders(cached.workOrders);
            setSourceStatuses(cached.statuses);
            setLastSyncTime(cached.syncedAt);
            setIsUsingCachedData(true);
          }

          if (isFreshSignIn) {
            setSyncStatus('error');
            setSyncError(
              'Google Sheets authorization was rejected. Please ensure your Google account has viewer access to the workbooks.'
            );
          } else if (cached) {
            // Keep status clean and non-disruptive while cached data is active
            setSyncStatus('success');
            setSyncError(null);
          } else {
            setSyncStatus('token_expired');
            setSyncError('Connect your Google account once to enable automatic workbook sync.');
          }
        } else {
          const cached = loadSheetsSnapshot();
          if (cached && isSilentBackground) {
            // Keep existing data active during transient network blips
            setIsUsingCachedData(true);
            setSyncStatus('success');
          } else {
            setSyncStatus('error');
            setSyncError(err?.message || 'Failed to read data from Google Sheets');
          }
        }
      } finally {
        isIngestingRef.current = false;
        setIsSyncingSheets(false);
        setNextAutoRefreshIn(autoSyncIntervalSeconds);
      }
    },
    [autoSyncIntervalSeconds]
  );

  // Initialize Auth Listener & Automatic Startup Sync:
  // Automatically attempts silent token renewal or fallback ingestion on load without popping up a window.
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        if (user) setGoogleUser(user);
        executeIngest(token, { isFreshSignIn: false, isSilentBackground: !!loadSheetsSnapshot() });
      },
      async (persistedUser) => {
        if (persistedUser) setGoogleUser(persistedUser);
        const cached = loadSheetsSnapshot();
        if (cached) {
          setEquipment(cached.equipment);
          setInventory(cached.inventory);
          setTransactions(cached.transactions);
          setTransmittals(cached.transmittals);
          setWorkOrders(cached.workOrders);
          setSourceStatuses(cached.statuses);
          setLastSyncTime(cached.syncedAt);
          setIsUsingCachedData(true);
          setSyncStatus('success');
        }

        // Attempt background ingestion (tries silent refresh / direct fallback automatically)
        await executeIngest(null, { isFreshSignIn: false, isSilentBackground: !!cached });
      }
    );
    return () => unsubscribe();
  }, [executeIngest]);

  // Cross-Tab Live Snapshot Listener:
  // If another open tab syncs the workbooks, immediately update this tab's state.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'php_repairhub_sheets_snapshot_v1' && e.newValue) {
        const updated = loadSheetsSnapshot();
        if (updated) {
          setEquipment(updated.equipment);
          setInventory(updated.inventory);
          setTransactions(updated.transactions);
          setTransmittals(updated.transmittals);
          setWorkOrders(updated.workOrders);
          setSourceStatuses(updated.statuses);
          setLastSyncTime(updated.syncedAt);
          setSyncStatus(updated.overallStatus);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Continuous Background Auto-Sync Loop + Focus / Visibility / Network Reconnect Triggers
  useEffect(() => {
    if (!autoSyncEnabled) return;

    const triggerBackgroundSync = async () => {
      if (isIngestingRef.current) return;
      const token = await getAccessToken(true);
      await executeIngest(token, { isFreshSignIn: false, isSilentBackground: true });
    };

    const timer = setInterval(() => {
      setNextAutoRefreshIn((prev) => {
        if (prev <= 1) {
          triggerBackgroundSync();
          return autoSyncIntervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    const handleWindowFocusOrOnline = () => {
      if (document.visibilityState === 'visible' && !isIngestingRef.current) {
        // Throttle focus-triggered syncs to at most once every 15 seconds
        if (Date.now() - lastSyncTimestampMsRef.current > 15_000) {
          triggerBackgroundSync();
        }
      }
    };

    window.addEventListener('focus', handleWindowFocusOrOnline);
    document.addEventListener('visibilitychange', handleWindowFocusOrOnline);
    window.addEventListener('online', handleWindowFocusOrOnline);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleWindowFocusOrOnline);
      document.removeEventListener('visibilitychange', handleWindowFocusOrOnline);
      window.removeEventListener('online', handleWindowFocusOrOnline);
    };
  }, [autoSyncEnabled, autoSyncIntervalSeconds, executeIngest]);

  // Manual / On-Demand Sync Action (never forces popup if silent refresh or fallback works)
  const refreshSheets = useCallback(async () => {
    const token = await getAccessToken(true);
    await executeIngest(token, { isFreshSignIn: false, isSilentBackground: true });
  }, [executeIngest]);

  // User-Initiated Sign In / Reconnect Action
  const signInGoogle = useCallback(async () => {
    try {
      setIsSyncingSheets(true);
      setSyncError(null);
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        await executeIngest(res.accessToken, { isFreshSignIn: true, isSilentBackground: true });
      }
    } catch (err: any) {
      invalidateToken();
      const cached = loadSheetsSnapshot();
      setIsUsingCachedData(!!cached);
      setSyncStatus(cached ? 'success' : 'error');
      const friendlyMsg =
        err?.code === 'auth/popup-closed-by-user'
          ? 'Sign-in popup was closed before completing.'
          : 'Google sign-in could not be completed. Please try again.';
      setSyncError(friendlyMsg);
    } finally {
      setIsSyncingSheets(false);
    }
  }, [executeIngest]);

  // Sign Out (explicitly clears local cached snapshot)
  const signOutGoogle = useCallback(async () => {
    await logout();
    clearSheetsSnapshot();
    setGoogleUser(null);
    setSyncStatus('signed_out');
    setIsUsingCachedData(false);
    setSyncError(null);
    setEquipment([]);
    setInventory([]);
    setTransactions([]);
    setTransmittals([]);
    setWorkOrders([]);
    setSourceStatuses(null);
    setLastSyncTime(null);
  }, []);

  // Filtered Equipment (Fleet)
  const filteredEquipment = useMemo(() => {
    return equipment.filter((eq) => {
      if (stationFilter !== 'ALL' && eq.station.toUpperCase() !== stationFilter.toUpperCase()) {
        return false;
      }
      if (statusFilter !== 'ALL' && eq.currentStatus.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      if (categoryFilter !== 'ALL' && eq.category.toUpperCase() !== categoryFilter.toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          eq.equipmentNumber.toLowerCase().includes(q) ||
          eq.equipmentName.toLowerCase().includes(q) ||
          eq.category.toLowerCase().includes(q) ||
          eq.manufacturer.toLowerCase().includes(q) ||
          eq.model.toLowerCase().includes(q) ||
          eq.serialNumber.toLowerCase().includes(q) ||
          eq.station.toLowerCase().includes(q) ||
          eq.assignedMechanic.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [equipment, stationFilter, statusFilter, categoryFilter, searchQuery]);

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (materialTypeFilter !== 'ALL' && item.materialType.toUpperCase() !== materialTypeFilter.toUpperCase()) {
        return false;
      }
      if (categoryFilter !== 'ALL' && item.category.toUpperCase() !== categoryFilter.toUpperCase()) {
        return false;
      }
      if (statusFilter !== 'ALL') {
        const s = item.stockStatus.toUpperCase();
        if (statusFilter === 'LOW' && !s.includes('LOW')) return false;
        if (statusFilter === 'OUT' && !s.includes('OUT')) return false;
        if (statusFilter === 'IN' && !s.includes('IN')) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.itemCode.toLowerCase().includes(q) ||
          item.item.toLowerCase().includes(q) ||
          item.partNumber.toLowerCase().includes(q) ||
          item.make.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [inventory, materialTypeFilter, categoryFilter, statusFilter, searchQuery]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!isDateInPeriod(tx.date, dateFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          tx.transactionNumber.toLowerCase().includes(q) ||
          tx.itemCode.toLowerCase().includes(q) ||
          tx.item.toLowerCase().includes(q) ||
          tx.provider.toLowerCase().includes(q) ||
          tx.transactionType.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [transactions, dateFilter, searchQuery]);

  // Role-scoped Work Orders:
  // Rule: Any work order NOT marked as "Internal" is considered the Client's Equipment.
  const roleScopedWorkOrders = useMemo(() => {
    if (isAdmin) return workOrders;
    const scope = (activePersona.clientScope || 'ALL_CLIENT_EQUIPMENT').trim().toUpperCase();
    return workOrders.filter((wo) => {
      // Never include "Internal" work orders for client accounts
      if (!isClientEquipmentWorkOrder(wo.client)) return false;
      if (scope !== 'ALL_CLIENT_EQUIPMENT' && scope !== 'ALL') {
        return wo.client.trim().toUpperCase() === scope;
      }
      return true;
    });
  }, [workOrders, isAdmin, activePersona.clientScope]);

  // Role-scoped Transmittals
  const roleScopedTransmittals = useMemo(() => {
    if (isAdmin) return transmittals;
    const scope = (activePersona.clientScope || 'ALL_CLIENT_EQUIPMENT').trim().toUpperCase();
    return transmittals.filter((tr) => {
      if (isInternalWorkOrder(tr.client)) return false;
      if (scope !== 'ALL_CLIENT_EQUIPMENT' && scope !== 'ALL') {
        return tr.client.trim().toUpperCase() === scope;
      }
      return true;
    });
  }, [transmittals, isAdmin, activePersona.clientScope]);

  // Filtered Transmittals
  const filteredTransmittals = useMemo(() => {
    return roleScopedTransmittals.filter((tr) => {
      if (clientFilter === 'CLIENT_EQUIPMENT') {
        if (!isClientEquipmentWorkOrder(tr.client)) return false;
      } else if (clientFilter === 'INTERNAL_ONLY') {
        if (!isInternalWorkOrder(tr.client)) return false;
      } else if (clientFilter !== 'ALL' && tr.client.trim().toUpperCase() !== clientFilter.trim().toUpperCase()) {
        return false;
      }
      if (categoryFilter !== 'ALL' && tr.catergory.toUpperCase() !== categoryFilter.toUpperCase()) {
        return false;
      }
      if (!isDateInPeriod(tr.dateOfSubmission, dateFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          tr.transmittalNumber.toLowerCase().includes(q) ||
          tr.client.toLowerCase().includes(q) ||
          tr.projectName.toLowerCase().includes(q) ||
          tr.itemsTransmitted.toLowerCase().includes(q) ||
          tr.transmittedBy.toLowerCase().includes(q) ||
          tr.receivedBy.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [roleScopedTransmittals, clientFilter, categoryFilter, dateFilter, searchQuery]);

  // Filtered Work Orders
  const filteredWorkOrders = useMemo(() => {
    return roleScopedWorkOrders.filter((wo) => {
      if (clientFilter === 'CLIENT_EQUIPMENT') {
        if (!isClientEquipmentWorkOrder(wo.client)) return false;
      } else if (clientFilter === 'INTERNAL_ONLY') {
        if (!isInternalWorkOrder(wo.client)) return false;
      } else if (clientFilter !== 'ALL' && wo.client.trim().toUpperCase() !== clientFilter.trim().toUpperCase()) {
        return false;
      }
      if (statusFilter !== 'ALL') {
        const s = wo.status.trim().toUpperCase();
        const isClosed = s === 'CLOSED' || s === 'COMPLETED';
        const isCancelled = s.includes('CANCEL');
        const isOngoing =
          s.includes('ON-GOING') ||
          s.includes('ONGOING') ||
          s.includes('ON GOING') ||
          s.includes('IN PROGRESS') ||
          s.includes('IN-PROGRESS');
        const isNotStarted = s.includes('NOT STARTED') || s.includes('NOT YET STARTED');

        if (statusFilter === 'OPEN' && (isClosed || isCancelled || !s || s === 'UNKNOWN')) return false;
        else if (statusFilter === 'ON_GOING' && !isOngoing) return false;
        else if (statusFilter === 'NOT_STARTED' && !isNotStarted) return false;
        else if (statusFilter === 'CANCELLED' && !isCancelled) return false;
        else if (statusFilter === 'CLOSED' && !isClosed) return false;
        else if (
          statusFilter !== 'OPEN' &&
          statusFilter !== 'ON_GOING' &&
          statusFilter !== 'NOT_STARTED' &&
          statusFilter !== 'CANCELLED' &&
          statusFilter !== 'CLOSED' &&
          s !== statusFilter.toUpperCase()
        ) {
          return false;
        }
      }
      if (stationFilter !== 'ALL') {
        if (!wo.matchedEquipment || wo.matchedEquipment.station.toUpperCase() !== stationFilter.toUpperCase()) {
          return false;
        }
      }
      if (!isDateInPeriod(wo.dateIssued, dateFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          wo.workOrderNumber.toLowerCase().includes(q) ||
          wo.unitNumber.toLowerCase().includes(q) ||
          wo.client.toLowerCase().includes(q) ||
          wo.defect.toLowerCase().includes(q) ||
          wo.description.toLowerCase().includes(q) ||
          wo.assignedMechanic.toLowerCase().includes(q) ||
          (wo.matchedEquipment && wo.matchedEquipment.equipmentName.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [roleScopedWorkOrders, clientFilter, statusFilter, stationFilter, dateFilter, searchQuery]);

  // Calculate Dashboard KPIs with currently selected date period and role-scoped records
  const kpis = useMemo(() => {
    return calculateDashboardKPIs(equipment, inventory, roleScopedWorkOrders, roleScopedTransmittals, dateFilter);
  }, [equipment, inventory, roleScopedWorkOrders, roleScopedTransmittals, dateFilter]);

  // Drawer modal state for Database map
  const [isDatabaseSettingsOpen, setIsDatabaseSettingsOpen] = useState(false);

  const value: AppContextType = {
    activeTab,
    setActiveTab,
    deviceMode,
    setDeviceMode,
    personas,
    activePersona,
    setActivePersona,
    isAdmin,
    addPersona,
    updatePersona,
    removePersona,
    resetPersonas,
    isAccountManagerOpen,
    setIsAccountManagerOpen,
    isGoogleConnected: syncStatus === 'success' || syncStatus === 'partial' || hasValidToken() || !!googleUser,
    isTokenExpired: syncStatus === 'token_expired',
    isUsingCachedData,
    googleUser,
    isSyncingSheets,
    syncStatus,
    lastSyncTime,
    syncError,
    sourceStatuses,
    nextAutoRefreshIn,
    autoSyncEnabled,
    setAutoSyncEnabled,
    autoSyncIntervalSeconds,
    setAutoSyncIntervalSeconds,
    signInGoogle,
    signOutGoogle,
    refreshSheets,
    equipment,
    filteredEquipment,
    selectedEquipment,
    setSelectedEquipment,
    inventory,
    filteredInventory,
    selectedInventoryItem,
    setSelectedInventoryItem,
    transactions,
    filteredTransactions,
    transmittals: roleScopedTransmittals,
    filteredTransmittals,
    selectedTransmittal,
    setSelectedTransmittal,
    workOrders: roleScopedWorkOrders,
    filteredWorkOrders,
    selectedWorkOrder,
    setSelectedWorkOrder,
    kpis,
    searchQuery,
    setSearchQuery,
    stationFilter,
    setStationFilter,
    clientFilter,
    setClientFilter,
    statusFilter,
    setStatusFilter,
    materialTypeFilter,
    setMaterialTypeFilter,
    categoryFilter,
    setCategoryFilter,
    dateFilter,
    setDateFilter,
    resetAllFilters,
    activeFilterCount,
    workbookIds: WORKBOOK_IDS,
    workbookUrls: WORKBOOK_URLS,
    customLogoUrl,
    setCustomLogoUrl,
    resetCustomLogo,
    isDatabaseSettingsOpen,
    setIsDatabaseSettingsOpen,
    themeMode,
    toggleThemeMode,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
