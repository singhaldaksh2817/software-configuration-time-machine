const { getDatabase } = require('../database/db');

class AuditService {
  log(projectId, user, action, target, result = 'Success', revisionId = null, details = null) {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT INTO audit_logs (project_id, user, action, target, result, revision_id, details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        projectId || null,
        user || 'System',
        action,
        target,
        result,
        revisionId || null,
        typeof details === 'object' ? JSON.stringify(details) : details || null
      );
    } catch (err) {
      console.error('Failed to write audit log:', err.message);
    }
  }

  getAll(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT a.*, p.name as project_name 
      FROM audit_logs a
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.projectId) {
      query += ' AND a.project_id = ?';
      params.push(filters.projectId);
    }
    if (filters.user) {
      query += ' AND a.user LIKE ?';
      params.push(`%${filters.user}%`);
    }
    if (filters.action) {
      query += ' AND a.action = ?';
      params.push(filters.action);
    }
    if (filters.startDate) {
      query += ' AND a.timestamp >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND a.timestamp <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY a.timestamp DESC LIMIT ? OFFSET ?';
    params.push(filters.limit || 100, filters.offset || 0);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }
}

module.exports = new AuditService();
