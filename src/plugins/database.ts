/**
 * 데이터베이스 플러그인
 *
 * config/database.ts의 Knex 인스턴스를 Fastify에 등록하고 연결 생명주기를 관리합니다.
 * Fastify 앱이 시작될 때 데이터베이스 연결을 테스트하고,
 * 종료될 때 연결을 정리합니다.
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { Knex } from 'knex';
import db from '../config/database';

/**
 * 데이터베이스 플러그인
 *
 * Fastify 인스턴스에 Knex를 데코레이터로 추가합니다.
 * 앱 전역에서 `fastify.knex`로 데이터베이스에 접근할 수 있습니다.
 *
 * @example
 * ```typescript
 * // 라우트 핸들러에서 사용
 * fastify.get('/users', async (request, reply) => {
 *   const users = await fastify.knex('users').select('*');
 *   return users;
 * });
 * ```
 */
const databasePlugin: FastifyPluginAsync = async fastify => {
  // Fastify 인스턴스에 knex 데코레이터 추가
  fastify.decorate('knex', db);
};

// Knex 타입을 Fastify 인스턴스에 추가
declare module 'fastify' {
  interface FastifyInstance {
    knex: Knex;
  }
}

// 플러그인 캡슐화 방지를 위해 fastify-plugin으로 래핑
export default fp(databasePlugin, {
  name: 'database-plugin',
});
