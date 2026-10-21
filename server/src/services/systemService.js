const fossilService = require('./fossilService');
const config = require('../config');
const { getDatabase } = require('../database/db');

class SystemService {
  async getFossilStatus() {
    const start = Date.now();
    const result = await fossilService.isAvailable();
    return {
      name: 'Fossil SCM',
      connected: result.available,
      version: result.version,
      executablePath: result.executablePath,
      latencyMs: Date.now() - start,
      raw: result.raw,
      error: result.error || null
    };
  }

  async getJenkinsStatus() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${config.JENKINS_URL}/api/json`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      }).catch(() => null);
      clearTimeout(timeoutId);

      return {
        name: 'Jenkins CI/CD',
        connected: res ? res.status === 200 || res.status === 403 : false,
        url: config.JENKINS_URL,
        status: res ? 'Online' : 'Offline (Configured for Pipeline)',
        configured: Boolean(config.JENKINS_URL)
      };
    } catch (e) {
      return {
        name: 'Jenkins CI/CD',
        connected: false,
        url: config.JENKINS_URL,
        status: 'Offline',
        configured: Boolean(config.JENKINS_URL)
      };
    }
  }

  async getDockerStatus() {
    return {
      name: 'Docker Container Engine',
      connected: Boolean(process.env.DOCKER_CONTAINER || process.env.DOCKER_HOST),
      environment: process.env.DOCKER_CONTAINER ? 'Running inside Container' : 'Host Environment',
      composeFilePresent: true
    };
  }

  getSettings() {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {
      appName: 'Software Configuration Time Machine',
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      fossilPath: fossilService.getExecutablePath(),
      jenkinsUrl: config.JENKINS_URL,
      theme: 'archive-dark'
    };
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  saveSetting(key, value) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(key, String(value));
    return { key, value };
  }
}

module.exports = new SystemService();
