import knex, { Knex } from 'knex';
import { env } from './env';

/**
 * 환경별 Knex 설정
 *
 * @description
 * env.ts에서 파싱된 환경 변수를 활용하여 Knex 설정을 생성합니다.
 * - development: MySQL 사용, TypeScript 마이그레이션
 * - test: SQLite 메모리 DB 사용 (빠른 테스트)
 * - production: MySQL 사용, JavaScript 마이그레이션 (빌드된 파일)
 */
const knexConfig: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',
    connection: {
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
      user: env.database.user,
      password: env.database.password,
      ssl: false,
    },
    migrations: {
      directory: './src/db/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/db/seeds',
      extension: 'ts',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },

  test: {
    client: 'sqlite3',
    connection: {
      filename: ':memory:',
    },
    migrations: {
      directory: './src/db/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/db/seeds',
      extension: 'ts',
    },
    useNullAsDefault: true,
    pool: {
      min: 1,
      max: 1,
    },
  },

  production: {
    client: 'mysql2',
    connection: {
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
      user: env.database.user,
      password: env.database.password,
    },
    migrations: {
      directory: './dist/db/migrations',
      extension: 'js',
    },
    seeds: {
      directory: './dist/db/seeds',
      extension: 'js',
    },
    pool: {
      min: 2,
      max: 20,
    },
  },
};

const config = knexConfig[env.nodeEnv];

if (!config) {
  throw new Error(`${env.nodeEnv} 환경에 대한 데이터베이스 설정을 찾을 수 없습니다`);
}

/**
 * Knex 인스턴스
 *
 * 애플리케이션 전역에서 사용할 데이터베이스 연결 인스턴스입니다.
 * 환경별 설정을 기반으로 생성됩니다.
 *
 * @example
 * ```typescript
 * import db from '@/config/database';
 *
 * const users = await db('users').select('*');
 * ```
 */
const db: Knex = knex(config);

export default db;
export { Knex };
