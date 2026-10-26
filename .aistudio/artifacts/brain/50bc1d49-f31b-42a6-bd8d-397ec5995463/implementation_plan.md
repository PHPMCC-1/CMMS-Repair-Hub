# Implementation Plan: Persistent Google Sheets Data Snapshot with Private OAuth Sign-In

## Goal
Enable the PHP Repair Hub Maintenance Command Center to retain and display your fixed Google Sheets workbooks indefinitely across page reloads and after the 1-hour Google OAuth token expiration, while keeping private Google OAuth (`spreadsheets.readonly`) sign-in for syncing fresh changes.

---

## Key Capabilities & UX Flow

1. **Local Persistent Snapshot Storage (`src/services/sheetsCacheService.ts`)**
   - Automatically save every successful (or partial) Google Sheets ingestion result (`equipment`, `inventory`, `transactions`, `transmittals`, `workOrders`, `sourceStatuses`, and `syncedAt` timestamp) to `localStorage` under a versioned key (`php_repairhub_sheets_snapshot_v1`).
   - Re-link `workOrder.matchedEquipment` references upon hydrating cached snapshots so all station filters, unit profiles, and per-unit MTBF/MTTR reliability calculations work seamlessly without a live network call.
   - Clear the cached snapshot only when the user explicitly clicks **Sign Out** (or adds a manual "Clear Cache" action in the Sheets menu), never when an OAuth access token expires.

2. **Uninterrupted Dashboard & KPI Availability (`src/context/AppContext.tsx`)**
   - **On App Load / Page Reload**: Immediately hydrate `equipment`, `inventory`, `transactions`, `transmittals`, `workOrders`, `sourceStatuses`, and `lastSyncTime` from the local snapshot if present. All views (Home, GSE Units, Per-Unit MTBF & MTTR, Work Orders, Materials and Inventory, Transmittals) and KPIs render immediately with the last synced data.
   - **When OAuth Token Expires (60m boundary or 401 response)**:
     - Still invalidate the expired in-memory OAuth token and stop the 5-minute background polling timer (preventing 401 loops).
     - **Preserve all loaded/cached sheet data in state** instead of wiping arrays to `[]`.
     - Expose a clear `isUsingCachedData: boolean` flag alongside `lastSyncTime` so the UI indicates that figures are displaying the last synced snapshot (`Last synced: <timestamp>`) and offers a non-blocking **Reconnect Google to Sync Latest** button.

3. **Non-Disruptive Status Indicators (`src/components/layout/Navbar.tsx` & `src/components/home/HomeView.tsx`)**
   - **Top Navbar**:
     - When live OAuth is active: Show `Sheets (Live · Synced <time>)` with 5-minute auto-sync active.
     - When OAuth token has expired but cached sheet data is loaded: Show a subtle `Cached Snapshot · Reconnect to Sync` badge and button in the top bar and Sheets dropdown, rather than treating the app as disconnected/empty.
   - **Home & Module Views**:
     - Replace the full-width blocking warning banner when cached data is already available with a compact, business-clean notice bar showing the last sync timestamp and a one-click **Sync Latest with Google** action.
     - Show the full Sign-In card only on a brand-new browser/device that has neither an active OAuth session nor a cached snapshot.

---

## Files to Create / Modify

- **`/src/services/sheetsCacheService.ts` (New)**:
  - `saveSheetsSnapshot(result: IngestionResult): void`
  - `loadSheetsSnapshot(): IngestionResult | null`
  - `clearSheetsSnapshot(): void`
- **`/src/context/AppContext.tsx`**:
  - Hydrate domain state from `loadSheetsSnapshot()` on initialization.
  - Persist fresh data via `saveSheetsSnapshot(result)` inside `executeIngest`.
  - Keep cached domain data intact on `token_expired` or page reload when a snapshot exists; add `isUsingCachedData` state.
  - Clear snapshot on explicit `signOutGoogle()`.
- **`/src/components/layout/Navbar.tsx`**:
  - Update the Sheets dropdown and status button to distinguish between **Live Sync Active**, **Cached Snapshot (Reconnect to Sync)**, and **Not Connected**.
- **`/src/components/home/HomeView.tsx` & `/src/components/fleet/FleetView.tsx`**:
  - Keep all KPI cards, GSE Unit Overview boards, and tables populated when operating from the cached snapshot, with a compact header/banner action to refresh via Google OAuth when desired.

---

## Verification Plan
1. Run `lint_applet` and `compile_applet` to verify zero TypeScript or build errors.
2. Verify that after signing in once, reloading the page or letting the OAuth token expire preserves all GSE units, Work Orders, Per-Unit MTBF/MTTR metrics, Materials and Inventory, and Transmittals indefinitely until the user chooses to sync again or sign out.
