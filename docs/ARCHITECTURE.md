# System Architecture — Software Configuration Time Machine

## 1. Executive Summary

**Software Configuration Time Machine** is an enterprise-grade Software Configuration Management (SCM) platform designed to track, audit, compare, visualize, and restore software configurations over time.

Unlike superficial admin prototypes, this application implements a strict dual-engine architecture:
- **Fossil SCM Engine**: Acts as the primary version-control and artifact-history backend. Every configuration change is a true, cryptographic check-in. Line-level differences, timelines, tags, and rollbacks are executed by Fossil.
- **SQLite Metadata Engine**: Maintains relational business entities such as projects, users, baselines, formal change requests (CRs), audit trail logs, and system health status.

---

## 2. High-Level Architectural Diagram

```
+-----------------------------------------------------------------------+
|                 Frontend: React 18 + Vite + Tailwind CSS              |
|        (Archival Lab UI, Unified/Side-by-Side Diff, Recharts)         |
|        Themes: Archive Dark (#101416 / #D69A4A), Obsidian, Light     |
+-----------------------------------^-----------------------------------+
                                    | REST API (JSON)
+-----------------------------------v-----------------------------------+
|                     Backend: Node.js + Express.js                     |
|                                                                       |
|   +--------------------------+       +----------------------------+   |
|   |   SQLite Database        |       |   Fossil SCM Service       |   |
|   |   (node:sqlite / WAL)    |       |   (Safe child_process      |   |
|   |                          |       |    execFile execution)     |   |
|   +--------------------------+       +----------------------------+   |
|   | • Projects metadata      |       | • fossil init & open       |   |
|   | • Users & session state  |       | • fossil add & commit      |   |
|   | • SCM Baselines (B-001)  |       | • fossil timeline -v       |   |
|   | • Change Requests (CR)   |       | • fossil diff (unified/sbs)|   |
|   | • Tamper-evident Audit   |       | • fossil revert & cat      |   |
|   | • Settings & Preferences |       | • fossil tag add           |   |
|   +--------------------------+       +--------------^-------------+   |
+-----------------------------------------------------|-----------------+
                                                      |
                                       +--------------v-------------+
                                       |      Fossil SCM Binary     |
                                       |   (.fossil repository files|
                                       |    + workspace checkouts)  |
                                       +----------------------------+
```

---

## 3. Separation of Responsibilities

| Responsibility Area | Handled By | Details |
| :--- | :--- | :--- |
| **Artifact Versioning** | **Fossil SCM** | Real SHA-1/SHA-3 cryptographic check-ins, commit trees, branches, parent-child links. |
| **Diff Generation** | **Fossil SCM** | Unified diff, side-by-side comparison, numstat line count metrics. |
| **State Restoration** | **Fossil SCM** | Safe `fossil revert -r <rev>` workflow creating an auditable forward commit. |
| **Baseline Tagging** | **Fossil SCM + SQLite** | Tagged in Fossil (`baseline-B001`) and indexed in SQLite with metadata (Active, Approved). |
| **Change Control** | **SQLite** | Change request workflow (Requested -> Under Review -> Approved -> Implemented -> Rolled Back). |
| **Auditing & History** | **SQLite** | Immutable event logs capturing user, timestamp, action, target, and revision hash. |
| **CI/CD Automation** | **Jenkins** | Declarative pipeline executing tests, builds, and container verification. |
| **Containerization** | **Docker** | Multi-stage image with persistent volume for Fossil repository files. |

---

## 4. Fossil SCM Integration & Security Model

Fossil commands are executed strictly through Node's `child_process.execFile` API. This architecture:
1. **Prevents Shell Injection**: Never concatenates user strings into shell commands. Arguments are passed as an isolated array of strings.
2. **Sanitizes Paths**: Normalizes and confines all file paths within the project's workspace directory (`data/workspaces/<slug>`), preventing directory traversal attacks.
3. **Avoids Destructive Rollbacks**: When reverting to an ancestor revision, the workspace files are reverted and checked in as a new forward commit (`Rollback configuration to revision [XYZ]`). This guarantees that history is never silently lost or rewritten.
