const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../database/db');
const fossilService = require('./fossilService');
const { parseUnifiedDiff } = require('../utils/diffParser');

class DriftService {
  async detectDrift(projectId, baselineId = null) {
    const db = getDatabase();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) throw new Error('Project not found');

    let baseline = null;
    if (baselineId) {
      baseline = db.prepare('SELECT * FROM baselines WHERE id = ? AND project_id = ?').get(baselineId, projectId);
    } else if (project.current_baseline) {
      baseline = db.prepare('SELECT * FROM baselines WHERE baseline_code = ? AND project_id = ?').get(project.current_baseline, projectId);
    } else {
      // Pick latest baseline
      baseline = db.prepare('SELECT * FROM baselines WHERE project_id = ? ORDER BY created_at DESC LIMIT 1').get(projectId);
    }

    if (!baseline) {
      return {
        hasBaseline: false,
        status: 'NO_BASELINE',
        message: 'No baseline has been defined for this project yet.',
        items: [],
        totalItems: 0,
        driftCount: 0
      };
    }

    // Run Fossil diff between the baseline revision and current workspace
    const rawDiff = await fossilService.getDiff(project.workspace_path, baseline.revision_id);
    const parsedDiff = parseUnifiedDiff(rawDiff);
    const diffMap = new Map();
    parsedDiff.forEach(file => {
      diffMap.set(file.filename.replace(/\\/g, '/'), file);
    });

    // Get all tracked configuration items for this project
    const configItems = db.prepare('SELECT * FROM configuration_items WHERE project_id = ?').all(projectId);

    const items = [];
    let modifiedCount = 0;
    let addedCount = 0;
    let deletedCount = 0;
    let unchangedCount = 0;

    for (const ci of configItems) {
      const normalizedPath = ci.path.replace(/\\/g, '/');
      const diffInfo = diffMap.get(normalizedPath);
      const absPath = path.resolve(project.workspace_path, ci.path);
      const existsOnDisk = fs.existsSync(absPath);

      if (!existsOnDisk) {
        deletedCount++;
        items.push({
          id: ci.id,
          name: ci.name,
          path: ci.path,
          fileType: ci.file_type,
          status: 'DELETED',
          message: 'File tracked in baseline but missing from current workspace',
          diff: diffInfo || null
        });
      } else if (diffInfo) {
        modifiedCount++;
        items.push({
          id: ci.id,
          name: ci.name,
          path: ci.path,
          fileType: ci.file_type,
          status: 'MODIFIED',
          message: `Configuration differs from baseline (${diffInfo.addedCount} lines added, ${diffInfo.deletedCount} lines removed)`,
          diff: diffInfo
        });
      } else {
        unchangedCount++;
        items.push({
          id: ci.id,
          name: ci.name,
          path: ci.path,
          fileType: ci.file_type,
          status: 'UNCHANGED',
          message: 'Matches baseline state perfectly',
          diff: null
        });
      }
    }

    // Check for untracked/added files in the workspace not in baseline
    try {
      const statusRes = await fossilService.getStatus(project.workspace_path);
      if (statusRes && statusRes.files) {
        for (const file of statusRes.files) {
          if (file.status === 'EXTRA' || file.status === 'ADDED') {
            const normalized = file.path.replace(/\\/g, '/');
            if (!items.some(i => i.path.replace(/\\/g, '/') === normalized)) {
              addedCount++;
              items.push({
                id: null,
                name: path.basename(file.path),
                path: file.path,
                fileType: 'unknown',
                status: 'ADDED',
                message: 'Unexpected file added relative to baseline',
                diff: null
              });
            }
          }
        }
      }
    } catch (e) {
      // Ignore status parse error
    }

    const totalDrift = modifiedCount + addedCount + deletedCount;
    const status = totalDrift > 0 ? 'DRIFT_DETECTED' : 'IN_SYNC';

    return {
      hasBaseline: true,
      baseline: {
        id: baseline.id,
        code: baseline.baseline_code,
        name: baseline.name,
        revision: baseline.revision_id,
        status: baseline.status,
        createdAt: baseline.created_at
      },
      status,
      summary: {
        total: items.length,
        unchanged: unchangedCount,
        modified: modifiedCount,
        added: addedCount,
        deleted: deletedCount,
        driftCount: totalDrift
      },
      items,
      rawDiff
    };
  }

  async autoHeal(projectId, baselineId = null, user = 'AutoHealer') {
    const db = getDatabase();
    const driftReport = await this.detectDrift(projectId, baselineId);
    if (!driftReport.hasBaseline) {
      throw new Error('Cannot auto-heal: No baseline defined for this project');
    }
    if (driftReport.status !== 'DRIFT_DETECTED') {
      return {
        healed: false,
        message: 'System is already in sync with baseline. No drift detected.',
        driftReport
      };
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    const baseline = driftReport.baseline;

    // Collect all drifted filenames
    const driftedFiles = driftReport.items
      .filter(item => item.status === 'MODIFIED' || item.status === 'DELETED')
      .map(item => item.path);

    if (driftedFiles.length === 0) {
      return { healed: false, message: 'No modifiable drifted items found to revert' };
    }

    const previousRevision = project.current_revision;
    const reason = `[Auto-Heal] Autonomous baseline restoration to ${baseline.code} (${driftedFiles.length} drifted item(s) restored)`;

    // Execute safe forward revert in Fossil
    const rollbackResult = await fossilService.revertToRevision(
      project.workspace_path,
      baseline.revision,
      user,
      reason,
      driftedFiles
    );

    const newRevision = rollbackResult.newRevision;

    // Update project revision
    db.prepare('UPDATE projects SET current_revision = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newRevision, projectId);

    // Update configuration items version
    for (const f of driftedFiles) {
      db.prepare('UPDATE configuration_items SET current_version = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ? AND path = ?')
        .run(newRevision, user, projectId, f);
    }

    // Log in audit trail
    const auditService = require('./auditService');
    auditService.log(
      projectId,
      user,
      'DRIFT_AUTO_HEAL',
      `Restored ${driftedFiles.length} file(s) to baseline ${baseline.code}`,
      'Success',
      newRevision,
      {
        baselineCode: baseline.code,
        baselineRevision: baseline.revision,
        driftedFiles,
        newRevision,
        previousRevision
      }
    );

    // Re-verify drift after healing
    const updatedDrift = await this.detectDrift(projectId, baseline.id);

    return {
      success: true,
      healed: true,
      baselineCode: baseline.code,
      baselineRevision: baseline.revision,
      driftedFiles,
      newRevision,
      previousRevision,
      updatedDrift
    };
  }
}

module.exports = new DriftService();
