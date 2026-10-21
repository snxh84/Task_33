require('./env');

const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

/**
 * Database connection.
 *
 * MONGODB_URI (a MongoDB Atlas cluster string) is the intended source.
 * When it is missing *outside production* the app falls back to an
 * in-memory MongoDB (mongodb-memory-server) so students can run and
 * test the API locally with zero setup. In production a missing URI is
 * a hard failure with a clear message in the response body.
 *
 * Serverless (plan challenge C13): on Vercel the app.js module is the
 * entry point and is loaded once per warm instance. The connection is
 * cached at module level and the in-flight promise is shared, so
 * concurrent cold-start requests reuse ONE connect() call instead of
 * racing each other or exhausting the Atlas connection pool.
 */
let cachedLabel = null;
let connectionPromise = null;
let memoryServer = null;

function maskUri(uri) {
  return uri.replace(/\/\/[^@]*@/, '//:***@');
}

async function resolveUri() {
  const envUri = process.env.MONGODB_URI;
  if (envUri) return { uri: envUri, label: maskUri(envUri) };

  if (process.env.NODE_ENV === 'production') {
    throw new ApiError(
      500,
      'MONGODB_URI is not set. Add your MongoDB Atlas connection string to the environment (e.g. MONGODB_URI=mongodb+srv://…).'
    );
  }

  const { MongoMemoryServer } = require('mongodb-memory-server');
  if (!memoryServer) {
    memoryServer = await MongoMemoryServer.create();
  }
  return { uri: memoryServer.getUri('todo'), label: 'in-memory MongoDB (local dev fallback)' };
}

function connectDB() {
  const state = mongoose.connection.readyState;

  // 1 = connected: everything after the first request is a cheap check.
  if (state === 1 && cachedLabel) return Promise.resolve({ label: cachedLabel });

  // 2 = still connecting: join the in-flight attempt (no duplicate connect).
  if (state === 2 && connectionPromise) return connectionPromise;

  // 0 = disconnected (dropped, or first ever call): (re)connect.
  if (state === 0) connectionPromise = null;

  if (!connectionPromise) {
    connectionPromise = (async () => {
      const { uri, label } = await resolveUri();
      mongoose.set('strictQuery', true);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      cachedLabel = label;
      return { label };
    })();

    // On failure, clear the promise so the NEXT request retries instead
    // of being handed a permanently rejected one.
    connectionPromise.catch(() => {
      connectionPromise = null;
    });
  }

  return connectionPromise;
}

module.exports = { connectDB };
