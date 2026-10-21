const path = require('path');
const fs = require('fs');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = path.resolve(ROOT_DIR, process.env.FOSSIL_DATA_DIR || './data');
const REPOS_DIR = path.join(DATA_DIR, 'repositories');
const WORKSPACES_DIR = path.join(DATA_DIR, 'workspaces');
const DB_PATH = path.resolve(ROOT_DIR, process.env.DATABASE_PATH || './data/scm_metadata.sqlite');

// Ensure essential data directories exist
[DATA_DIR, REPOS_DIR, WORKSPACES_DIR, path.dirname(DB_PATH)].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  ROOT_DIR,
  DATA_DIR,
  REPOS_DIR,
  WORKSPACES_DIR,
  DB_PATH,
  FOSSIL_PATH: process.env.FOSSIL_PATH || '',
  JENKINS_URL: process.env.JENKINS_URL || 'http://localhost:8080',
  DOCKER_HOST: process.env.DOCKER_HOST || ''
};
