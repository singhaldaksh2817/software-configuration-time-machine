/**
 * watcherService.js
 * Automatically watches project workspace directories for file changes
 * and commits them to Fossil SCM — making configuration management fully automatic.
 */
const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../database/db');
const fossilService = require('./fossilService');
const auditService = require('./auditService');

// Debounce delay in ms — wait this long after last change before committing
const DEBOUNCE_MS = 2000;

class WatcherService {
  constructor() {
    this._watchers = new Map(); // projectId -> { watcher, pending, debounceTimer }
    this._enabled = true;
  }

  /**
   * Enable or disable the entire watcher system (toggle via API).
   */
  setEnabled(enabled) {
    this._enabled = !!enabled;
    if (!this._enabled) {
      for (const [projectId] of this._watchers) {
        this.stopWatching(projectId);
      }
      console.log('[Watcher] Auto-commit watcher DISABLED.');
    } else {
      console.log('[Watcher] Auto-commit watcher ENABLED.');
      this.watchAllProjects();
    }
  }

  isEnabled() {
    return this._enabled;
  }

  /**
   * Start watching all projects currently in the database.
   */
  watchAllProjects() {
    if (!this._enabled) return;
    const db = getDatabase();
    const projects = db.prepare('SELECT * FROM projects').all();
    for (const project of projects) {
      this.watchProject(project);
    }
    console.log(`[Watcher] Watching ${projects.length} project workspace(s) for auto-commit.`);
  }

  /**
   * Start watching a single project's workspace directory.
   * @param {object} project - Project row from SQLite.
   */
  watchProject(project) {
    if (!this._enabled || process.env.NODE_ENV === 'test') return;
    if (this._watchers.has(project.id)) return; // Already watching

    const workspaceDir = project.workspace_path;
    if (!workspaceDir || !fs.existsSync(workspaceDir)) {
      console.warn(`[Watcher] Project ${project.name} workspace not found: ${workspaceDir}`);
      return;
    }

    const state = { pending: new Set(), debounceTimer: null };

    try {
      const watcher = fs.watch(workspaceDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        // Ignore Fossil internals and OS noise
        if (this._shouldIgnore(filename)) return;

        state.pending.add(filename.replace(/\\/g, '/'));
        this._scheduleCommit(project, state);
      });

      watcher.on('error', (err) => {
        console.warn(`[Watcher] Error watching project ${project.name}: ${err.message}`);
        this.stopWatching(project.id);
      });

      this._watchers.set(project.id, { watcher, state });
      console.log(`[Watcher] ▶ Now auto-watching: ${project.name} (${workspaceDir})`);
    } catch (err) {
      console.warn(`[Watcher] Could not start watcher for project ${project.name}: ${err.message}`);
    }
  }

  /**
   * Stop watching a project.
   * @param {number|string} projectId
   */
  stopWatching(projectId) {
    const entry = this._watchers.get(projectId);
    if (!entry) return;
    try {
      if (entry.state.debounceTimer) clearTimeout(entry.state.debounceTimer);
      entry.watcher.close();
    } catch (_) {}
    this._watchers.delete(projectId);
    console.log(`[Watcher] ■ Stopped watching project id=${projectId}`);
  }

  /**
   * Stop watching all projects.
   */
  stopAll() {
    for (const [projectId] of this._watchers) {
      this.stopWatching(projectId);
    }
  }

  /**
   * Reload watchers for a newly created project.
   * @param {object} project
   */
  addProject(project) {
    this.watchProject(project);
  }

  /**
   * Get watcher status for the system status endpoint.
   */
  getStatus() {
    const entries = [];
    for (const [projectId, { state }] of this._watchers) {
      entries.push({ projectId, pendingFiles: [...state.pending] });
    }
    return {
      enabled: this._enabled,
      watchedProjects: this._watchers.size,
      projects: entries
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Schedule a debounced auto-commit for changed files.
   */
  _scheduleCommit(project, state) {
    if (state.debounceTimer) clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => this._doAutoCommit(project, state), DEBOUNCE_MS);
    if (state.debounceTimer.unref) state.debounceTimer.unref();
  }

  /**
   * Perform the actual Fossil add + commit for changed files.
   */
  async _doAutoCommit(project, state) {
    const changedFiles = [...state.pending];
    state.pending.clear();
    state.debounceTimer = null;

    if (changedFiles.length === 0) return;

    try {
      // Re-fetch project to get latest workspace_path
      const db = getDatabase();
      const freshProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id);
      if (!freshProject) return;

      const fileSummary = changedFiles.length === 1
        ? changedFiles[0]
        : `${changedFiles.length} files (${changedFiles[0]}, ...)`;

      const commitMessage = `[Auto-Commit] File change detected: ${fileSummary}`;
      const user = 'AutoWatcher';

      console.log(`[Watcher] ⚡ Auto-committing changes in project "${freshProject.name}": ${changedFiles.join(', ')}`);

      await fossilService.addFiles(freshProject.workspace_path, changedFiles);
      const result = await fossilService.commit(freshProject.workspace_path, commitMessage, user);

      // Update project's current revision in SQLite
      if (result.revision) {
        db.prepare('UPDATE projects SET current_revision = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(result.revision, freshProject.id);
      }

      // Upsert into configuration_items so UI reflects all auto-added files
      for (const relFile of changedFiles) {
        const cleanPath = relFile.replace(/\\/g, '/');
        const ext = path.extname(cleanPath).replace(/^\./, '').toLowerCase() || 'text';
        const name = path.basename(cleanPath);
        const existing = db.prepare('SELECT id FROM configuration_items WHERE project_id = ? AND path = ?').get(freshProject.id, cleanPath);
        if (existing) {
          db.prepare('UPDATE configuration_items SET current_version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(result.revision || 'HEAD', existing.id);
        } else {
          db.prepare(`
            INSERT INTO configuration_items (project_id, name, path, file_type, description, current_version, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(freshProject.id, name, cleanPath, ext, 'Auto-tracked workspace file', result.revision || 'HEAD', user, user);
        }
      }

      // Audit log
      auditService.log(
        freshProject.id, user, 'AUTO_COMMIT',
        changedFiles.join(', '), 'Success', result.revision || 'HEAD',
        { files: changedFiles, autoCommit: true }
      );

      console.log(`[Watcher] ✔ Auto-commit done for "${freshProject.name}" → revision ${result.revision || 'HEAD'}`);
    } catch (err) {
      console.error(`[Watcher] ✖ Auto-commit failed for project "${project.name}": ${err.message}`);
    }
  }

  /**
   * Returns true if this filename should be ignored (Fossil internal, temp files, etc.)
   */
  _shouldIgnore(filename) {
    const base = path.basename(filename);
    const ignorePatterns = [
      /^_FOSSIL_/i,
      /^\._FOSSIL_/i,
      /\.fossil/i,
      /\.fslckout/i,
      /__FOSSIL__/i,
      /\.tmp$/i,
      /~$/,
      /\.swp$/i,
      /\.lock$/i,
      /^\.#/,
      /node_modules/i,
    ];
    return ignorePatterns.some(p => p.test(base) || p.test(filename));
  }
}

module.exports = new WatcherService();
