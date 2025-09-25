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
      url: '/healthz',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(JSON.parse(response.payload)).toEqual({ status: 'ok' });
  });
});
