const { getDatabase } = require('../database/db');

exports.search = async (req, res, next) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    if (!q) {
      return res.json({ projects: [], items: [], baselines: [], changes: [], audit: [] });
    }

    const db = getDatabase();
    const queryTerm = `%${q}%`;

    const projects = db.prepare(`
      SELECT id, name, description, current_revision, current_baseline, status 
      FROM projects 
      WHERE name LIKE ? OR description LIKE ? OR slug LIKE ?
      LIMIT 10
    `).all(queryTerm, queryTerm, queryTerm);

    const items = db.prepare(`
      SELECT ci.id, ci.name, ci.path, ci.file_type, ci.current_version, ci.project_id, p.name as project_name
      FROM configuration_items ci
      JOIN projects p ON ci.project_id = p.id
      WHERE ci.name LIKE ? OR ci.path LIKE ? OR ci.description LIKE ?
      LIMIT 10
    `).all(queryTerm, queryTerm, queryTerm);

    const baselines = db.prepare(`
      SELECT b.id, b.baseline_code, b.name, b.revision_id, b.status, b.project_id, p.name as project_name
      FROM baselines b
      JOIN projects p ON b.project_id = p.id
      WHERE b.baseline_code LIKE ? OR b.name LIKE ? OR b.description LIKE ?
      LIMIT 10
    `).all(queryTerm, queryTerm, queryTerm);

    const changes = db.prepare(`
      SELECT cr.id, cr.change_code, cr.title, cr.priority, cr.status, cr.project_id, p.name as project_name
      FROM change_requests cr
      JOIN projects p ON cr.project_id = p.id
      WHERE cr.change_code LIKE ? OR cr.title LIKE ? OR cr.description LIKE ?
      LIMIT 10
    `).all(queryTerm, queryTerm, queryTerm);

    const audit = db.prepare(`
      SELECT id, timestamp, user, action, target, result, revision_id, project_id
      FROM audit_logs
      WHERE action LIKE ? OR target LIKE ? OR user LIKE ?
      LIMIT 10
    `).all(queryTerm, queryTerm, queryTerm);

    res.json({
      query: q,
      results: {
        projects,
        items,
        baselines,
        changes,
        audit
      },
      totalMatches: projects.length + items.length + baselines.length + changes.length + audit.length
    });
  } catch (err) {
    next(err);
  }
};
