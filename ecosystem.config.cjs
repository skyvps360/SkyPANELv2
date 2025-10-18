module.exports = {
  apps: [
    {
      name: 'containerstacks-api',
      script: 'api/server.ts',
      cwd: __dirname,
      interpreter: 'node',
      interpreter_args: '--import tsx',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    },
    {
      name: 'containerstacks-ui',
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview --port 5173 --strictPort',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};