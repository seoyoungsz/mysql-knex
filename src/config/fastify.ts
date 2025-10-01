/**
 * Fastify 애플리케이션 설정 모듈
 *
 * env.ts에서 파싱된 환경 변수를 활용하여 Fastify 서버 설정을 생성합니다.
 * 환경별(development, test, production)로 다른 설정을 제공합니다.
 *
 * @module config/fastify
 * @example
 * ```typescript
 * import { fastifyConfig } from './config';
 *
 * const app = fastify({
 *   logger: fastifyConfig.logger,
 * });
 *
 * await app.listen({
 *   host: fastifyConfig.server.host,
 *   port: fastifyConfig.server.port,
 * });
 * ```
 */

import { FastifyServerOptions } from 'fastify';
import { env } from './env';

/**
 * Fastify 애플리케이션 설정 타입
 *
 * @interface FastifyConfig
 * @property {Object} server - 서버 설정
 * @property {string} server.host - 서버 호스트 주소
 * @property {number} server.port - 서버 포트 번호
 * @property {FastifyServerOptions['logger']} logger - Pino 로거 설정
 * @property {Object} jwt - JWT 인증 설정
 * @property {string} jwt.secret - JWT 서명에 사용되는 비밀키
 * @property {Object} jwt.sign - JWT 토큰 생성 옵션
 * @property {string} jwt.sign.expiresIn - 토큰 만료 시간 (예: '7d', '1h')
 */
interface FastifyConfig {
  server: {
    host: string;
    port: number;
  };
  logger: FastifyServerOptions['logger'];
  jwt: {
    secret: string;
    sign: {
      expiresIn: string;
    };
  };
}

/**
 * 환경별 Fastify 설정 객체
 *
 * @constant
 * @type {Record<string, FastifyConfig>}
 * @description
 * - development: 개발 환경 설정 (debug 로그 레벨, pino-pretty 사용)
 * - test: 테스트 환경 설정 (로깅 비활성화, 랜덤 포트)
 * - production: 프로덕션 환경 설정 (info 로그 레벨, JSON 로그)
 */
const configs: Record<string, FastifyConfig> = {
  development: {
    server: {
      host: env.host,
      port: env.port,
    },
    logger: {
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
    jwt: {
      secret: env.jwtSecret,
      sign: {
        expiresIn: env.jwtExpiresIn,
      },
    },
  },

  test: {
    server: {
      host: env.host,
      port: 0, // 테스트용 랜덤 포트
    },
    logger: false, // 테스트 시 로깅 비활성화
    jwt: {
      secret: env.jwtSecret,
      sign: {
        expiresIn: env.jwtExpiresIn,
      },
    },
  },

  production: {
    server: {
      host: env.host,
      port: env.port,
    },
    logger: {
      level: 'info',
    },
    jwt: {
      secret: env.jwtSecret,
      sign: {
        expiresIn: env.jwtExpiresIn,
      },
    },
  },
};

const config = configs[env.nodeEnv];

if (!config) {
  throw new Error(`${env.nodeEnv} 환경에 대한 Fastify 설정을 찾을 수 없습니다`);
}

/**
 * 현재 환경에 맞는 Fastify 설정
 */
export const fastifyConfig = config;
export type { FastifyConfig };
