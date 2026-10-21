const projectService = require('../services/projectService');
const complianceService = require('../services/complianceService');

exports.getAllProjects = async (req, res, next) => {
  try {
    const projects = projectService.getAll();
    res.json(projects);
  } catch (err) {
    next(err);
  }
};

exports.getProjectById = async (req, res, next) => {
  try {
    const project = projectService.getById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    next(err);
  }
};

exports.createProject = async (req, res, next) => {
  try {
    const { name, description, owner } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    const project = await projectService.create({
      name: name.trim(),
      description: description || '',
      owner: owner || 'Admin'
    });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const project = projectService.update(req.params.id, req.body);
    res.json(project);
  } catch (err) {
    next(err);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const result = await projectService.delete(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getComplianceReport = async (req, res, next) => {
  try {
    const report = await complianceService.generateReport(req.params.id);
    if (req.query.format === 'markdown') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${report.project.slug}-compliance-report.md"`);
      return res.send(report.markdown);
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
};
