// PM2 config for Alibaba Cloud Linux + Node 22.
// Usage:
//   pm2 startOrReload ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'claw800',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',

        // Persist SQLite outside the code directory so deploys never wipe data.
        // You can override this in PM2 if your server uses a different path.
        CLAW800_DB_PATH: '/www/wwwroot/claw800-data/claw800.db',

        // Keep cookies working on both HTTP and HTTPS by default.
        // If you have HTTPS at the edge and want secure cookies, set COOKIE_SECURE=true in PM2.
        COOKIE_SECURE: 'false'
      }
    }
  ]
};

