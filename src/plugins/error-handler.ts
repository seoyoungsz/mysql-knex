/**
 * 에러 핸들러 플러그인
 * 애플리케이션의 중앙 집중식 에러 처리를 제공합니다
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyError, FastifyRequest, FastifyReply } from 'fastify';

/**
 * 에러 타입을 HTTP 상태 코드와 에러 코드로 매핑
 */
const ERROR_MAPPINGS: Record<string, { statusCode: number; code: string }> = {
  ValidationError: { statusCode: 400, code: 'VALIDATION_ERROR' },
  FST_ERR_VALIDATION: { statusCode: 400, code: 'VALIDATION_ERROR' },
  UnauthorizedError: { statusCode: 401, code: 'UNAUTHORIZED' },
  ForbiddenError: { statusCode: 403, code: 'FORBIDDEN' },
  NotFoundError: { statusCode: 404, code: 'NOT_FOUND' },
  ConflictError: { statusCode: 409, code: 'CONFLICT' },
  DatabaseError: { statusCode: 500, code: 'DATABASE_ERROR' },
};

/**
 * 에러 핸들러 플러그인
 * 전역 에러 처리를 설정합니다
 */
const errorHandlerPlugin: FastifyPluginAsync = async fastify => {
  fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // 에러 매핑 또는 기본값 사용
    const mapping = ERROR_MAPPINGS[error.name] || ERROR_MAPPINGS[error.code || ''];
    const statusCode = error.statusCode || mapping?.statusCode || 500;
    const errorCode = mapping?.code || 'INTERNAL_SERVER_ERROR';

    // 에러 로깅
    if (statusCode >= 500) {
      fastify.log.error(
        {
          err: error,
          request: {
            method: request.method,
            url: request.url,
            params: request.params,
            query: request.query,
          },
        },
        '내부 서버 에러'
      );
    } else {
      fastify.log.warn(
        {
          err: error,
          request: {
            method: request.method,
            url: request.url,
          },
        },
        '클라이언트 에러'
      );
    }

    // 에러 응답 구성
    const errorResponse: {
      error: {
        message: string;
        code: string;
        statusCode: number;
        validation?: unknown;
        stack?: string;
      };
    } = {
      error: {
        message: error.message || '에러가 발생했습니다',
        code: errorCode,
        statusCode: statusCode,
      },
    };

    // 유효성 검증 상세 정보 추가
    if ('validation' in error && error.validation) {
      errorResponse.error.validation = error.validation;
    }

    // 개발 환경에서 스택 트레이스 추가
    if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
      errorResponse.error.stack = error.stack;
    }

    reply.code(statusCode).send(errorResponse);
  });

  // 404 Not Found 처리
  fastify.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    reply.code(404).send({
      error: {
        message: `라우트 ${request.method}:${request.url}을 찾을 수 없습니다`,
        code: 'NOT_FOUND',
        statusCode: 404,
      },
    });
  });

  fastify.log.info('에러 핸들러 플러그인 등록 완료');
};

// 플러그인 캡슐화 방지를 위해 fastify-plugin으로 래핑
export default fp(errorHandlerPlugin, {
  name: 'error-handler-plugin',
});
