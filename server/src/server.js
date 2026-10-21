const app = require('./app');
const config = require('./config');
const fossilService = require('./services/fossilService');
const watcherService = require('./services/watcherService');
const schedulerService = require('./services/schedulerService');
const { getDatabase } = require('./database/db');

async function autoSeedIfEmpty() {
  const db = getDatabase();
  const count = db.prepare('SELECT COUNT(*) as n FROM projects').get();
  if (count.n === 0) {
    console.log('[AutoSeed] No projects found — running demo seed automatically...');
    try {
      require('./database/seed');
      // seed.js is synchronous/async — give it a moment
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('[AutoSeed] ✔ Demo project seeded successfully.');
    } catch (err) {
      console.warn('[AutoSeed] ⚠ Auto-seed failed:', err.message);
    }
  } else {
    console.log(`[AutoSeed] Skipped — ${count.n} project(s) already exist.`);
  }
}

async function startServer() {
  const fossilHealth = await fossilService.isAvailable();
  console.log('---------------------------------------------------------');
  console.log('⏳ SOFTWARE CONFIGURATION TIME MACHINE — SCM BACKEND ⏳');
  console.log('---------------------------------------------------------');

  if (fossilHealth.available) {
    console.log(`✓ Fossil SCM Engine: CONNECTED (v${fossilHealth.version})`);
    console.log(`  Path: ${fossilHealth.executablePath}`);
  } else {
    console.warn('⚠ Fossil SCM Engine: NOT DETECTED in default paths.');
    console.warn('  Ensure Fossil is installed or configure FOSSIL_PATH in .env');
  }

  console.log(`✓ SQLite Database: ${config.DB_PATH}`);
  console.log(`✓ Data Directory:  ${config.DATA_DIR}`);
  console.log('---------------------------------------------------------');

  // Auto-seed demo data on first run
  await autoSeedIfEmpty();

  // Start HTTP server
  app.listen(config.PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${config.PORT}`);
    console.log('---------------------------------------------------------');

    // Start file-change auto-commit watcher (after server is up)
    watcherService.watchAllProjects();

    // Start scheduled drift detection (15-min intervals)
    schedulerService.start();

    console.log('🤖 Automation: File watcher + Drift scanner are ACTIVE.');
    console.log('---------------------------------------------------------');
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received — shutting down gracefully...');
  watcherService.stopAll();
  schedulerService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received — shutting down...');
  watcherService.stopAll();
  schedulerService.stop();
  process.exit(0);
});

startServer();
