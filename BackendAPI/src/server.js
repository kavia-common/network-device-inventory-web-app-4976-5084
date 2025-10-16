require('dotenv').config();
const app = require('./app');

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`[Server] Listening on http://${HOST}:${PORT} (env=${env})`);
});

process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
});

module.exports = server;
