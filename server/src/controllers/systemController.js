const systemService = require('../services/systemService');
const jenkinsService = require('../services/jenkinsService');
const seedDemoProject = require('../database/seed');

exports.getFossilStatus = async (req, res, next) => {
  try {
    const status = await systemService.getFossilStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
};

exports.getJenkinsStatus = async (req, res, next) => {
  try {
    const jobName = req.query.job || req.query.jobName || 'Software Configuration Time Machine';
    const status = await jenkinsService.getStatus(jobName);
    res.json(status);
  } catch (err) {
    next(err);
  }
};

exports.triggerJenkinsBuild = async (req, res, next) => {
  try {
    const jobName = req.body?.job || req.body?.jobName || 'Software Configuration Time Machine';
    const result = await jenkinsService.triggerBuild(jobName);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getDockerStatus = async (req, res, next) => {
  try {
    const status = await systemService.getDockerStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
};

exports.getSettings = (req, res) => {
  const settings = systemService.getSettings();
  res.json(settings);
};

exports.updateSetting = (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Key is required' });
  const result = systemService.saveSetting(key, value);
  res.json(result);
};

exports.triggerSeed = async (req, res, next) => {
  try {
    const project = await seedDemoProject();
    res.json({ success: true, message: 'Demo project seeded successfully', project });
  } catch (err) {
    next(err);
  }
};
