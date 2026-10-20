# Website X-Ray

An AI-assisted developer platform designed to observe and reverse-engineer public websites and supported software internals (via REA MCP), generating evidence-backed specifications and clean, original implementations of selected features.

---

## 1. Key Capabilities

- **Mode A: Website Interface Analysis**:
  - Isolated Playwright browser inspection capturing page titles, viewports, semantic layout structures, headings, navigation links, and controls.
  - Viewport screenshots with side-by-side visual comparison and overlay blend controls.
  - Sanitized DOM extraction with automatic redaction of JWTs, Bearer tokens, passwords, and sensitive headers.
- **Mode B: REA-Assisted Software Analysis**:
  - Verified JSON-RPC 2.0 client for the Model Context Protocol (MCP).
  - Dynamic discovery of exposed tools (`tools/list`).
  - Transparent execution logs and honest connection telemetry (no fabricated reverse-engineering results when offline).
- **AI-Powered & Heuristic Feature Studio**:
  - Multi-provider AI abstraction supporting Google Gemini, OpenAI, and Anthropic.
  - Zero-key deterministic DOM heuristic analyzer for immediate offline use without external API credentials.
  - Structured engineering specifications: user stories, functional requirements, component outlines, accessibility (WCAG 2.1 AA), and acceptance criteria.
- **SSRF Hardening**:
  - Mandatory pre-flight URL validation blocking private IPv4/IPv6 subnets, loopbacks (`127.0.0.1`, `::1`), link-local metadata (`169.254.169.254`), and cloud internal hosts.
  - Scheme restrictions (only HTTP/HTTPS) and port allowlisting.
- **Persistent Relational Records**:
  - Full project lifecycle stored in PostgreSQL or SQLite using Prisma ORM.
  - Exportable audit and implementation reports in Markdown and JSON formats.

---

## 2. Architecture Overview

```
src/
├── app/
│   ├── page.tsx                     # Landing page with interactive URL inspection form
│   ├── layout.tsx                   # Master layout with navigation and system telemetry
│   ├── dashboard/                   # Dashboard with project metrics, REA & AI status
│   ├── projects/
│   │   ├── new/                     # Project creation form with SSRF verification
│   │   └── [id]/                    # Multi-panel workspace (10 functional tabs)
│   └── api/
│       ├── projects/                # CRUD endpoints & metadata telemetry
│       │   └── [id]/analyze/        # Execution pipeline runner
│       ├── jobs/[id]/               # Analysis job polling & logs
│       ├── rea/                     # REA MCP connection probe & tool executor
│       └── features/[id]/           # Specification generator & test runner
├── components/
│   ├── Navbar.tsx                   # Top navigation with live REA & AI badges
│   ├── StatusBadge.tsx              # Colored status tags
│   └── workspace/                   # Workspace tab implementations:
│       ├── OverviewTab.tsx          # Real-time pipeline execution logs & telemetry
│       ├── PagesTab.tsx             # Inspected page records & viewport metadata
│       ├── ScreenshotsTab.tsx       # Captured viewport gallery
│       ├── FeaturesTab.tsx          # Filterable feature explorer linked to evidence
│       ├── EvidenceTab.tsx          # Sanitized DOM & screenshot evidence viewer
│       ├── ArchitectureTab.tsx      # Observable architecture graph & boundaries
│       ├── ImplementationTab.tsx    # Specification generator & task package exporter
│       ├── TestsTab.tsx             # Side-by-side visual diff & behavioural checklist
│       ├── ReportsTab.tsx           # Exportable Markdown & JSON reports
│       └── SettingsTab.tsx          # Project metadata & permanent deletion
└── lib/
    ├── db.ts                        # Prisma client singleton
    ├── security/
    │   ├── ssrf.ts                  # SSRF validator with DNS resolution checks
    │   └── sanitizer.ts             # HTML sanitizer & secret redactor
    ├── browser/
    │   └── inspector.ts             # Playwright runner & resilient HTTP fallback
    ├── rea/
    │   └── client.ts                # Real MCP JSON-RPC service & tool enumerator
    └── ai/
        └── provider.ts              # Multi-provider LLM abstraction & heuristics
```

---

## 3. Getting Started (Windows PowerShell)

### Prerequisites
- Node.js 18+ (tested on Node.js v22.15.0)
- npm 9+ (tested on npm 10.9.2)

### Step 1: Clone & Install Dependencies
```powershell
cd c:\Users\eklav\Downloads\rea
npm install
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

Website X-Ray comes pre-configured with a zero-setup local SQLite database (`DATABASE_URL="file:./dev.db"`), allowing immediate execution without spinning up external servers.

### Step 3: Initialize Database Schema & Seed Data
```powershell
# Sync database schema
npm run db:push

# (Optional) Seed with a reference documentation portal audit project
npm run db:seed
```

### Step 4: Start the Development Server
```powershell
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Database Setup: PostgreSQL & Docker Compose

To run with PostgreSQL instead of the default local SQLite:

1. **Start PostgreSQL Container**:
   ```powershell
   docker compose up -d
   ```
2. **Switch Prisma Schema to PostgreSQL**:
   ```powershell
   npm run db:use-postgres
   ```
3. **Update `.env`**:
   ```ini
   DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/website_xray?schema=public"
   ```
4. **Push Schema & Migrate**:
   ```powershell
   npm run db:push
   ```
*(To switch back to zero-config SQLite at any time, run `npm run db:use-sqlite`)*.

---

## 5. REA MCP Server Integration

Website X-Ray includes an integration service supporting the **Model Context Protocol (MCP)**.

1. Set in `.env`:
   ```ini
   REA_MCP_ENABLED="true"
   REA_MCP_URL="http://127.0.0.1:8000/sse"   # Or your running REA MCP endpoint
   REA_MCP_TOKEN=""                         # Optional bearer token
   ```
2. When configured, Website X-Ray dynamically queries `tools/list` on the server and displays available tools in the Dashboard and Workspace.
3. If the server is offline or unreachable, Website X-Ray gracefully indicates `REA: OFFLINE` and runs the website interface analysis independently.

---

## 6. AI Configuration

AI keys are optional. When no key is provided, Website X-Ray utilizes a deterministic DOM heuristic analyzer to extract features and generate specifications without network requests to external AI providers.

To enable live LLMs, configure any of the following in `.env`:
```ini
# Google Gemini
GEMINI_API_KEY="AIzaSy..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."
```

---

## 7. Running Tests & Production Build

### Unit & Security Tests
Tests verify SSRF protections, private IP detection, HTML credential redaction, AI extraction schemas, and REA fallback mechanisms:
```powershell
npm test
```

### Production Build
```powershell
npm run build
npm start
```

---

## 8. Responsible Use & Limitations

- **Authorized Inspection Only**: Website X-Ray is intended solely for security research, architecture documentation, and clean-room implementation of public or authorized software targets.
- **Observation Boundaries**: Does not bypass CAPTCHAs, authentication barriers, or paywalls.
- **Backend Inferences**: Backend databases and server logic are explicitly labelled as unverified assumptions derived from client interface cues.
