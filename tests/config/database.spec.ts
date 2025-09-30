import path from 'path';

describe('database configuration', () => {
  const originalEnv = { ...process.env };

  function setRequiredEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): void {
    process.env.APP_HOST = overrides.APP_HOST ?? '127.0.0.1';
    process.env.APP_PORT = overrides.APP_PORT ?? '3000';
    process.env.JWT_SECRET = overrides.JWT_SECRET ?? 'test-secret';
    process.env.JWT_EXPIRES_IN = overrides.JWT_EXPIRES_IN ?? '1h';
    process.env.BCRYPT_SALT_ROUNDS = overrides.BCRYPT_SALT_ROUNDS ?? '10';
    process.env.NODE_ENV = overrides.NODE_ENV ?? 'development';
  }

  function restoreEnv(): void {
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
  }

  beforeEach(() => {
    jest.resetModules();
    setRequiredEnv();
  });

  afterEach(() => {
    restoreEnv();
  });

  it('builds knex config for mysql using provided connection details', () => {
    const { createKnexConfig } = require('../../src/config/database');

    const config = createKnexConfig(
      {
        host: 'localhost',
        port: 3307,
        name: 'community_board_dev',
        user: 'dev_user',
        password: 'secret',
      },
      'development'
    );

    expect(config.client).toBe('mysql2');
    expect(config.connection).toEqual(
      expect.objectContaining({
        host: 'localhost',
        port: 3307,
        database: 'community_board_dev',
        user: 'dev_user',
        password: 'secret',
      })
    );

    expect(config.pool).toEqual(expect.objectContaining({ min: 2, max: 10 }));
    expect(config.migrations?.directory).toContain(path.join('db', 'migrations'));
    expect(config.migrations?.tableName).toBe('knex_migrations');
    expect(config.seeds?.directory).toContain(path.join('db', 'seeds'));
  });

  it('uses lightweight pool configuration for test environment', () => {
    const { createKnexConfig } = require('../../src/config/database');

    const config = createKnexConfig(
      {
        host: 'localhost',
        port: 3306,
        name: 'community_board_test',
        user: 'tester',
        password: 'testerpass',
      },
      'test'
    );

    expect(config.pool).toEqual(expect.objectContaining({ min: 0, max: 1 }));
  });

  it('creates reusable knex instance with the generated configuration', async () => {
    const { createKnexConfig, createKnexInstance } = require('../../src/config/database');

    const config = createKnexConfig(
      {
        host: 'localhost',
        port: 3306,
        name: 'community_board_test',
        user: 'tester',
        password: 'testerpass',
      },
      'test'
    );

    const knexInstance = createKnexInstance(config);

    expect(knexInstance.client.config).toEqual(expect.objectContaining(config));

    await knexInstance.destroy();
  });

  it('exposes environment-specific knexfile configurations', () => {
    const knexfile = require('../../knexfile');

    expect(knexfile.development.connection.database).toBe('community_board');
    expect(knexfile.test.connection.database).toBe('community_board_test');
    expect(knexfile.production.connection.database).toBe('community_board');
  });
});
