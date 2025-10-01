import buildApp from '../../src/app';
import type { FastifyInstance } from 'fastify';

describe('App bootstrap', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds to health check', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    const payload = JSON.parse(response.payload);
    expect(payload.status).toBe('ok');
    expect(payload.database).toBe('connected');
    expect(payload.timestamp).toBeDefined();
  });
});
