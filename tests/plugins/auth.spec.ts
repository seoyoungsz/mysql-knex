/**
 * 인증 플러그인 테스트
 */

import fastify, { FastifyInstance } from 'fastify';
import authPlugin from '../../src/plugins/auth';

describe('인증 플러그인', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('인증 플러그인을 등록해야 함', async () => {
    app = fastify({ logger: false });
    await app.register(authPlugin);
    await app.ready();

    expect(app.jwt).toBeDefined();
    expect(typeof app.jwt.sign).toBe('function');
    expect(typeof app.jwt.verify).toBe('function');
    expect(typeof app.authenticate).toBe('function');
  });

  it('JWT 토큰을 서명하고 검증할 수 있어야 함', async () => {
    app = fastify({ logger: false });
    await app.register(authPlugin);
    await app.ready();

    const payload = { id: 1, email: 'test@example.com' };
    const token = app.jwt.sign(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = app.jwt.verify(token) as { id: number; email: string };
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
  });

  it('잘못된 토큰 검증에 실패해야 함', async () => {
    app = fastify({ logger: false });
    await app.register(authPlugin);
    await app.ready();

    expect(() => {
      app.jwt.verify('invalid-token');
    }).toThrow();
  });

  it('authenticate 데코레이터로 라우트를 보호해야 함', async () => {
    app = fastify({ logger: false });
    await app.register(authPlugin);

    app.get(
      '/protected',
      {
        onRequest: [app.authenticate],
      },
      async () => {
        return { message: 'success' };
      }
    );

    await app.ready();

    // 토큰 없이 요청
    const unauthorizedResponse = await app.inject({
      method: 'GET',
      url: '/protected',
    });

    expect(unauthorizedResponse.statusCode).toBe(401);

    // 유효한 토큰으로 요청
    const token = app.jwt.sign({ id: 1 });
    const authorizedResponse = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(authorizedResponse.statusCode).toBe(200);
    const responsePayload = JSON.parse(authorizedResponse.payload);
    expect(responsePayload.message).toBe('success');
  });
});
