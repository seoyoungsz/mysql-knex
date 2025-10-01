/**
 * 라우트 테스트
 */

import buildApp from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('기본 라우트', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /health', () => {
    it('헬스 체크 엔드포인트가 정상 응답해야 함', async () => {
      app = buildApp({ logger: false });
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.status).toBe('ok');
      expect(payload.database).toBe('connected');
      expect(payload.timestamp).toBeDefined();
    });
  });

  describe('GET /api/version', () => {
    it('버전 정보를 반환해야 함', async () => {
      app = buildApp({ logger: false });
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/api/version',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.version).toBe('1.0.0');
      expect(payload.name).toBe('Community Board API');
    });
  });

  describe('GET /api/me', () => {
    it('인증 없이 요청 시 401을 반환해야 함', async () => {
      app = buildApp({ logger: false });
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/api/me',
      });

      expect(response.statusCode).toBe(401);
      const payload = JSON.parse(response.payload);
      expect(payload.error.code).toBe('UNAUTHORIZED');
      expect(payload.error.message).toContain('인증');
    });

    it('유효한 토큰으로 요청 시 사용자 정보를 반환해야 함', async () => {
      app = buildApp({ logger: false });
      await app.ready();

      const token = app.jwt.sign({
        id: 1,
        email: 'test@example.com',
        nickname: 'testuser',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.user).toBeDefined();
      expect(payload.user.email).toBe('test@example.com');
    });
  });
});
