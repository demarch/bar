/**
 * Configuração PM2 para o Backend
 * Sistema de Gestão de Bar
 *
 * Documentação: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [
    {
      // Configuração principal da aplicação
      name: 'bar-system-backend',
      script: './dist/server.js',

      // Modo de execução
      instances: process.env.PM2_INSTANCES || 2, // Cluster mode: 2 instâncias (ou definir via env)
      exec_mode: 'cluster', // cluster ou fork

      // Auto-restart
      watch: false, // Não observar arquivos em produção
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Variáveis de ambiente
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Logs
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true, // Prefixar logs com timestamp
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true, // Mesclar logs de múltiplas instâncias

      // Rotação de logs (requer pm2-logrotate)
      // pm2 install pm2-logrotate

      // Recursos
      max_memory_restart: '500M', // Reiniciar se usar mais de 500MB

      // Graceful shutdown
      kill_timeout: 5000, // Tempo para graceful shutdown (ms)
      wait_ready: true, // Aguardar sinal ready
      listen_timeout: 10000, // Timeout para listen

      // Reload progressivo em cluster mode
      increment_var: 'PORT', // Incrementar porta para cada instância

      // Health check (opcional)
      // Requer pm2-health
      // pm2 install pm2-health
    },
  ],

  /**
   * Deployment - Configuração para deploy automático
   * Descomente e configure se quiser usar pm2 deploy
   */
  // deploy: {
  //   production: {
  //     user: 'deploy',
  //     host: ['seu-servidor.com'],
  //     ref: 'origin/main',
  //     repo: 'git@github.com:seu-usuario/bar-system.git',
  //     path: '/var/www/bar-system',
  //     'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
  //     'pre-setup': 'apt-get install git',
  //   },
  // },
};
