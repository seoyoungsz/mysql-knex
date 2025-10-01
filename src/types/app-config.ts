/**
 * 데이터베이스 연결을 위한 환경 설정 타입.
 */
export type DatabaseConfig = {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
};

/**
 * 애플리케이션 전역에서 사용하는 환경 설정 타입.
 */
export type AppConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptSaltRounds: number;
  database: DatabaseConfig;
};
