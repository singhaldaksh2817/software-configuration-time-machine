const projectService = require('../services/projectService');
const configurationService = require('../services/configurationService');
const baselineService = require('../services/baselineService');
const changeService = require('../services/changeService');
const auditService = require('../services/auditService');
const { getDatabase } = require('./db');

async function seedDemoProject() {
  const db = getDatabase();
  const existing = db.prepare("SELECT * FROM projects WHERE name = 'E-Commerce Platform'").get();
  if (existing) {
    return existing;
  }

  console.log('Seeding demo project with real Fossil commits and baselines...');

  // 1. Create Project (initializes Fossil repo on disk)
  const project = await projectService.create({
    name: 'E-Commerce Platform',
    description: 'Enterprise high-availability retail platform configuration repository',
    owner: 'Daksh'
  });

  // 2. Add realistic configuration files & commit each one to Fossil
  const appYml = `server:
  port: 8080
  compression:
    enabled: true
    mime-types: application/json,application/xml,text/html

spring:
  application:
    name: ecommerce-core-service
  cache:
    type: redis
    redis:
      time-to-live: 3600000

resilience4j:
  circuitbreaker:
    instances:
      paymentService:
        slidingWindowSize: 20
        failureRateThreshold: 50
        waitDurationInOpenState: 10000
`;

  const dbYml = `datasource:
  driver-class-name: org.postgresql.Driver
  url: jdbc:postgresql://db-primary.internal.net:5432/ecommerce_prod
  username: pg_ecom_app
  hikari:
    maximum-pool-size: 50
    minimum-idle: 10
    idle-timeout: 30000
    connection-timeout: 20000
    leak-detection-threshold: 2000

replica:
  enabled: true
  url: jdbc:postgresql://db-replica.internal.net:5432/ecommerce_prod
  read-only: true
`;

  const nginxConf = `worker_processes auto;

events {
  worker_connections 2048;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  sendfile on;
  keepalive_timeout 65;
  gzip on;

  upstream backend_nodes {
    least_conn;
    server app1.internal:8080 max_fails=3 fail_timeout=10s;
    server app2.internal:8080 max_fails=3 fail_timeout=10s;
  }

  server {
    listen 80;
    server_name api.ecommerce.internal;
    return 301 https://$host$request_uri;
  }
}
`;

  const dockerCompose = `version: '3.8'

services:
  api:
    image: ecommerce/core-api:1.0.0
    restart: always
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ecommerce_prod
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
`;

  const monitoringYml = `global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'ecommerce-api'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['api:8080']

rule_files:
  - 'alerts/*.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
`;

  // Commit configuration items in sequence to Fossil SCM
  await configurationService.saveConfigurationItem(project.id, {
    name: 'application.yml',
    itemPath: 'application.yml',
    content: appYml,
    fileType: 'yaml',
    description: 'Spring Boot microservice configuration',
    user: 'Daksh',
    commitMessage: 'feat(config): initialize application microservice settings'
  });

  await configurationService.saveConfigurationItem(project.id, {
    name: 'database.yml',
    itemPath: 'database.yml',
    content: dbYml,
    fileType: 'yaml',
    description: 'PostgreSQL primary & read-replica configuration',
    user: 'Daksh',
    commitMessage: 'feat(database): configure production PostgreSQL pool'
  });

  await configurationService.saveConfigurationItem(project.id, {
    name: 'nginx.conf',
    itemPath: 'nginx.conf',
    content: nginxConf,
    fileType: 'conf',
    description: 'Edge reverse proxy and SSL routing',
    user: 'Daksh',
    commitMessage: 'feat(nginx): configure upstream load balancing'
  });

  await configurationService.saveConfigurationItem(project.id, {
    name: 'docker-compose.yml',
    itemPath: 'docker-compose.yml',
    content: dockerCompose,
    fileType: 'yaml',
    description: 'Production container orchestrator file',
    user: 'Daksh',
    commitMessage: 'feat(docker): setup multi-container deployment stack'
  });

  const monItem = await configurationService.saveConfigurationItem(project.id, {
    name: 'monitoring.yml',
    itemPath: 'monitoring.yml',
    content: monitoringYml,
    fileType: 'yaml',
    description: 'Prometheus metrics and alerting rules',
    user: 'Daksh',
    commitMessage: 'feat(telemetry): add Prometheus monitoring rules'
  });

  // 3. Create Baseline 1: Production Release 1.0 (B-001)
  const b1 = await baselineService.create({
    projectId: project.id,
    name: 'Production Release 1.0',
    description: 'Golden baseline for Q3 initial production launch',
    revisionId: monItem.revision,
    user: 'Daksh',
    status: 'Active'
  });

  // 4. Create Change Request 1: CR-101
  const cr1 = changeService.create({
    projectId: project.id,
    title: 'Increase Database Connection Pool and Idle Timeout',
    description: 'Scale Hikari connection pool from 50 to 100 connections to support holiday peak traffic load.',
    reason: 'Anticipated 200% traffic surge for upcoming sales campaign',
    priority: 'High',
    requestedBy: 'Lead DevOps Engineer',
    assignedTo: 'Daksh',
    affectedItems: ['database.yml']
  });

  // Apply change to database.yml and commit revision to Fossil
  const updatedDbYml = dbYml.replace('maximum-pool-size: 50', 'maximum-pool-size: 100')
                            .replace('minimum-idle: 10', 'minimum-idle: 25');
  const dbCommit = await configurationService.saveConfigurationItem(project.id, {
    name: 'database.yml',
    itemPath: 'database.yml',
    content: updatedDbYml,
    fileType: 'yaml',
    description: 'PostgreSQL primary & read-replica configuration',
    user: 'Daksh',
    commitMessage: 'fix(database): implement CR-101 - increase connection pool to 100'
  });

  changeService.updateStatus(cr1.id, {
    status: 'Implemented',
    user: 'Daksh',
    relatedRevision: dbCommit.revision,
    notes: 'Connection pool verified in pre-prod stress testing'
  });

  // 5. Create Change Request 2: CR-102
  const cr2 = changeService.create({
    projectId: project.id,
    title: 'Configure Rate Limiting in Nginx for DDoS Protection',
    description: 'Add limit_req_zone to mitigate brute-force and credential stuffing attacks on /api endpoints.',
    reason: 'Security audit recommendation SEC-402',
    priority: 'Critical',
    requestedBy: 'Security Lead',
    assignedTo: 'Daksh',
    affectedItems: ['nginx.conf']
  });

  const updatedNginx = nginxConf.replace(
    'gzip on;',
    `gzip on;\n  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;`
  );
  const nginxCommit = await configurationService.saveConfigurationItem(project.id, {
    name: 'nginx.conf',
    itemPath: 'nginx.conf',
    content: updatedNginx,
    fileType: 'conf',
    description: 'Edge reverse proxy with security rate limiting',
    user: 'Daksh',
    commitMessage: 'sec(nginx): implement CR-102 - rate limiting zone api_limit'
  });

  changeService.updateStatus(cr2.id, {
    status: 'Implemented',
    user: 'Daksh',
    relatedRevision: nginxCommit.revision,
    notes: 'Rate limits tested against mock load'
  });

  // 6. Create Baseline 2: Staging Release 1.1 (B-002)
  await baselineService.create({
    projectId: project.id,
    name: 'Staging Release 1.1',
    description: 'Includes DB pool scaling and edge DDoS rate limits',
    revisionId: nginxCommit.revision,
    user: 'Daksh',
    status: 'Approved'
  });

  // 7. Create Change Request 3: Pending Review (CR-103)
  changeService.create({
    projectId: project.id,
    title: 'Migrate Redis Cache to Cluster Mode',
    description: 'Upgrade single-node Redis cache in application.yml to a 3-shard distributed cluster topology.',
    reason: 'Session state failover redundancy',
    priority: 'Medium',
    requestedBy: 'Architect',
    assignedTo: 'Daksh',
    affectedItems: ['application.yml', 'docker-compose.yml']
  });

  console.log('Demo project seeded successfully with Fossil revisions and baselines.');
  return projectService.getById(project.id);
}

if (require.main === module) {
  seedDemoProject()
    .then(p => {
      console.log('Done! Seeded project ID:', p.id, 'Name:', p.name);
      process.exit(0);
    })
    .catch(err => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = seedDemoProject;
