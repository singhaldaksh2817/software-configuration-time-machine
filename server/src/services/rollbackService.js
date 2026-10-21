const { getDatabase } = require('../database/db');
const fossilService = require('./fossilService');
const auditService = require('./auditService');
const { parseUnifiedDiff } = require('../utils/diffParser');

class RollbackService {
  async previewRollback(projectId, targetRevision) {
    const db = getDatabase();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) throw new Error('Project not found');

    const currentRev = project.current_revision;
    const targetRevInfo = await fossilService.getRevisionInfo(project.workspace_path, targetRevision);

    // Diff between current revision and target revision
    const rawDiff = await fossilService.getDiff(project.workspace_path, currentRev, targetRevision);
    const parsedDiff = parseUnifiedDiff(rawDiff);

    const affectedFiles = parsedDiff.map(f => ({
      file: f.filename,
      addedLines: f.addedCount,
      deletedLines: f.deletedCount
    }));

    return {
      projectId,
      currentState: {
        revision: currentRev,
        name: project.name
      },
      targetState: {
        revision: targetRevision,
        date: targetRevInfo.date,
        comment: targetRevInfo.comment,
        author: targetRevInfo.author
      },
      affectedFiles,
      parsedDiff,
      rawDiff
    };
  }

  async executeRollback(projectId, { targetRevision, reason = 'Rollback to earlier configuration state', user = 'Admin' }) {
    const db = getDatabase();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) throw new Error('Project not found');

    const previousRevision = project.current_revision;

    // Execute safe forward rollback in Fossil
    const rollbackResult = await fossilService.revertToRevision(
      project.workspace_path,
      targetRevision,
      user,
      reason
    );

    const newRevision = rollbackResult.newRevision;

    // Update project current_revision
    db.prepare('UPDATE projects SET current_revision = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newRevision, projectId);

    // Update configuration items version
    db.prepare('UPDATE configuration_items SET current_version = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?')
      .run(newRevision, user, projectId);

    // Record in SQLite audit log
    auditService.log(
      projectId,
      user,
      'CONFIGURATION_ROLLBACK',
      `Restored state from [${targetRevision.substring(0, 10)}]`,
      'Success',
      newRevision,
      {
        targetRevision,
        previousRevision,
        reason,
        newRevision
      }
    );

    return {
      success: true,
      projectId,
      previousRevision,
      restoredRevision: targetRevision,
      newRevision,
      user,
      timestamp: new Date().toISOString(),
      reason
    };
  }
}

module.exports = new RollbackService();
