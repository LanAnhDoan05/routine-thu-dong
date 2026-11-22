module.exports = {
  apps: [
    {
      name: 'routine-backend',
      script: './bin/www',
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5001,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5001,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      autorestart: true,
      restart_delay: 2000,
    },
  ],
};
