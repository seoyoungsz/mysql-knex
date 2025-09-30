import knexConfig from '../../knexfile';

describe('데이터베이스 설정', () => {
  describe('knexfile 설정', () => {
    it('개발 환경 설정이 MySQL로 올바르게 구성되어야 한다', () => {
      const config = knexConfig.development;

      expect(config.client).toBe('mysql2');
      expect(config.connection).toEqual(
        expect.objectContaining({
          host: expect.any(String),
          port: expect.any(Number),
          database: expect.any(String),
          user: expect.any(String),
          password: expect.any(String),
          ssl: false,
        })
      );
      expect(config.pool).toEqual({ min: 2, max: 10 });
      expect(config.migrations?.directory).toBe('./src/db/migrations');
      expect(config.migrations?.extension).toBe('ts');
      expect(config.seeds?.directory).toBe('./src/db/seeds');
      expect(config.seeds?.extension).toBe('ts');
    });

    it('테스트 환경 설정이 SQLite 인메모리로 올바르게 구성되어야 한다', () => {
      const config = knexConfig.test;

      expect(config.client).toBe('sqlite3');
      expect(config.connection).toEqual({
        filename: ':memory:',
        database: 'community_board_test',
      });
      expect(config.useNullAsDefault).toBe(true);
      expect(config.migrations?.directory).toBe('./src/db/migrations');
      expect(config.migrations?.extension).toBe('ts');
      expect(config.seeds?.directory).toBe('./src/db/seeds');
      expect(config.seeds?.extension).toBe('ts');
    });

    it('프로덕션 환경 설정이 MySQL로 올바르게 구성되어야 한다', () => {
      const config = knexConfig.production;

      expect(config.client).toBe('mysql2');
      expect(config.pool).toEqual({ min: 2, max: 20 });
      expect(config.migrations?.directory).toBe('./dist/db/migrations');
      expect(config.migrations?.extension).toBe('js');
      expect(config.seeds?.directory).toBe('./dist/db/seeds');
      expect(config.seeds?.extension).toBe('js');
    });
  });

  describe('데이터베이스 인스턴스', () => {
    const originalEnv = { ...process.env };

    function setRequiredEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): void {
      process.env.APP_HOST = overrides.APP_HOST ?? '127.0.0.1';
      process.env.APP_PORT = overrides.APP_PORT ?? '3000';
      process.env.JWT_SECRET = overrides.JWT_SECRET ?? 'test-secret';
      process.env.JWT_EXPIRES_IN = overrides.JWT_EXPIRES_IN ?? '1h';
      process.env.BCRYPT_SALT_ROUNDS = overrides.BCRYPT_SALT_ROUNDS ?? '10';
      process.env.NODE_ENV = overrides.NODE_ENV ?? 'test';
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

    it('knexfile 설정으로부터 db 인스턴스를 생성해야 한다', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const db = require('../../src/config/database').default;

      expect(db).toBeDefined();
      expect(db.client.config.client).toBe('sqlite3');

      await db.destroy();
    });

    it('유효하지 않은 환경에 대해 에러를 발생시켜야 한다', () => {
      process.env.NODE_ENV = 'invalid_env';

      expect(() => {
        require('../../src/config/database');
      }).toThrow('No database configuration found for environment: invalid_env');
    });
  });
});
