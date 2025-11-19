import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import redisClient from '../config/redis';

const router = Router();

/**
 * Health check básico
 * GET /health
 */
router.get('/', async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Health check detalhado
 * GET /health/detailed
 */
router.get('/detailed', async (_req: Request, res: Response) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: { status: 'unknown' as 'ok' | 'error' | 'unknown', responseTime: 0 },
      redis: { status: 'unknown' as 'ok' | 'error' | 'unknown', responseTime: 0 },
    },
    system: {
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
      },
      cpu: {
        usage: 0,
      },
    },
  };

  // Verificar PostgreSQL
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    healthCheck.services.database.status = 'ok';
    healthCheck.services.database.responseTime = Date.now() - start;
  } catch (error) {
    healthCheck.services.database.status = 'error';
    healthCheck.status = 'error';
  }

  // Verificar Redis
  try {
    const start = Date.now();
    await redisClient.ping();
    healthCheck.services.redis.status = 'ok';
    healthCheck.services.redis.responseTime = Date.now() - start;
  } catch (error) {
    healthCheck.services.redis.status = 'error';
    healthCheck.status = 'error';
  }

  // Informações do sistema
  const memUsage = process.memoryUsage();
  healthCheck.system.memory.used = Math.round(memUsage.heapUsed / 1024 / 1024); // MB
  healthCheck.system.memory.total = Math.round(memUsage.heapTotal / 1024 / 1024); // MB
  healthCheck.system.memory.percentage = Math.round(
    (memUsage.heapUsed / memUsage.heapTotal) * 100
  );

  // CPU usage (aproximado via uptime)
  const cpuUsage = process.cpuUsage();
  healthCheck.system.cpu.usage = Math.round(
    ((cpuUsage.user + cpuUsage.system) / 1000000 / process.uptime()) * 100
  ) / 100;

  // Retornar status HTTP apropriado
  const statusCode = healthCheck.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

/**
 * Health check do banco de dados
 * GET /health/db
 */
router.get('/db', async (_req: Request, res: Response) => {
  try {
    const start = Date.now();
    const result = await pool.query('SELECT NOW() as now, version() as version');
    const responseTime = Date.now() - start;

    // Verificar número de conexões
    const poolStats = await pool.query(`
      SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        responseTime,
        serverTime: result.rows[0].now,
        version: result.rows[0].version,
        connections: poolStats.rows[0],
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error.message,
      },
    });
  }
});

/**
 * Health check do Redis
 * GET /health/redis
 */
router.get('/redis', async (_req: Request, res: Response) => {
  try {
    const start = Date.now();
    const pong = await redisClient.ping();
    const responseTime = Date.now() - start;

    // Obter informações do Redis
    const info = await redisClient.info();
    const lines = info.split('\r\n');
    const stats: any = {};

    lines.forEach((line: string) => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key.trim()] = value.trim();
        }
      }
    });

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      redis: {
        connected: pong === 'PONG',
        responseTime,
        version: stats.redis_version || 'unknown',
        uptimeSeconds: parseInt(stats.uptime_in_seconds || '0'),
        connectedClients: parseInt(stats.connected_clients || '0'),
        usedMemory: stats.used_memory_human || 'unknown',
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      redis: {
        connected: false,
        error: error.message,
      },
    });
  }
});

/**
 * Readiness check (para Kubernetes/Docker)
 * GET /health/ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Verificar se serviços essenciais estão prontos
    await pool.query('SELECT 1');
    await redisClient.ping();

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Liveness check (para Kubernetes/Docker)
 * GET /health/live
 */
router.get('/live', (_req: Request, res: Response) => {
  // Processo está vivo?
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
