# Software Configuration Time Machine

> **A Baseline and Configuration Evolution Management System**

An academic, production-grade Software Configuration Management (SCM) platform featuring a visual "time machine" for tracking, auditing, comparing, and rolling back software configurations.

Powered by **Fossil SCM** as the true version-control engine, **SQLite** for application metadata, **Node.js/Express** for REST APIs, and **React + Tailwind CSS** with a distinctive archival laboratory console interface.

---

## Key Features

- **Genuine Fossil SCM Version Engine**: Real cryptographic check-ins, commit trees, tags, timelines, and diffs (no fake JSON mockups).
- **Interactive Time Machine**: Chronological timeline scrubber with milestone nodes, baseline badges, and snapshot inspections.
- **Baseline Management**: Establish named baselines (e.g., `B-001: Production Release 1.0`), tag revisions in Fossil, and lock stable states.
- **Configuration Drift Detection**: Automatically detects modified, added, or deleted configuration items against an active baseline.
- **Code Diff Viewer**: Side-by-side and unified diffs with line numbers, syntax styling, and addition/deletion counters.
- **Safe SCM Rollback**: Non-destructive forward check-ins restoring historical configurations with an auditable trail.
- **Change Control (CR)**: Track formal change requests (`CR-101`) linked directly to resulting Fossil check-in hashes.
- **Audit Trail & Integrity**: Immutable logs recording user, timestamp, action, target, and revision hash.
- **Archival Visual Identity**: Custom dark console palette (`#101416`, `#D69A4A` amber-copper, `#4FA7A0` teal) with three switchable themes (*Archive Dark*, *Obsidian Teal*, *Warm Light*).
- **CI/CD & Docker Ready**: Declarative `Jenkinsfile` and multi-stage `Dockerfile` with persistent Fossil repository volumes.

---

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Lucide React, Recharts
- **Backend**: Node.js, Express.js, REST API
- **SCM Engine**: Fossil SCM (v2.28+)
- **Database**: SQLite (`node:sqlite` / SQLite3)
- **CI/CD**: Jenkins Pipeline (`Jenkinsfile`)
- **Containerization**: Docker, Docker Compose

---

## Directory Structure

```text
software-configuration-time-machine/
├── client/                     # React + Vite frontend console
│   ├── src/
│   │   ├── components/         # Layout, DiffViewer, TimeMachineScrubber, Modals
│   │   ├── context/            # AuthContext, ThemeContext, ToastContext
│   │   ├── pages/              # Dashboard, Projects, ProjectDetail, TimeMachine, etc.
│   │   └── services/           # REST API client
├── server/                     # Node.js + Express backend
│   ├── src/
│   │   ├── config/             # Environment & path configs
│   │   ├── database/           # SQLite schema init & demo seed script
│   │   ├── services/           # fossilService, baselineService, driftService, rollbackService
│   │   ├── controllers/        # Project, SCM, Baseline, Change, Audit controllers
│   │   └── routes/             # RESTful API routing
│   └── tests/                  # Automated SCM backend test suite
├── docs/                       # ARCHITECTURE.md & SCM_WORKFLOW.md
├── Dockerfile                  # Multi-stage production container with Fossil
├── docker-compose.yml          # Container orchestrator with persistent volume
├── Jenkinsfile                 # CI/CD declarative pipeline
└── README.md                   # Project documentation
```

---

## Prerequisites

1. **Node.js**: v18.0+ (Node v20+ recommended)
2. **Fossil SCM**:
   - **Windows**: Installed via winget (`winget install Fossil.Fossil`) or downloaded from [fossil-scm.org](https://fossil-scm.org/).
   - **Linux / macOS**: `sudo apt-get install fossil` or `brew install fossil`.
   - The server automatically detects Fossil in `PATH`, Winget packages, or via `FOSSIL_PATH` in `.env`.

---

## Quick Start (Local Run)

### 1. Install Dependencies

```bash
# In the server directory
cd server
npm install

# In the client directory
cd ../client
npm install
```

### 2. Seed Academic Demo Project

This populates the system with "E-Commerce Platform" including microservice configurations (`application.yml`, `database.yml`, `nginx.conf`, `docker-compose.yml`), real Fossil check-ins, baselines, and change requests:

```bash
cd server
npm run seed
```

### 3. Run Automated SCM Tests

Verify Fossil detection, repository initialization, commits, baseline tagging, drift detection, and safe rollbacks:

```bash
cd server
npm test
```

### 4. Start the Application

You can start the backend and frontend concurrently:

```bash
# Terminal 1: Start Backend Server (port 5000)
cd server
npm start

# Terminal 2: Start Frontend Development Server (port 3000)
cd client
npm run dev
```

Open your browser and navigate to **http://localhost:3000** (or **http://localhost:5000** if built).

---

## Running with Docker

The application includes full Docker and Docker Compose support with persistent volume mounts for Fossil repositories:

```bash
docker compose up --build
```

The application will be accessible at **http://localhost:5000**. All Fossil `.fossil` repositories and SQLite database records persist across container restarts via the `scm_fossil_data` volume.

---

## Jenkins CI/CD Pipeline

A complete `Jenkinsfile` is provided with the following stages:
1. **Source Preparation**: Pulls code repository.
2. **Install Dependencies**: Installs server and client packages cleanly (`npm ci`).
3. **Run Tests**: Executes the automated SCM test suite (`npm test`).
4. **Build Frontend**: Compiles React assets with Vite (`npm run build`).
5. **Smoke Test & Seed**: Verifies database seeding and Fossil check-in mechanics.
6. **Docker Build**: Builds production container image.
7. **Health Validation**: Validates container inspection and health check readiness.

---

## SCM Concepts Demonstrated

- **Configuration Identification**: Dedicated workspace tracking of configuration items.
- **Version Control**: Cryptographic Fossil check-ins and revision trees.
- **Baseline Management**: Frozen milestones tagged with `baseline-B001`.
- **Change Control**: Structured Change Requests (`CR-101`) linked to revisions.
- **Configuration Status Accounting (CSA)**: Real-time dashboard and timeline status.
- **Configuration Auditing**: Immutable audit logs capturing every operation.
- **Configuration Drift**: Automatic differential comparison against baselines.
- **Rollback**: Safe, non-destructive forward check-ins restoring historical states.
