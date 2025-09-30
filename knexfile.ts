import type { Knex } from 'knex';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Knex 데이터베이스 설정
 *
 * 환경별(development, test, production) 데이터베이스 연결 및 마이그레이션 설정을 정의합니다.
 *
 * @see {@link https://knexjs.org/guide/#configuration-options Knex Configuration Options}
 */
const config: { [key: string]: Knex.Config } = {
  /**
   * 개발 환경 설정
   *
   * - MySQL2 클라이언트를 사용하여 로컬 개발 데이터베이스에 연결
   * - 환경 변수가 없을 경우 기본값 사용
   * - TypeScript 마이그레이션 및 시드 파일 지원
   */
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'community_board',
      user: process.env.DB_USER || 'community',
      password: process.env.DB_PASSWORD || 'communitypass',
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

  /**
   * 테스트 환경 설정
   *
   * - SQLite3 인메모리 데이터베이스 사용으로 빠른 테스트 실행
   * - 각 테스트마다 깨끗한 데이터베이스 상태 보장
   * - SQLite3는 일부 MySQL 기능을 지원하지 않으므로 useNullAsDefault 옵션 필요
   */
  test: {
    client: 'sqlite3',
    connection: {
      filename: ':memory:',
      database: 'community_board_test',
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
  },

  /**
   * 프로덕션 환경 설정
   *
   * - MySQL2 클라이언트 사용
   * - 환경 변수 필수 (기본값 없음)
   * - 컴파일된 JavaScript 마이그레이션 및 시드 파일 사용
   * - 더 큰 커넥션 풀 크기로 높은 트래픽 처리
   */
  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
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

export default config;

// CommonJS compatibility for tests
module.exports = config;
