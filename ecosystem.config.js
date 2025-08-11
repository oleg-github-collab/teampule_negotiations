// PM2 Production Configuration
module.exports = {
  apps: [
    {
      name: 'teampulse-turbo',
      script: 'server.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      
      // Process management
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'data'],
      
      // Auto-restart on changes (only for development)
      watch_options: {
        followSymlinks: false
      },
      
      // Performance
      node_args: '--max-old-space-size=2048',
      
      // Health check
      health_check_grace_period: 3000,
      health_check_interval: 30000
    }
  ]
};