const { getDatabase } = require('../database/db');
const fossilService = require('./fossilService');
const auditService = require('./auditService');

class BaselineService {
  getByProjectId(projectId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM baselines 
      WHERE project_id = ? 
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId);
  }

  getById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM baselines WHERE id = ?');
    return stmt.get(id);
  }

  async create({ projectId, name, description = '', revisionId = null, user = 'Admin', status = 'Approved' }) {
    const db = getDatabase();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) throw new Error('Project not found');

    const targetRev = revisionId || project.current_revision || 'trunk';

    // Generate baseline code like B-001, B-002
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM baselines WHERE project_id = ?');
    const { count } = countStmt.get(projectId);
    const baselineCode = `B-${String(count + 1).padStart(3, '0')}`;

    // Tag the revision in Fossil SCM
    const tagName = `baseline-${baselineCode}`;
    await fossilService.tagAdd(project.workspace_path, tagName, targetRev);

    // If setting as Active, mark other active baselines in this project as Superseded
    if (status === 'Active') {
      db.prepare("UPDATE baselines SET status = 'Superseded' WHERE project_id = ? AND status = 'Active'").run(projectId);
    }

    // Insert baseline record
    const insertStmt = db.prepare(`
      INSERT INTO baselines (baseline_code, project_id, name, description, revision_id, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const res = insertStmt.run(baselineCode, projectId, name, description, targetRev, status, user);
    const baselineId = res.lastInsertRowid;

    // Update project current baseline
    db.prepare('UPDATE projects SET current_baseline = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(baselineCode, projectId);

    // Audit log
    auditService.log(projectId, user, 'BASELINE_CREATED', `${baselineCode}: ${name}`, 'Success', targetRev, {
      baselineCode,
      name,
      revisionId: targetRev,
      status
    });

    return this.getById(baselineId);
  }

  updateStatus(id, status, user = 'Admin') {
    const db = getDatabase();
    const baseline = this.getById(id);
    if (!baseline) throw new Error('Baseline not found');

    if (status === 'Active') {
      db.prepare("UPDATE baselines SET status = 'Superseded' WHERE project_id = ? AND status = 'Active'")
        .run(baseline.project_id);
    }

    db.prepare('UPDATE baselines SET status = ? WHERE id = ?').run(status, id);

    auditService.log(baseline.project_id, user, 'BASELINE_STATUS_UPDATED', baseline.baseline_code, 'Success', baseline.revision_id, {
      oldStatus: baseline.status,
      newStatus: status
    });

    return this.getById(id);
  }
}

module.exports = new BaselineService();
