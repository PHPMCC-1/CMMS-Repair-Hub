# PHP Repair Hub — Enterprise GSE Maintenance & Fleet Management

A high-performance Ground Support Equipment (GSE) fleet management, maintenance tracking, material transmittals, and reliability engineering dashboard for PHP Repair Hub.

## 🚀 Key Features

- **GSE Masterlist & Fleet Directory**: Real-time status, unit identification, AMA plates, Data plates, reference unit photos, station tracking, and mechanic assignments.
- **Reliability & KPI Engine**: Real-time computation of MTBF (Mean Time Between Failures), MTTR (Mean Time to Repair), fleet availability percentage, and active downtime.
- **Work Orders Tracking**: End-to-end work order tracking (RH-0001 through unbounded future work orders) with defect descriptions, parts issued, and completion statuses.
- **Client vs. Internal Segregation**: Automatic access control where any equipment or work order not marked "Internal" is treated as Client Equipment.
- **Material Inventory & Transmittals**: Multi-tab tracking for warehouse inventory, transaction receipts, and transmittal records.
- **Continuous Background Auto-Sync**: Multi-transport synchronization with Google Sheets (authenticated Sheets v4 API with graceful fallback to read-only live Google Visualization CSV and local snapshot persistence).
- **Responsive Enterprise Grid**: Day & Night themes with flexible viewport adaptation for Desktop, Tablet, and Mobile displays.

---

## 🛠️ Prerequisites

- **Node.js**: Version 18.x or 20.x or higher recommended
- **Package Manager**: `npm` (v9+), `pnpm`, `yarn`, or `bun`

---

## 📦 Installation & Setup

1. **Extract and Navigate to Directory**:
   ```bash
   cd php-repair-hub
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables & Firebase**:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - If using Google OAuth sign-in, copy `firebase-applet-config.example.json` to `firebase-applet-config.json` and insert your Firebase & Google OAuth credentials:
     ```bash
     cp firebase-applet-config.example.json firebase-applet-config.json
     ```
     *(Note: The app will run and synchronize with public Google Sheets even without custom Firebase credentials!)*

---

## 💻 Local Run Commands

### Development Server
Starts the local development server on `http://localhost:3000` with hot module reloading:
```bash
npm run dev
```

### Type Checking & Linting
Validates TypeScript types and checks for compile issues:
```bash
npm run lint
```

### Production Build
Compiles and bundles the application for production deployment into the `dist/` directory:
```bash
npm run build
```

### Preview Production Build
Locally preview the built application:
```bash
npm run preview
```

---

## 📁 Project Structure

```
├── public/                     # Static assets and media
│   └── assets/
│       ├── php_repair_hub_logo.svg
│       └── aistudio/           # Reference photos & plates
├── src/
│   ├── components/             # UI Components
│   │   ├── accounts/           # User persona & client management
│   │   ├── common/             # Badges, filters, photo modals
│   │   ├── fleet/              # GSE Masterlist directory & detail views
│   │   ├── home/               # Executive dashboard & KPIs
│   │   ├── layout/             # Top navbar, drawer menus, header widgets
│   │   ├── materials/          # Inventory & transactions
│   │   ├── performance/        # Reliability, MTBF, MTTR & Work Orders
│   │   ├── sheets/             # Google Sheets sync & diagnostic status
│   │   └── transmittals/       # Transmittal records & receipts
│   ├── context/
│   │   └── AppContext.tsx      # Central state, filters, auto-sync orchestration
│   ├── data/
│   │   └── staticOverviewPhotos.ts # Curated unit & plate image mappings
│   ├── services/
│   │   ├── googleAuth.ts       # Google OAuth client & token manager
│   │   ├── sheetsCacheService.ts # Local snapshot persistence
│   │   └── unifiedSheetsService.ts # Google Sheets v4 API & CSV fallback parser
│   ├── types/
│   │   ├── index.ts            # User persona & navigation types
│   │   └── unifiedSheets.ts    # Domain schemas & equipment definitions
│   ├── utils/
│   │   └── kpiCalculator.ts    # MTBF, MTTR, availability algorithms
│   ├── App.tsx                 # Root application routing
│   ├── index.css               # Tailwind CSS styles & themes
│   └── main.tsx                # Entry mount point
├── .env.example                # Sample environment configuration
├── firebase-applet-config.example.json # Firebase & OAuth client template
├── index.html                  # HTML entry point
├── package.json                # Project dependencies and scripts
├── tsconfig.json               # TypeScript compiler configuration
└── vite.config.ts              # Vite bundler & Tailwind configuration
```

---

## 🔒 Security & Privacy Notice
All credentials, tokens, and secrets have been stripped from this package. Configure your own API keys in `.env` and `firebase-applet-config.json` before deploying to production.
