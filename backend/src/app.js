require('./config/env');

const express = require('express');
const cors = require('cors');

const taskRoutes = require('./routes/task.routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

/**
 * The Express app itself — shared by the local server (server.js) and
 * any serverless host, so the app is never `listen()`ing twice.
 */

const app = express();

app.disable('x-powered-by');

// Bodies are capped at 100kb so a runaway client cannot exhaust memory (C4).
app.use(express.json({ limit: '100kb' }));

// CORS — an explicit origin list read from the environment (C8).
// CORS_ORIGINS is a comma-separated list; "*" or an empty value allows
// every origin (handy in development).
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// Health check — also the Render health-check path.
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy', data: { status: 'up' } });
});

app.use('/api/v1/tasks', taskRoutes);

// Unknown routes → 404 envelope; anything left → central error handler.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
