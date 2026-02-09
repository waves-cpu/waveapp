module.exports = {
  apps: [
    {
      name: 'waveapp',
      script: 'npm',
      args: 'run start',
      exec_mode: 'cluster',
      instances: '1',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
