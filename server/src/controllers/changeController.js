const changeService = require('../services/changeService');

exports.getAllChanges = async (req, res, next) => {
  try {
    const projectId = req.query.projectId || null;
    const changes = changeService.getAll(projectId);
    res.json(changes);
  } catch (err) {
    next(err);
  }
};

exports.getChangeById = async (req, res, next) => {
  try {
    const change = changeService.getById(req.params.id);
    if (!change) return res.status(404).json({ error: 'Change request not found' });
    res.json(change);
  } catch (err) {
    next(err);
  }
};

exports.createChange = async (req, res, next) => {
  try {
    const { projectId, title, description, reason, priority, requestedBy, assignedTo, affectedItems } = req.body;
    if (!projectId || !title) {
      return res.status(400).json({ error: 'Project ID and title are required' });
    }
    const change = changeService.create({
      projectId,
      title,
      description,
      reason,
      priority: priority || 'Medium',
      requestedBy: requestedBy || 'Admin',
      assignedTo,
      affectedItems
    });
    res.status(201).json(change);
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, user, relatedRevision, notes } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const change = changeService.updateStatus(req.params.id, {
      status,
      user: user || 'Admin',
      relatedRevision,
      notes
    });
    res.json(change);
  } catch (err) {
    next(err);
  }
};
