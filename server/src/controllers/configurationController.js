const configurationService = require('../services/configurationService');

exports.getItems = async (req, res, next) => {
  try {
    const items = configurationService.getByProjectId(req.params.id);
    res.json(items);
  } catch (err) {
    next(err);
  }
};

exports.saveItem = async (req, res, next) => {
  try {
    const { name, path: itemPath, content, fileType, description, user, commitMessage } = req.body;
    if (!itemPath || typeof content !== 'string') {
      return res.status(400).json({ error: 'File path and content are required' });
    }
    const result = await configurationService.saveConfigurationItem(req.params.id, {
      name: name || itemPath,
      itemPath,
      content,
      fileType: fileType || 'yaml',
      description: description || '',
      user: user || 'Admin',
      commitMessage
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getContent = async (req, res, next) => {
  try {
    const revision = req.query.revision || null;
    const content = await configurationService.getContent(req.params.id, req.params.itemId, revision);
    res.json(content);
  } catch (err) {
    next(err);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const user = req.body.user || 'Admin';
    const result = await configurationService.deleteItem(req.params.id, req.params.itemId, user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.syncWorkspace = async (req, res, next) => {
  try {
    const user = req.body.user || 'Admin';
    const result = await configurationService.syncWorkspace(req.params.id, user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
