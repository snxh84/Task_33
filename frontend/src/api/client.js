import axios from 'axios';

/**
 * Shared Axios instance for every API call (Part 2, step 1).
 *
 * The base URL comes from VITE_API_URL so the same build works against
 * localhost during development and Render in production.
 */
const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

const client = axios.create({
  baseURL: `${base}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

/**
 * Response interceptor — turns the API's standard error envelope
 * (§2.1: { success, message, errors }) into one friendly, UI-ready
 * message. Every failure path in the app then reads the same way
 * (Part 2, step 5: error handling).
 */
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const payload = error.response?.data;
    let message;

    if (payload?.errors?.length) {
      message = payload.errors
        .map((e) => (e.field && e.field !== 'body' ? `${e.field}: ${e.msg}` : e.msg))
        .join(' • ');
    } else if (payload?.message) {
      message = payload.message;
    } else if (error.code === 'ECONNABORTED') {
      message = 'The request timed out. Please try again.';
    } else if (!error.response) {
      message = 'Cannot reach the server. Is the backend running and CORS configured?';
    } else {
      message = 'Something went wrong. Please try again.';
    }

    error.friendlyMessage = message;
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error) =>
  error?.friendlyMessage || error?.message || 'Unexpected error';

export default client;
