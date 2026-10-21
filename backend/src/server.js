require('./config/env');

const app = require('./app');
const { connectDB } = require('./config/db');

// The API plan specified 5000, but macOS AirPlay Receiver (ControlCenter)
// already binds port 5000, so the local default is 5001. Render sets its
// own PORT, and PORT can be overridden in .env.
const PORT = process.env.PORT || 5001;

/**
 * Local entry point — connects to MongoDB, then starts listening.
 * (app.js holds the Express app itself, so there is exactly one place
 * that calls listen().)
 */
(async () => {
  try {
    const db = await connectDB();
    console.log(`✓ MongoDB connected: ${db.label}`);

    app.listen(PORT, () => {
      console.log(`✓ API server listening on http://localhost:${PORT}`);
      console.log(`  Routes: http://localhost:${PORT}/api/v1/tasks`);
      console.log(`  Health: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err.message);
    process.exit(1);
  }
})();

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
