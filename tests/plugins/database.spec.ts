/**
 * 데이터베이스 플러그인 테스트
 */

import fastify, { FastifyInstance } from 'fastify';
import databasePlugin from '../../src/plugins/database';

describe('데이터베이스 플러그인', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('데이터베이스 플러그인을 등록해야 함', async () => {
    app = fastify({ logger: false });
    await app.register(databasePlugin);
    await app.ready();

    expect(app.knex).toBeDefined();
    expect(typeof app.knex.raw).toBe('function');
  });

  it('쿼리를 실행할 수 있어야 함', async () => {
    app = fastify({ logger: false });
    await app.register(databasePlugin);
    await app.ready();

    const result = await app.knex.raw('SELECT 1 + 1 as result');
    expect(result).toBeDefined();
  });

  it('앱 종료 후에도 전역 knex 인스턴스는 여전히 사용 가능해야 함', async () => {
    app = fastify({ logger: false });
    await app.register(databasePlugin);
    await app.ready();

    const knexInstance = app.knex;
    await app.close();

    // 전역 인스턴스는 앱 생명주기와 독립적이므로 여전히 사용 가능
    const result = await knexInstance.raw('SELECT 1 + 1 as result');
    expect(result).toBeDefined();

    app = null!; // afterEach에서 중복 close 방지
  });
});
