const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const { getDatabase } = require('./database/db');

const app = express();

// Initialize SQLite database
getDatabase();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), system: 'Software Configuration Time Machine' });
});

// REST API
app.use('/api', apiRoutes);

// In production, serve the built React client if available
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }
  const indexFile = path.join(clientDist, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      next();
    }
  });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: `Not Found: ${req.method} ${req.url}` });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[SCM Server Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    status
  });
});

module.exports = app;
