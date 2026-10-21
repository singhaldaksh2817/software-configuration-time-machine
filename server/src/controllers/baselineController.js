const baselineService = require('../services/baselineService');

exports.getBaselines = async (req, res, next) => {
  try {
    const baselines = baselineService.getByProjectId(req.params.id);
    res.json(baselines);
  } catch (err) {
    next(err);
  }
};

exports.createBaseline = async (req, res, next) => {
  try {
    const { name, description, revisionId, user, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Baseline name is required' });
    }
    const baseline = await baselineService.create({
      projectId: req.params.id,
      name: name.trim(),
      description: description || '',
      revisionId: revisionId || null,
      user: user || 'Admin',
      status: status || 'Approved'
    });
    res.status(201).json(baseline);
  } catch (err) {
    next(err);
  }
};

exports.updateBaselineStatus = async (req, res, next) => {
  try {
    const { status, user } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const baseline = baselineService.updateStatus(req.params.baselineId, status, user);
    res.json(baseline);
  } catch (err) {
    next(err);
  }
};
