const express = require('express');
const router = express.Router();

const projectController = require('../controllers/projectController');
const configurationController = require('../controllers/configurationController');
const scmController = require('../controllers/scmController');
const baselineController = require('../controllers/baselineController');
const changeController = require('../controllers/changeController');
const auditController = require('../controllers/auditController');
const dashboardController = require('../controllers/dashboardController');
const searchController = require('../controllers/searchController');
const systemController = require('../controllers/systemController');
const authController = require('../controllers/authController');

// --- Auth Routes ---
router.post('/auth/login', authController.login);
router.get('/auth/me', authController.getCurrentUser);

// --- Dashboard & Metrics ---
router.get('/dashboard', dashboardController.getDashboardStats);

// --- Global Search ---
router.get('/search', searchController.search);

// --- Project Management ---
router.get('/projects', projectController.getAllProjects);
router.post('/projects', projectController.createProject);
router.get('/projects/:id', projectController.getProjectById);
router.get('/projects/:id/compliance-report', projectController.getComplianceReport);
router.put('/projects/:id', projectController.updateProject);
router.delete('/projects/:id', projectController.deleteProject);

// --- Configuration Items in Project ---
router.get('/projects/:id/configurations', configurationController.getItems);
router.post('/projects/:id/configurations', configurationController.saveItem);
router.post('/projects/:id/sync', configurationController.syncWorkspace);
router.get('/projects/:id/configurations/:itemId/content', configurationController.getContent);
router.delete('/projects/:id/configurations/:itemId', configurationController.deleteItem);

// --- Fossil SCM Revision History & Timeline ---
router.get('/projects/:id/timeline', scmController.getTimeline);
router.get('/projects/:id/revisions/:revision', scmController.getRevisionInfo);

// --- Baseline Management ---
router.get('/projects/:id/baselines', baselineController.getBaselines);
router.post('/projects/:id/baselines', baselineController.createBaseline);
router.put('/projects/:id/baselines/:baselineId/status', baselineController.updateBaselineStatus);

// --- Compare Operations (Revision vs Revision / Baseline vs Baseline / Baseline vs Current) ---
router.post('/projects/:id/compare', scmController.compare);

// --- Configuration Drift Detection ---
router.get('/projects/:id/drift', scmController.getDrift);
router.post('/projects/:id/drift/auto-heal', scmController.autoHealDrift);

// --- Rollback / Restore ---
router.post('/projects/:id/rollback/preview', scmController.previewRollback);
router.post('/projects/:id/rollback', scmController.executeRollback);

// --- Change Management ---
router.get('/changes', changeController.getAllChanges);
router.post('/changes', changeController.createChange);
router.get('/changes/:id', changeController.getChangeById);
router.put('/changes/:id/status', changeController.updateStatus);

// --- SCM Audit Trail ---
router.get('/audit', auditController.getAuditLogs);

// --- System & Tool Status (Fossil, Jenkins, Docker, Settings) ---
router.get('/system/fossil-status', systemController.getFossilStatus);
router.get('/system/jenkins-status', systemController.getJenkinsStatus);
router.get('/jenkins/status', systemController.getJenkinsStatus);
router.post('/jenkins/build', systemController.triggerJenkinsBuild);
router.post('/system/jenkins/build', systemController.triggerJenkinsBuild);
router.get('/system/docker-status', systemController.getDockerStatus);
router.get('/system/settings', systemController.getSettings);
router.post('/system/settings', systemController.updateSetting);
router.post('/system/seed', systemController.triggerSeed);

module.exports = router;
