/**
 * schedulerService.js
 * Runs periodic background jobs:
 *   - Drift detection scan (every 15 min)
 *   - Jenkins webhook trigger (after commits, if configured)
 * Uses only Node built-ins — no external cron library needed.
 */
const { getDatabase } = require('../database/db');
const driftService = require('./driftService');
const auditService = require('./auditService');
const config = require('../config');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const DRIFT_SCAN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

class SchedulerService {
  constructor() {
    this._driftTimer = null;
    this._enabled = true;
    this._lastScan = null;
    this._lastResults = [];
  }

  /**
   * Start all background jobs.
   */
  start() {
    if (!this._enabled) return;
    this._runDriftScan(); // immediate first scan
    this._driftTimer = setInterval(() => this._runDriftScan(), DRIFT_SCAN_INTERVAL_MS);
    console.log(`[Scheduler] ▶ Drift detection scheduled every ${DRIFT_SCAN_INTERVAL_MS / 60000} minutes.`);
  }

  /**
   * Stop all scheduled jobs.
   */
  stop() {
    if (this._driftTimer) {
      clearInterval(this._driftTimer);
      this._driftTimer = null;
    }
    console.log('[Scheduler] ■ Background scheduler stopped.');
  }

  setEnabled(enabled) {
    this._enabled = !!enabled;
    if (!this._enabled) this.stop();
    else this.start();
  }

  isEnabled() { return this._enabled; }

  /**
   * Status for the /api/system/automation endpoint.
   */
  getStatus() {
    return {
      enabled: this._enabled,
      driftScanIntervalMinutes: DRIFT_SCAN_INTERVAL_MS / 60000,
      lastScan: this._lastScan,
      lastResults: this._lastResults
    };
  }

  /**
   * Trigger a Jenkins pipeline build via HTTP POST.
   * Called after every Fossil commit if JENKINS_URL is configured.
   * @param {string} jobName - Jenkins job name (URL-encoded by caller if needed)
   * @param {string} token   - Jenkins build trigger token
   */
  async triggerJenkinsBuild(jobName, token) {
    if (!config.JENKINS_URL) return;
    const urlStr = `${config.JENKINS_URL}/job/${encodeURIComponent(jobName)}/build?token=${token}`;
    return this._httpPost(urlStr, {});
  }

  // ── Private ────────────────────────────────────────────────────────────────

  async _runDriftScan() {
    const db = getDatabase();
    const projects = db.prepare('SELECT * FROM projects').all();
    const results = [];

    console.log(`[Scheduler] ⏰ Running scheduled drift scan for ${projects.length} project(s)...`);

    for (const project of projects) {
      try {
        const drift = await driftService.detectDrift(project.id);
        const hasDrift = drift.status === 'DRIFT_DETECTED';

        results.push({
          projectId: project.id,
          projectName: project.name,
          status: drift.status,
          driftCount: drift.summary ? drift.summary.driftCount : 0
        });

        if (hasDrift) {
          // Log to audit table so the frontend can display scheduled scan results
          auditService.log(
            project.id,
            'Scheduler',
            'DRIFT_SCAN',
            `Baseline: ${drift.baseline ? drift.baseline.code : 'N/A'}`,
            `DRIFT_DETECTED: ${drift.summary.driftCount} item(s) changed`,
            drift.baseline ? drift.baseline.revision : null,
            { scheduledScan: true, summary: drift.summary }
          );
          console.log(`[Scheduler]   ⚠ DRIFT in "${project.name}": ${drift.summary.driftCount} item(s) changed`);
        } else if (drift.status === 'IN_SYNC') {
          console.log(`[Scheduler]   ✔ "${project.name}" is IN_SYNC.`);
        } else {
          console.log(`[Scheduler]   — "${project.name}": ${drift.status} (no baseline?)`);
        }
      } catch (err) {
        console.warn(`[Scheduler]   ✖ Drift scan failed for project "${project.name}": ${err.message}`);
        results.push({ projectId: project.id, projectName: project.name, status: 'ERROR', error: err.message });
      }
    }

    this._lastScan = new Date().toISOString();
    this._lastResults = results;
    console.log(`[Scheduler] Drift scan complete. ${results.filter(r => r.status === 'DRIFT_DETECTED').length} project(s) have drift.`);
    return results;
  }

  /**
   * Simple HTTP/HTTPS POST helper (no external deps).
   */
  _httpPost(urlStr, body) {
    return new Promise((resolve, reject) => {
      try {
        const parsed = new URL(urlStr);
        const lib = parsed.protocol === 'https:' ? https : http;
        const bodyStr = JSON.stringify(body);
        const options = {
          hostname: parsed.hostname,
          port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
        };
        const req = lib.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('HTTP POST timeout')); });
        req.write(bodyStr);
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new SchedulerService();
