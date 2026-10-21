const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../database/db');
const fossilService = require('./fossilService');
const auditService = require('./auditService');
const validatorService = require('./validatorService');
const { sanitizePath } = require('../utils/sanitizer');

class ConfigurationService {
  getByProjectId(projectId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM configuration_items 
      WHERE project_id = ? 
      ORDER BY updated_at DESC
    `);
    return stmt.all(projectId);
  }

  getById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM configuration_items WHERE id = ?');
    return stmt.get(id);
  }

  async saveConfigurationItem(projectId, { name, itemPath, content, fileType = 'yaml', description = '', user = 'Admin', commitMessage = null }) {
    const db = getDatabase();
    const projectStmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    const project = projectStmt.get(projectId);
    if (!project) throw new Error('Project not found');

    const cleanRelPath = itemPath.replace(/^[\/\\]+/, '');
    const absolutePath = sanitizePath(project.workspace_path, cleanRelPath);

    // 1. Ensure target directory exists in workspace
    const targetDir = path.dirname(absolutePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 2. Write file content to workspace
    fs.writeFileSync(absolutePath, content, 'utf8');

    // 3. Stage & Commit in Fossil SCM
    const msg = commitMessage || `Update configuration item: ${cleanRelPath}`;
    await fossilService.addFiles(project.workspace_path, [cleanRelPath]);
    const commitResult = await fossilService.commit(project.workspace_path, msg, user);
    const newRevision = commitResult.revision || project.current_revision || 'HEAD';

    // 4. Update or Insert configuration_items record in SQLite
    const existingStmt = db.prepare('SELECT * FROM configuration_items WHERE project_id = ? AND path = ?');
    const existing = existingStmt.get(projectId, cleanRelPath);

    let itemId;
    if (existing) {
      const updateStmt = db.prepare(`
        UPDATE configuration_items 
        SET name = ?, file_type = ?, description = ?, current_version = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateStmt.run(name || existing.name, fileType || existing.file_type, description || existing.description, newRevision, user, existing.id);
      itemId = existing.id;
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO configuration_items (project_id, name, path, file_type, description, current_version, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const res = insertStmt.run(projectId, name || cleanRelPath, cleanRelPath, fileType, description, newRevision, user, user);
      itemId = res.lastInsertRowid;
    }

    // 5. Update Project's current revision and timestamp
    const updateProj = db.prepare('UPDATE projects SET current_revision = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    updateProj.run(newRevision, projectId);

    // 6. Record Audit
    const action = existing ? 'CONFIG_MODIFIED' : 'CONFIG_CREATED';
    auditService.log(projectId, user, action, cleanRelPath, 'Success', newRevision, {
      name,
      commitMessage: msg,
      revision: newRevision
    });

    return {
      id: itemId,
      projectId,
      name: name || cleanRelPath,
      path: cleanRelPath,
      revision: newRevision,
      fullHash: commitResult.fullHash
    };
  }

  async getContent(projectId, itemId, revision = null) {
    const db = getDatabase();
    const item = this.getById(itemId);
    if (!item) throw new Error('Configuration item not found');

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) throw new Error('Project not found');

    try {
      const content = await fossilService.getFileContent(project.workspace_path, item.path, revision);
      return {
        id: item.id,
        name: item.name,
        path: item.path,
        revision: revision || item.current_version,
        content
      };
    } catch (err) {
      // Fallback: check workspace directly
      const abs = path.resolve(project.workspace_path, item.path);
      if (fs.existsSync(abs)) {
        return {
          id: item.id,
          name: item.name,
          path: item.path,
          revision: revision || item.current_version,
          content: fs.readFileSync(abs, 'utf8')
        };
      }
      throw err;
    }
  }

  async deleteItem(projectId, itemId, user = 'Admin') {
    const db = getDatabase();
    const item = this.getById(itemId);
    if (!item) throw new Error('Configuration item not found');

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) throw new Error('Project not found');

    // Remove file from workspace
    const abs = path.resolve(project.workspace_path, item.path);
    if (fs.existsSync(abs)) {
      fs.unlinkSync(abs);
    }

    // Commit deletion in Fossil
    const msg = `Remove configuration item: ${item.path}`;
    const commitResult = await fossilService.commit(project.workspace_path, msg, user);

    // Delete record from SQLite
    db.prepare('DELETE FROM configuration_items WHERE id = ?').run(itemId);

    // Update project
    db.prepare('UPDATE projects SET current_revision = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(commitResult.revision, projectId);

    auditService.log(projectId, user, 'CONFIG_DELETED', item.path, 'Success', commitResult.revision);

    return { success: true, message: `Configuration item ${item.name} removed` };
  }

  async syncWorkspace(projectId, user = 'Admin') {
    const db = getDatabase();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) throw new Error('Project not found');

    const workspacePath = project.workspace_path;
    if (!fs.existsSync(workspacePath)) {
      throw new Error(`Workspace path does not exist: ${workspacePath}`);
    }

    // 1. Stage all files in workspace with Fossil SCM
    await fossilService.addFiles(workspacePath, []);

    // 2. Commit all staged files
    const commitResult = await fossilService.commit(
      workspacePath,
      `[Workspace Sync] Synchronize all workspace files for ${project.name}`,
      user
    );
    const newRevision = commitResult.revision || project.current_revision || 'HEAD';

    // 3. Scan workspace recursively to index all files in SQLite
    const scannedFiles = [];
    const scanDir = (dir, relPrefix = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relPrefix, entry.name).replace(/\\/g, '/');

        // Ignore fossil internals, git and temporary files
        if (/^_FOSSIL_/i.test(entry.name) || /^\.fslckout/i.test(entry.name) || entry.name === '.git' || /~$/.test(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          scanDir(fullPath, relPath);
        } else if (entry.isFile()) {
          scannedFiles.push({ fullPath, relPath, name: entry.name });
        }
      }
    };

    scanDir(workspacePath);

    // 4. Upsert each file into configuration_items table
    let addedCount = 0;
    for (const file of scannedFiles) {
      const ext = path.extname(file.name).replace(/^\./, '').toLowerCase() || 'text';
      const existing = db.prepare('SELECT id FROM configuration_items WHERE project_id = ? AND path = ?')
        .get(projectId, file.relPath);

      if (existing) {
        db.prepare('UPDATE configuration_items SET current_version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newRevision, existing.id);
      } else {
        db.prepare(`
          INSERT INTO configuration_items (project_id, name, path, file_type, description, current_version, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(projectId, file.name, file.relPath, ext, 'Imported workspace file', newRevision, user, user);
        addedCount++;
      }
    }

    // 5. Update project current revision
    db.prepare('UPDATE projects SET current_revision = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newRevision, projectId);

    auditService.log(projectId, user, 'WORKSPACE_SYNC', `${scannedFiles.length} files scanned`, 'Success', newRevision, {
      totalFiles: scannedFiles.length,
      newlyAdded: addedCount
    });

    return {
      success: true,
      revision: newRevision,
      totalFiles: scannedFiles.length,
      newlyAdded: addedCount,
      files: scannedFiles.map(f => f.relPath)
    };
  }
}

module.exports = new ConfigurationService();
