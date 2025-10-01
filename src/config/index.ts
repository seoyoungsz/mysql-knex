/**
 * Config 모듈 - Barrel Export
 *
 * config 폴더의 모든 설정을 중앙에서 통합하여 export합니다.
 * 다른 모듈에서는 이 파일을 통해 모든 설정에 접근할 수 있습니다.
 *
 * @module config
 * @example
 * ```typescript
 * // 방법 1: 개별 import
 * import { env, fastifyConfig, db } from './config';
 *
 * // 방법 2: default import (Fastify 설정)
 * import config from './config';
 * const app = fastify({ logger: config.logger });
 * ```
 */

// 환경 변수 설정 (Single Source of Truth)
export { env, isTestEnv } from './env';
export type { AppConfig as EnvConfig, DatabaseConfig } from './env';

// Database 설정
export { default as db } from './database';
export type { Knex } from './database';

// Fastify 설정
export { fastifyConfig } from './fastify';
export type { FastifyConfig } from './fastify';

// 기본 export는 Fastify 설정 (하위 호환성)
export { fastifyConfig as default } from './fastify';
