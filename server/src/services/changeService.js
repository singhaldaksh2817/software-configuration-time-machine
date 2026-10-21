const { getDatabase } = require('../database/db');
const auditService = require('./auditService');

class ChangeService {
  getAll(projectId = null) {
    const db = getDatabase();
    let query = `
      SELECT cr.*, p.name as project_name 
      FROM change_requests cr
      LEFT JOIN projects p ON cr.project_id = p.id
    `;
    const params = [];
    if (projectId) {
      query += ' WHERE cr.project_id = ?';
      params.push(projectId);
    }
    query += ' ORDER BY cr.created_date DESC';
    return db.prepare(query).all(...params);
  }

  getById(id) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT cr.*, p.name as project_name 
      FROM change_requests cr
      LEFT JOIN projects p ON cr.project_id = p.id
      WHERE cr.id = ?
    `);
    return stmt.get(id);
  }

  create({ projectId, title, description = '', reason = '', priority = 'Medium', requestedBy = 'Admin', assignedTo = '', affectedItems = '[]' }) {
    const db = getDatabase();
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM change_requests WHERE project_id = ?');
    const { count } = countStmt.get(projectId);
    const changeCode = `CR-${String(count + 1).padStart(3, '0')}`;

    const stmt = db.prepare(`
      INSERT INTO change_requests (change_code, project_id, title, description, reason, priority, status, requested_by, assigned_to, affected_items)
      VALUES (?, ?, ?, ?, ?, ?, 'Requested', ?, ?, ?)
    `);
    const res = stmt.run(
      changeCode,
      projectId,
      title,
      description,
      reason,
      priority,
      requestedBy,
      assignedTo,
      typeof affectedItems === 'string' ? affectedItems : JSON.stringify(affectedItems)
    );

    auditService.log(projectId, requestedBy, 'CHANGE_REQUESTED', `${changeCode}: ${title}`, 'Success', null, { priority, changeCode });
    return this.getById(res.lastInsertRowid);
  }

  updateStatus(id, { status, user = 'Admin', relatedRevision = null, notes = '' }) {
    const db = getDatabase();
    const cr = this.getById(id);
    if (!cr) throw new Error('Change request not found');

    const completedDate = ['Implemented', 'Rejected', 'Rolled Back'].includes(status)
      ? new Date().toISOString()
      : null;

    const stmt = db.prepare(`
      UPDATE change_requests 
      SET status = ?, 
          related_revision = COALESCE(?, related_revision),
          completed_date = COALESCE(?, completed_date)
      WHERE id = ?
    `);
    stmt.run(status, relatedRevision || null, completedDate, id);

    auditService.log(cr.project_id, user, 'CHANGE_STATUS_UPDATED', `${cr.change_code} -> ${status}`, 'Success', relatedRevision || cr.related_revision, {
      oldStatus: cr.status,
      newStatus: status,
      notes
    });

    return this.getById(id);
  }
}

module.exports = new ChangeService();
