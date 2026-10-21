const fossilService = require('../services/fossilService');
const projectService = require('../services/projectService');
const baselineService = require('../services/baselineService');
const driftService = require('../services/driftService');
const rollbackService = require('../services/rollbackService');
const { parseUnifiedDiff } = require('../utils/diffParser');

exports.getTimeline = async (req, res, next) => {
  try {
    const project = projectService.getById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const timeline = await fossilService.getTimeline(project.workspace_path, limit);

    // Merge baseline information if revisions match baselines
    const baselines = baselineService.getByProjectId(project.id);
    const baselineRevMap = new Map();
    baselines.forEach(b => baselineRevMap.set(b.revision_id, b));

    const enriched = timeline.map(entry => {
      const match = baselineRevMap.get(entry.revision);
      return {
        ...entry,
        baseline: match ? { code: match.baseline_code, name: match.name, status: match.status } : null
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

exports.getRevisionInfo = async (req, res, next) => {
  try {
    const project = projectService.getById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const revision = req.params.revision;
    const info = await fossilService.getRevisionInfo(project.workspace_path, revision);

    // Also get diff of this revision against its parent
    let diff = '';
    let parsedDiff = [];
    if (info.parent) {
      diff = await fossilService.getDiff(project.workspace_path, info.parent, revision);
      parsedDiff = parseUnifiedDiff(diff);
    }

    res.json({ ...info, diff, parsedDiff });
  } catch (err) {
    next(err);
  }
};

exports.compare = async (req, res, next) => {
  try {
    const project = projectService.getById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { refA, refB, type = 'revisions' } = req.body;
    if (!refA) {
      return res.status(400).json({ error: 'Base reference (refA) is required' });
    }

    let revA = refA;
    let revB = refB || null;

    // If type is baselines, lookup baseline revisions
    if (type === 'baselines') {
      const baselines = baselineService.getByProjectId(project.id);
      const bA = baselines.find(b => b.baseline_code === refA || b.id === Number(refA));
      const bB = baselines.find(b => b.baseline_code === refB || b.id === Number(refB));
      if (bA) revA = bA.revision_id;
      if (bB) revB = bB.revision_id;
    } else if (type === 'baseline_vs_current') {
      const baselines = baselineService.getByProjectId(project.id);
      const bA = baselines.find(b => b.baseline_code === refA || b.id === Number(refA));
      if (bA) revA = bA.revision_id;
      revB = null; // Compare against current workspace
    }

    const unifiedDiff = await fossilService.getDiff(project.workspace_path, revA, revB);
    const sideBySideDiff = await fossilService.getSideBySideDiff(project.workspace_path, revA, revB);
    const parsedFiles = parseUnifiedDiff(unifiedDiff);

    res.json({
      refA,
      refB: refB || 'Current Workspace',
      revA,
      revB: revB || 'HEAD',
      unifiedDiff,
      sideBySideDiff,
      files: parsedFiles,
      summary: {
        totalFilesChanged: parsedFiles.length,
        totalAdditions: parsedFiles.reduce((acc, f) => acc + f.addedCount, 0),
        totalDeletions: parsedFiles.reduce((acc, f) => acc + f.deletedCount, 0)
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getDrift = async (req, res, next) => {
  try {
    const baselineId = req.query.baselineId ? parseInt(req.query.baselineId, 10) : null;
    const report = await driftService.detectDrift(req.params.id, baselineId);
    res.json(report);
  } catch (err) {
    next(err);
  }
};

exports.previewRollback = async (req, res, next) => {
  try {
    const { targetRevision } = req.body;
    if (!targetRevision) {
      return res.status(400).json({ error: 'Target revision is required' });
    }
    const preview = await rollbackService.previewRollback(req.params.id, targetRevision);
    res.json(preview);
  } catch (err) {
    next(err);
  }
};

exports.executeRollback = async (req, res, next) => {
  try {
    const { targetRevision, reason, user } = req.body;
    if (!targetRevision) {
      return res.status(400).json({ error: 'Target revision is required' });
    }
    const result = await rollbackService.executeRollback(req.params.id, {
      targetRevision,
      reason: reason || 'Restoring previous configuration state',
      user: user || 'Admin'
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.autoHealDrift = async (req, res, next) => {
  try {
    const { baselineId, user } = req.body || {};
    const result = await driftService.autoHeal(req.params.id, baselineId, user || 'AutoHealer');
    res.json(result);
  } catch (err) {
    next(err);
  }
};
