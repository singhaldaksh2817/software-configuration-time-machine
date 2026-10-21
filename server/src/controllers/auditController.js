const auditService = require('../services/auditService');

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { projectId, user, action, startDate, endDate, limit, offset } = req.query;
    const logs = auditService.getAll({
      projectId: projectId ? parseInt(projectId, 10) : null,
      user,
      action,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};
