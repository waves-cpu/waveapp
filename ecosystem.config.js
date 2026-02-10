module.exports = {
  apps: [
    {
      name: 'waveapp',
      script: 'next',
      args: 'start -p 3000',
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
