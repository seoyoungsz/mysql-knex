import knexConfig from '../../knexfile';
import { env } from '../../src/config/env';
import type { AppConfig } from '../../src/types/app-config';

describe('Database 설정', () => {
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
      });
      expect(config.useNullAsDefault).toBe(true);
      expect(config.pool).toEqual({ min: 1, max: 1 });
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

  describe('Database 인스턴스', () => {
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

    it('환경 설정 타입을 AppConfig와 호환되게 유지해야 한다', () => {
      type EnvMatchesConfig = typeof env extends AppConfig ? true : false;

      const envMatchesConfig: EnvMatchesConfig = true;

      expect(envMatchesConfig).toBe(true);
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
      }).toThrow('invalid_env 환경에 대한 데이터베이스 설정을 찾을 수 없습니다');
    });
  });
});
