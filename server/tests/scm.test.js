process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const fossilService = require('../src/services/fossilService');
const projectService = require('../src/services/projectService');
const configurationService = require('../src/services/configurationService');
const baselineService = require('../src/services/baselineService');
const driftService = require('../src/services/driftService');
const rollbackService = require('../src/services/rollbackService');
const auditService = require('../src/services/auditService');
const { getDatabase } = require('../src/database/db');

test('SCM Backend Test Suite', async (t) => {
  let testProject = null;

  await t.test('1. Fossil SCM Detection', async () => {
    const health = await fossilService.isAvailable();
    assert.strictEqual(health.available, true, 'Fossil executable must be available');
    assert.ok(health.version, 'Fossil must report a version');
  });

  await t.test('2. Project Creation & Fossil Repo Init', async () => {
    testProject = await projectService.create({
      name: 'Test Microservice Stack',
      description: 'Automated test repository for SCM verification',
      owner: 'TestRunner'
    });

    assert.ok(testProject.id, 'Project should have an ID');
    assert.ok(fs.existsSync(testProject.repository_path), 'Repository file must exist on disk');
    assert.ok(fs.existsSync(testProject.workspace_path), 'Workspace directory must exist on disk');
  });

  await t.test('3. Configuration Item Creation & Fossil Commit', async () => {
    const item = await configurationService.saveConfigurationItem(testProject.id, {
      name: 'gateway.conf',
      itemPath: 'gateway.conf',
      content: 'server {\n  listen 80;\n  server_name gateway.local;\n}\n',
      fileType: 'conf',
      description: 'API Gateway configuration',
      user: 'TestRunner',
      commitMessage: 'feat(gateway): add initial API gateway config'
    });

    assert.ok(item.revision, 'Fossil should return a commit revision hash');

    // Verify file content retrieval via Fossil
    const fetched = await configurationService.getContent(testProject.id, item.id);
    assert.ok(fetched.content.includes('gateway.local'), 'File content should match committed content');
  });

  await t.test('4. Baseline Creation and SCM Tagging', async () => {
    const baseline = await baselineService.create({
      projectId: testProject.id,
      name: 'Release 1.0 Alpha',
      description: 'First tested baseline',
      user: 'TestRunner',
      status: 'Active'
    });

    assert.ok(baseline.baseline_code.startsWith('B-'), 'Baseline code should be formatted like B-001');
    assert.strictEqual(baseline.status, 'Active');
  });

  await t.test('5. Configuration Modification and Drift Detection', async () => {
    // Modify the gateway configuration
    await configurationService.saveConfigurationItem(testProject.id, {
      name: 'gateway.conf',
      itemPath: 'gateway.conf',
      content: 'server {\n  listen 80;\n  server_name gateway.local;\n  proxy_pass http://backend:8080;\n}\n',
      fileType: 'conf',
      description: 'API Gateway configuration with backend proxy',
      user: 'TestRunner',
      commitMessage: 'feat(gateway): add backend proxy pass directive'
    });

    // Detect drift relative to the baseline
    const driftReport = await driftService.detectDrift(testProject.id);
    assert.strictEqual(driftReport.status, 'DRIFT_DETECTED', 'Drift should be detected after modification');
    assert.ok(driftReport.summary.modified >= 1, 'At least 1 modified file should be detected');
  });

  await t.test('6. Revision Timeline Inspection', async () => {
    const timeline = await fossilService.getTimeline(testProject.workspace_path, 10);
    assert.ok(timeline.length >= 2, 'Timeline should contain at least 2 check-ins');
    assert.ok(timeline[0].revision, 'Each timeline entry must have a revision');
  });

  await t.test('7. Safe SCM Rollback Operation', async () => {
    const baselines = baselineService.getByProjectId(testProject.id);
    const alphaBaseline = baselines[0];

    // Rollback to alpha baseline revision
    const rollbackResult = await rollbackService.executeRollback(testProject.id, {
      targetRevision: alphaBaseline.revision_id,
      reason: 'Automated test rollback verification',
      user: 'TestRunner'
    });

    assert.strictEqual(rollbackResult.success, true);
    assert.ok(rollbackResult.newRevision, 'A new forward revision must be created for rollback');

    // Verify audit log has the rollback record
    const db = getDatabase();
    const auditRecord = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE project_id = ? AND action = 'CONFIGURATION_ROLLBACK'
      ORDER BY timestamp DESC LIMIT 1
    `).get(testProject.id);

    assert.ok(auditRecord, 'Audit trail must contain the rollback event');
    assert.strictEqual(auditRecord.user, 'TestRunner');

    // Clean up test project
    if (testProject && testProject.id) {
      projectService.delete(testProject.id);
    }
  });
});
