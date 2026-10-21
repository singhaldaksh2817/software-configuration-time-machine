const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../database/db');
const config = require('../config');
const fossilService = require('./fossilService');
const auditService = require('./auditService');
const { sanitizeSlug } = require('../utils/sanitizer');

class ProjectService {
  getAll() {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM configuration_items ci WHERE ci.project_id = p.id) as item_count,
        (SELECT COUNT(*) FROM baselines b WHERE b.project_id = p.id) as baseline_count,
        (SELECT COUNT(*) FROM change_requests cr WHERE cr.project_id = p.id) as change_count
      FROM projects p
      ORDER BY p.updated_at DESC
    `);
    return stmt.all();
  }

  getById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    const project = stmt.get(id);
    if (!project) return null;

    // Get live status from Fossil if repo exists
    try {
      if (fs.existsSync(project.workspace_path)) {
        const fossilStatus = fossilService.getStatus(project.workspace_path);
        project.fossilStatus = fossilStatus;
      }
    } catch (e) {
      project.fossilStatus = { error: e.message };
    }

    return project;
  }

  async create({ name, description = '', owner = 'Admin' }) {
    const db = getDatabase();
    const slug = `${sanitizeSlug(name)}-${Date.now().toString(36)}`;
    const repoPath = path.join(config.REPOS_DIR, `${slug}.fossil`);
    const workspacePath = path.join(config.WORKSPACES_DIR, slug);

    // 1. Initialize Fossil Repository
    await fossilService.initRepository(repoPath, name, owner);

    // 2. Open checkout workspace
    await fossilService.openRepository(repoPath, workspacePath);

    // 3. Create initial README.md or .scm file to establish initial revision
    const readmePath = path.join(workspacePath, 'README.md');
    fs.writeFileSync(readmePath, `# ${name}\n\n${description || 'Software Configuration Management Repository'}\n\nManaged by Software Configuration Time Machine.\n`);
    
    // Commit initial state
    const commitRes = await fossilService.commit(workspacePath, `Initial project baseline setup for ${name}`, owner);
    const initialRev = commitRes.revision || 'trunk';

    // 4. Record project in SQLite
    const insertStmt = db.prepare(`
      INSERT INTO projects (name, slug, description, owner, repository_path, workspace_path, current_revision, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')
    `);
    const result = insertStmt.run(name, slug, description, owner, repoPath, workspacePath, initialRev);
    const projectId = result.lastInsertRowid;

    // Track initial README as a configuration item
    const ciStmt = db.prepare(`
      INSERT INTO configuration_items (project_id, name, path, file_type, description, current_version, created_by)
      VALUES (?, 'README.md', 'README.md', 'markdown', 'Project configuration documentation', ?, ?)
    `);
    ciStmt.run(projectId, initialRev, owner);

    // 5. Record Audit
    auditService.log(projectId, owner, 'PROJECT_CREATED', name, 'Success', initialRev, { slug, repoPath });

    const newProject = this.getById(projectId);

    // 6. Register with auto-watcher
    try {
      const watcherService = require('./watcherService');
      watcherService.addProject(newProject);
    } catch (_) {}

    return newProject;
  }

  update(id, { name, description, status }) {
    const db = getDatabase();
    const project = this.getById(id);
    if (!project) throw new Error('Project not found');

    const stmt = db.prepare(`
      UPDATE projects 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(name || null, description || null, status || null, id);

    auditService.log(id, 'Admin', 'PROJECT_UPDATED', project.name, 'Success', project.current_revision);
    return this.getById(id);
  }

  async delete(id) {
    const db = getDatabase();
    const project = this.getById(id);
    if (!project) throw new Error('Project not found');

    // 1. Record Audit BEFORE deleting project record (satisfies foreign key constraint)
    try {
      auditService.log(id, 'Admin', 'PROJECT_DELETED', project.name, 'Success', project.current_revision);
    } catch (_) {}

    // 2. Stop auto-watcher if running
    try {
      const watcherService = require('./watcherService');
      watcherService.stopWatching(id);
    } catch (_) {}

    // 3. Close Fossil checkout so files are unlocked on Windows
    try {
      if (project.workspace_path && fs.existsSync(project.workspace_path)) {
        await fossilService.closeRepository(project.workspace_path);
      }
    } catch (_) {}

    // 4. Clean up workspace and repository files on disk
    try {
      if (project.workspace_path && fs.existsSync(project.workspace_path)) {
        fs.rmSync(project.workspace_path, { recursive: true, force: true });
      }
      if (project.repository_path && fs.existsSync(project.repository_path)) {
        fs.rmSync(project.repository_path, { force: true });
      }
    } catch (_) {}

    // 5. Delete from SQLite (cascades to configuration_items, baselines, change_requests)
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(id);

    return { success: true, message: `Project ${project.name} deleted` };
  }
}

module.exports = new ProjectService();
