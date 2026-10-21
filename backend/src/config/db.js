require('./env');

const mongoose = require('mongoose');

/**
 * Database connection.
 *
 * MONGODB_URI (a MongoDB Atlas cluster string) is the intended source.
 * When it is missing *outside production* the app falls back to an
 * in-memory MongoDB (mongodb-memory-server) so students can run and
 * test the API locally with zero setup. In production a missing URI is
 * a hard failure with a clear message.
 *
 * The resolved connection is cached so serverless hosts reuse one
 * connection across invocations instead of exhausting the pool (C13).
 */
let cachedUri = null;
let memoryServer = null;

function maskUri(uri) {
  return uri.replace(/\/\/[^@]*@/, '//:***@');
}

async function resolveUri() {
  const envUri = process.env.MONGODB_URI;
  if (envUri) return { uri: envUri, label: maskUri(envUri) };

  if (process.env.NODE_ENV === 'production') {
    throw new Error('MONGODB_URI is not set. Add your MongoDB Atlas connection string to the environment.');
  }

  const { MongoMemoryServer } = require('mongodb-memory-server');
  if (!memoryServer) {
    memoryServer = await MongoMemoryServer.create();
  }
  return { uri: memoryServer.getUri('todo'), label: 'in-memory MongoDB (local dev fallback)' };
}

async function connectDB() {
  if (cachedUri && mongoose.connection.readyState === 1) {
    return { label: maskUri(cachedUri), reconnected: true };
  }

  const { uri, label } = await resolveUri();

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  cachedUri = uri;
  return { label };
}

module.exports = { connectDB };
