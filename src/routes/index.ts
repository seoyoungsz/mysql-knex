/**
 * 라우트 인덱스
 * 모든 애플리케이션 라우트를 등록합니다
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

/**
 * 루트 라우트 플러그인
 */
const routes: FastifyPluginAsync = async fastify => {
  // 헬스 체크 엔드포인트
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 데이터베이스 연결 테스트
      await fastify.knex.raw('SELECT 1');

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch (error) {
      reply.code(503);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      };
    }
  });

  // API 버전 엔드포인트
  fastify.get('/api/version', async () => {
    return {
      version: '1.0.0',
      name: 'Community Board API',
    };
  });

  // 인증 테스트 엔드포인트
  fastify.get(
    '/api/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (request: FastifyRequest) => {
      return {
        user: request.user,
      };
    }
  );
};

export default routes;
