import fastify, { type FastifyInstance } from 'fastify';
import { isTestEnv } from './config/env';
import { registerHealthRoutes } from './routes/health.routes';

/**
 * Fastify 애플리케이션 인스턴스를 초기화하고 공용 플러그인/라우트를 묶어 반환합니다.
 *
 * @returns 구성된 Fastify 인스턴스
 */
export default async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: !isTestEnv,
  });

  await app.register(registerHealthRoutes);

  await app.ready();

  return app;
}

export type { FastifyInstance };
