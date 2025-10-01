import { config } from 'dotenv';
import type { AppConfig } from '../types/app-config';

config();

/**
 * 환경 변수 값을 읽어 fallback 또는 필수 여부를 보장합니다.
 *
 * @param key 조회할 환경 변수 키
 * @param fallback 기본값 (선택)
 * @returns 조회된 문자열 값
 * @throws {Error} 필수 환경 변수가 비어 있을 때
 */
function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

/**
 * 문자열 환경 변수 값을 숫자로 변환하면서 유효성을 검증합니다.
 *
 * @param value 원본 문자열 값
 * @param key 디버깅용 환경 변수 키 이름
 * @returns 변환된 숫자 값
 * @throws {Error} 숫자로 해석할 수 없을 때
 */
function parseNumber(value: string, key: string): number {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number, received "${value}"`);
  }

  return parsed;
}

/**
 * 런타임에 주입된 환경 변수들을 집계한 애플리케이션 설정 객체.
 */
export const env: AppConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: getEnv('APP_HOST', '0.0.0.0'),
  port: parseNumber(process.env.APP_PORT ?? '3000', 'APP_PORT'),
  jwtSecret: getEnv('JWT_SECRET'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '1h'),
  bcryptSaltRounds: parseNumber(process.env.BCRYPT_SALT_ROUNDS ?? '10', 'BCRYPT_SALT_ROUNDS'),
  database: {
    host: getEnv('DB_HOST', 'localhost'),
    port: parseNumber(process.env.DB_PORT ?? '3306', 'DB_PORT'),
    name: getEnv('DB_NAME', 'community_board'),
    user: getEnv('DB_USER', 'community'),
    password: getEnv('DB_PASSWORD', 'communitypass'),
  },
};

/** 테스트 환경 여부 플래그. */
export const isTestEnv = env.nodeEnv === 'test';

export type { AppConfig, DatabaseConfig } from '../types/app-config';
