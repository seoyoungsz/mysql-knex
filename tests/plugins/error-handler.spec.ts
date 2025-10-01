/**
 * 에러 핸들러 플러그인 테스트
 */

import fastify, { FastifyInstance } from 'fastify';
import errorHandlerPlugin from '../../src/plugins/error-handler';

describe('에러 핸들러 플러그인', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('에러 핸들러 플러그인을 등록해야 함', async () => {
    app = fastify({ logger: false });
    await app.register(errorHandlerPlugin);
    await app.ready();

    expect(app).toBeDefined();
  });

  it('404 Not Found 에러를 처리해야 함', async () => {
    app = fastify({ logger: false });
    await app.register(errorHandlerPlugin);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/non-existent-route',
    });

    expect(response.statusCode).toBe(404);
    const payload = JSON.parse(response.payload);
    expect(payload.error.code).toBe('NOT_FOUND');
    expect(payload.error.message).toContain('찾을 수 없습니다');
  });

  it('유효성 검증 에러를 처리해야 함', async () => {
    app = fastify({ logger: false });
    await app.register(errorHandlerPlugin);

    app.post(
      '/test',
      {
        schema: {
          body: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' },
            },
          },
        },
      },
      async () => {
        return { success: true };
      }
    );

    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/test',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const payload = JSON.parse(response.payload);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
  });

  it('커스텀 에러를 처리해야 함', async () => {
    app = fastify({ logger: false });
    await app.register(errorHandlerPlugin);

    app.get('/error', async () => {
      const error = new Error('커스텀 에러 메시지') as Error & { statusCode: number };
      error.statusCode = 403;
      throw error;
    });

    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/error',
    });

    expect(response.statusCode).toBe(403);
    const payload = JSON.parse(response.payload);
    expect(payload.error.message).toBe('커스텀 에러 메시지');
  });

  it('내부 서버 에러를 처리해야 함', async () => {
    app = fastify({ logger: false });
    await app.register(errorHandlerPlugin);

    app.get('/server-error', async () => {
      throw new Error('문제가 발생했습니다');
    });

    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/server-error',
    });

    expect(response.statusCode).toBe(500);
    const payload = JSON.parse(response.payload);
    expect(payload.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(payload.error.message).toBe('문제가 발생했습니다');
  });
});
