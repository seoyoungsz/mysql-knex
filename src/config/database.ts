import knex, { Knex } from 'knex';
import knexConfig from '../../knexfile';

/**
 * 현재 실행 환경 (development, test, production)
 */
const environment = process.env.NODE_ENV || 'development';

/**
 * knexfile.ts에서 현재 환경에 해당하는 설정을 가져옵니다.
 */
const config = knexConfig[environment];

if (!config) {
  throw new Error(`No database configuration found for environment: ${environment}`);
}

/**
 * Knex 인스턴스
 *
 * 애플리케이션 전역에서 사용할 데이터베이스 연결 인스턴스입니다.
 * knexfile.ts에 정의된 환경별 설정을 기반으로 생성됩니다.
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
