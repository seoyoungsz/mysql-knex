/**
 * Fastify 애플리케이션 빌더 모듈
 *
 * 플러그인과 라우트를 등록하여 완전히 구성된 Fastify 애플리케이션 인스턴스를 생성합니다.
 * 데이터베이스, 에러 핸들러, 인증, 라우트가 순서대로 등록됩니다.
 *
 * @module app
 * @example
 * ```typescript
 * import buildApp from './app';
 *
 * const app = buildApp();
 * await app.listen({ port: 3000, host: '0.0.0.0' });
 * ```
 */

import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import config from './config';
import databasePlugin from './plugins/database';
import errorHandlerPlugin from './plugins/error-handler';
import authPlugin from './plugins/auth';
import routes from './routes';

/**
 * Fastify 애플리케이션을 생성하고 구성합니다
 *
 * @function buildApp
 * @param {Partial<FastifyServerOptions>} opts - 기본 설정을 재정의할 추가 옵션 (테스트용으로 유용)
 * @returns {FastifyInstance} 완전히 구성된 Fastify 애플리케이션 인스턴스
 *
 * @description
 * 다음 순서로 플러그인을 등록합니다:
 * 1. 데이터베이스 플러그인 - Knex 인스턴스를 앱에 추가
 * 2. 에러 핸들러 플러그인 - 전역 에러 처리
 * 3. 인증 플러그인 - JWT 인증 설정
 * 4. 라우트 - API 엔드포인트 등록
 *
 * @example
 * ```typescript
 * // 기본 설정으로 앱 생성
 * const app = buildApp();
 *
 * // 커스텀 설정으로 앱 생성 (테스트용)
 * const testApp = buildApp({ logger: false });
 * ```
 */
function buildApp(opts: Partial<FastifyServerOptions> = {}): FastifyInstance {
  // 설정으로 Fastify 인스턴스 생성
  const app = fastify({
    logger: config.logger,
    ...opts,
  });

  // 플러그인을 순서대로 등록
  app.register(databasePlugin);
  app.register(errorHandlerPlugin);
  app.register(authPlugin);
  app.register(routes);

  return app;
}

export default buildApp;
export type { FastifyInstance };
