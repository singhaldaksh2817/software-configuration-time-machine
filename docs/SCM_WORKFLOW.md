# Software Configuration Management (SCM) Workflow Guide

This document explains how fundamental Software Configuration Management (SCM) concepts are practically realized in the **Software Configuration Time Machine**.

---

## 1. Configuration Identification

### Concept
Identifying and defining the configuration items (CIs) that make up a system and establishing a schema for their unique naming and versioning.

### Implementation
- Every configuration artifact (`application.yml`, `database.conf`, `nginx.conf`, `docker-compose.yml`) is registered in SQLite with metadata (file type, description, author) and stored as a tracked file in a dedicated Fossil workspace.
- The project repository (`<slug>.fossil`) serves as the authoritative Configuration Management Database (CMDB) container.

---

## 2. Version Control (Fossil SCM)

### Concept
Maintaining an immutable, cryptographic record of all revisions, authors, messages, and parentage over time.

### Implementation
- Adding or modifying a configuration item immediately triggers `fossil add <file>` and `fossil commit -m "<msg>" --user "<author>"`.
- Fossil generates a cryptographic check-in hash (`New_Version: 9a4cc4401e...`).
- The revision timeline (`fossil timeline -v`) provides the historical backbone for the visual Time Machine.

---

## 3. Baseline Management

### Concept
A baseline represents a formally reviewed, approved, and frozen configuration state from which further changes may proceed.

### Implementation
- Users establish baselines (e.g. `B-001: Production Release 1.0`) targeting a specific Fossil check-in.
- The system applies a formal tag in Fossil:
  ```bash
  fossil tag add baseline-B001 <revision>
  ```
- The baseline is registered in SQLite with statuses: `Active`, `Approved`, `Archived`, or `Superseded`.

---

## 4. Change Control & Change Requests (CRs)

### Concept
A structured process to propose, review, approve, implement, and track modifications to configuration items.

### Implementation
- Users submit formal Change Requests (`CR-101`, `CR-102`) specifying title, technical justification, priority, and affected files.
- CRs progress through states:
  `Requested` -> `Under Review` -> `Approved` -> `Implemented` -> `Rolled Back`.
- Upon implementation, the CR record is linked directly to the resulting Fossil check-in hash.

---

## 5. Configuration Status Accounting (CSA)

### Concept
Recording and reporting the status of configuration items and change requests throughout their lifecycle.

### Implementation
- The **Main Dashboard** and **Project Workspace** aggregate real-time metrics:
  - Current HEAD revision
  - Active baseline designation
  - Total historical revisions
  - Change request status distribution charts
  - Recent check-in frequency

---

## 6. Configuration Drift Detection

### Concept
Detecting unauthorized, accidental, or out-of-band modifications made to configuration items relative to an established baseline.

### Implementation
- The Drift Engine runs `fossil diff --unified -r <baseline_revision>` against the current workspace state.
- Classifies each file into:
  - `UNCHANGED`: File matches baseline exactly.
  - `MODIFIED`: File has drifted (calculates lines added/deleted).
  - `ADDED`: Unexpected configuration artifact present in workspace.
  - `DELETED`: Configuration item tracked in baseline is missing.

---

## 7. Configuration Auditing & Tamper-Evident Logging

### Concept
Verifying that configurations conform to requirements and that every action taken on the system is attributed.

### Implementation
- Every SCM operation (`PROJECT_CREATED`, `CONFIG_MODIFIED`, `BASELINE_CREATED`, `CONFIGURATION_ROLLBACK`, `USER_LOGIN`) writes an immutable record to the `audit_logs` table.
- Logs capture timestamp, user, action name, target file/project, result status, and SCM revision hash.

---

## 8. Safe Configuration Rollback

### Concept
Restoring an earlier proven configuration state without compromising history or causing repository corruption.

### Implementation
1. **Safety Preview**: System compares current HEAD against target revision, listing all affected files and diffs.
2. **Reversion**: Executes `fossil revert -r <target_revision> [files...]`.
3. **Forward Commit**: Commits the restored state as a new forward check-in in Fossil:
   ```text
   Rollback configuration to revision [XYZ]. Reason: <auditable reason>
   ```
4. **Audit**: Logs the rollback event with previous revision, restored revision, and executor name.
