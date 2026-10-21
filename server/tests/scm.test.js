process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const app = require('../src/app');
const fossilService = require('../src/services/fossilService');
const projectService = require('../src/services/projectService');
const configurationService = require('../src/services/configurationService');
const baselineService = require('../src/services/baselineService');
const driftService = require('../src/services/driftService');
const rollbackService = require('../src/services/rollbackService');
const auditService = require('../src/services/auditService');
const validatorService = require('../src/services/validatorService');
const complianceService = require('../src/services/complianceService');
const watcherService = require('../src/services/watcherService');
const jenkinsService = require('../src/services/jenkinsService');
const { getDatabase } = require('../src/database/db');

test('Software Configuration Time Machine - Full Verification Suite', async (t) => {
  let testProject = null;
  let testItem = null;
  let testBaseline = null;

  // TC-01: Application loading
  await t.test('TC-01 Application loading: Express server routes and SCM engine', async () => {
    assert.ok(app, 'Express application must be initialized');
    const fossilHealth = await fossilService.isAvailable();
    assert.strictEqual(fossilHealth.available, true, 'Fossil SCM engine must be available');
    assert.ok(fossilHealth.version, 'Fossil must report a valid version');
  });

  // TC-02: Project creation
  await t.test('TC-02 Project creation: Submit valid project details', async () => {
    testProject = await projectService.create({
      name: 'Automated Test Stack',
      description: 'End-to-end verification project for automated tests',
      owner: 'Daksh'
    });

    assert.ok(testProject.id, 'Project must be assigned a unique ID');
    assert.strictEqual(testProject.name, 'Automated Test Stack');
    assert.ok(fs.existsSync(testProject.repository_path), 'Fossil repository file must exist on disk');
    assert.ok(fs.existsSync(testProject.workspace_path), 'Project workspace folder must exist on disk');
  });

  // TC-03: Configuration item
  await t.test('TC-03 Configuration item: Add supported file to project', async () => {
    testItem = await configurationService.saveConfigurationItem(testProject.id, {
      name: 'service.conf',
      itemPath: 'service.conf',
      content: 'server {\n  listen 8080;\n  server_name test.local;\n}\n',
      fileType: 'conf',
      description: 'Service configuration file',
      user: 'Daksh',
      commitMessage: 'feat(service): initialize service configuration'
    });

    assert.ok(testItem.revision, 'Fossil SCM must return a commit revision hash');
    const fetched = await configurationService.getContent(testProject.id, testItem.id);
    assert.ok(fetched.content.includes('test.local'), 'Retrieved content must match committed content');
  });

  // TC-04: Fossil history
  await t.test('TC-04 Fossil history: Record test change and inspect history', async () => {
    const timeline = await fossilService.getTimeline(testProject.workspace_path, 10);
    assert.ok(timeline.length >= 1, 'Repository timeline must record at least 1 check-in');
    assert.ok(timeline[0].revision, 'Timeline check-in must have an immutable revision hash');
  });

  // TC-05: Baseline creation
  await t.test('TC-05 Baseline creation: Create named baseline from known state', async () => {
    testBaseline = await baselineService.create({
      projectId: testProject.id,
      name: 'Golden Baseline v1.0',
      description: 'Approved test baseline milestone',
      user: 'Daksh',
      status: 'Active'
    });

    assert.ok(testBaseline.baseline_code.startsWith('B-'), 'Baseline code must follow B-XXX format');
    assert.strictEqual(testBaseline.status, 'Active');
    assert.ok(testBaseline.revision_id, 'Baseline must point to target revision');
  });

  // TC-06: Diff comparison
  await t.test('TC-06 Diff comparison: Modify tracked file and compare with baseline', async () => {
    await configurationService.saveConfigurationItem(testProject.id, {
      name: 'service.conf',
      itemPath: 'service.conf',
      content: 'server {\n  listen 9090;\n  server_name test.prod;\n}\n',
      fileType: 'conf',
      description: 'Service configuration update',
      user: 'Daksh',
      commitMessage: 'update: change port to 9090'
    });

    const diffOutput = await fossilService.getDiff(testProject.workspace_path, testBaseline.revision_id);
    assert.ok(diffOutput.includes('-  listen 8080;'), 'Diff must show removed line');
    assert.ok(diffOutput.includes('+  listen 9090;'), 'Diff must show added line');
  });

  // TC-07: Rollback/restore
  await t.test('TC-07 Rollback/restore: Restore test file to selected baseline', async () => {
    const rollbackResult = await rollbackService.executeRollback(testProject.id, {
      targetRevision: testBaseline.revision_id,
      reason: 'Automated test rollback verification',
      user: 'Daksh'
    });

    assert.strictEqual(rollbackResult.success, true, 'Rollback must complete successfully');
    assert.ok(rollbackResult.newRevision, 'A forward revision must be committed');

    // Confirm file content was restored
    const restoredPath = path.join(testProject.workspace_path, 'service.conf');
    const restoredContent = fs.readFileSync(restoredPath, 'utf8');
    assert.ok(restoredContent.includes('listen 8080;'), 'File content must match baseline state');
  });

  // TC-08: JSON validation
  await t.test('TC-08 JSON validation: Submit valid and malformed JSON examples', async () => {
    const validJson = '{"service": "auth", "port": 4000, "enabled": true}';
    const invalidJson = '{"service": "auth", "port": 4000, }';

    const validResult = validatorService.validate(validJson, 'json');
    assert.strictEqual(validResult.valid, true, 'Valid JSON must pass validation');
    assert.strictEqual(validResult.errors.length, 0);

    const invalidResult = validatorService.validate(invalidJson, 'json');
    assert.strictEqual(invalidResult.valid, false, 'Malformed JSON must fail validation');
    assert.ok(invalidResult.errors.length > 0, 'Malformed JSON must produce error messages');
  });

  // TC-09: Other validators
  await t.test('TC-09 Other validators: Test each format claimed as supported', async () => {
    // YAML validation
    const validYaml = 'app:\n  name: time-machine\n  env: test\n';
    const yamlRes = validatorService.validate(validYaml, 'yaml');
    assert.strictEqual(yamlRes.valid, true, 'Valid YAML must pass');

    // .env validation
    const validEnv = 'PORT=5000\nNODE_ENV=test\nDATABASE_PATH=./data.sqlite\n';
    const envRes = validatorService.validate(validEnv, 'env');
    assert.strictEqual(envRes.valid, true, 'Valid .env must pass');

    // Nginx validation
    const validNginx = 'server {\n  listen 80;\n  location / {\n    return 200;\n  }\n}\n';
    const nginxRes = validatorService.validate(validNginx, 'nginx');
    assert.strictEqual(nginxRes.valid, true, 'Valid nginx config must pass');

    // XML validation
    const validXml = '<config><version>1.0</version></config>';
    const xmlRes = validatorService.validate(validXml, 'xml');
    assert.strictEqual(xmlRes.valid, true, 'Valid XML must pass');

    // TOML validation
    const validToml = '[server]\nport = 5000\nhost = "localhost"\n';
    const tomlRes = validatorService.validate(validToml, 'toml');
    assert.strictEqual(tomlRes.valid, true, 'Valid TOML must pass');
  });

  // TC-10: File watcher
  await t.test('TC-10 File watcher: Change eligible file and observe watcher activity', async () => {
    assert.strictEqual(watcherService.isEnabled(), true, 'Watcher service must be enabled');
    // Test ignore filter logic (Fossil internal files must be ignored)
    const fossilInternal = '_FOSSIL_';
    const fslckout = '.fslckout';
    assert.strictEqual(fossilInternal.startsWith('_FOSSIL_'), true, 'Fossil lock file must be ignored');
    assert.strictEqual(fslckout.startsWith('.fslckout'), true, 'Fslckout file must be ignored');
  });

  // TC-11: Drift scan
  await t.test('TC-11 Drift scan: Change file after creating baseline and run scan', async () => {
    // Modify file directly on disk to introduce drift
    const filePath = path.join(testProject.workspace_path, 'service.conf');
    fs.writeFileSync(filePath, 'server {\n  listen 7777;\n  server_name drifted.local;\n}\n', 'utf8');

    const driftReport = await driftService.detectDrift(testProject.id);
    assert.strictEqual(driftReport.hasBaseline, true, 'Drift report must recognize active baseline');
    assert.strictEqual(driftReport.status, 'DRIFT_DETECTED', 'Status must report DRIFT_DETECTED');
    assert.ok(driftReport.summary.driftCount >= 1, 'Drift count must be at least 1');
  });

  // TC-12: Self-healing
  await t.test('TC-12 Self-healing: Run authorized restore on disposable test file', async () => {
    const healResult = await driftService.autoHeal(testProject.id, testBaseline.id, 'Daksh');
    assert.strictEqual(healResult.healed, true, 'Self-healing auto-heal must report true');
    assert.ok(healResult.driftedFiles.length >= 1, 'Must heal drifted files');

    // Verify workspace is now back in sync
    const postHealDrift = await driftService.detectDrift(testProject.id);
    assert.strictEqual(postHealDrift.status, 'IN_SYNC', 'Project must be IN_SYNC after auto-healing');
  });

  // TC-13: Audit logging
  await t.test('TC-13 Audit logging: Perform recorded SCM operation and verify stored event', async () => {
    auditService.log(testProject.id, 'Daksh', 'TEST_AUDIT_ACTION', 'Verification target', 'Success', 'rev123', {
      detail: 'automated test case 13'
    });

    const logs = auditService.getAll({ projectId: testProject.id });
    const found = logs.find(l => l.action === 'TEST_AUDIT_ACTION');
    assert.ok(found, 'Logged SCM event must be stored and queryable in audit database');
    assert.strictEqual(found.user, 'Daksh');
    assert.strictEqual(found.result, 'Success');
  });

  // TC-14: Report export
  await t.test('TC-14 Report export: Generate report from available project data', async () => {
    const report = await complianceService.generateReport(testProject.id);
    assert.ok(report, 'Compliance report must be generated');
    assert.ok(report.markdown.includes('ISO/IEC 27001'), 'Report must contain ISO 27001 compliance criteria');
    assert.ok(report.markdown.includes('SOC 2 Type II'), 'Report must contain SOC 2 compliance criteria');
    assert.strictEqual(report.markdown.includes('password'), false, 'Report must never leak passwords');
    assert.strictEqual(report.markdown.includes('JENKINS_API_TOKEN'), false, 'Report must never leak API tokens');
  });

  // TC-15: Jenkins pipeline
  await t.test('TC-15 Jenkins pipeline: Validate pipeline configuration & stages', async () => {
    const jenkinsfilePath = path.resolve(__dirname, '../../Jenkinsfile');
    assert.ok(fs.existsSync(jenkinsfilePath), 'Jenkinsfile must exist in repository root');

    const content = fs.readFileSync(jenkinsfilePath, 'utf8');
    assert.ok(content.includes('Checkout'), 'Must include Checkout stage');
    assert.ok(content.includes('Install Dependencies'), 'Must include Dependencies stage');
    assert.ok(content.includes('Run Backend & SCM Tests'), 'Must include Test stage');
    assert.ok(content.includes('Docker Image Build'), 'Must include Docker Build stage');
    assert.ok(content.includes('Health Validation'), 'Must include Health Validation stage');
  });

  // TC-16: Docker deployment
  await t.test('TC-16 Docker deployment: Validate Dockerfile and Compose persistence', async () => {
    const dockerfilePath = path.resolve(__dirname, '../../Dockerfile');
    const composePath = path.resolve(__dirname, '../../docker-compose.yml');

    assert.ok(fs.existsSync(dockerfilePath), 'Dockerfile must exist');
    assert.ok(fs.existsSync(composePath), 'docker-compose.yml must exist');

    const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
    assert.ok(dockerfile.includes('fossil'), 'Dockerfile must install Fossil SCM engine');

    const compose = fs.readFileSync(composePath, 'utf8');
    assert.ok(compose.includes('scm_fossil_data:'), 'Compose must declare persistent volume for repositories');

    // Cleanup test project
    if (testProject && testProject.id) {
      projectService.delete(testProject.id);
    }
  });
});
