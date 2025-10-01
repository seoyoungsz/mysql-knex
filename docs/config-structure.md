# Configuration 구조

프로젝트의 설정 모듈들은 `src/config/` 디렉토리에 위치하며, 환경 변수 기반의 중앙 집중식 설정 시스템을 제공합니다.

## 설정 로딩 순서

`src/config/index.ts`에서 다음 순서로 설정이 export됩니다:

```typescript
export { env, isTestEnv };       // 1. 환경 변수 (Single Source of Truth)
export { db };                   // 2. Knex 데이터베이스
export { fastifyConfig };        // 3. Fastify 서버
```

이 순서는 **의존성 때문에 중요**합니다. `knex.ts`와 `fastify.ts`는 모두 `env.ts`에서 파싱된 환경 변수를 사용하므로, `env.ts`가 먼저 로드되어야 합니다.

## 설정 상세

### 1. Environment Config (`env.ts`)

**목적**: 환경 변수의 Single Source of Truth로, 모든 환경 변수를 검증하고 파싱합니다.

**주요 기능**:
1. **환경 변수 로딩**: `dotenv`로 `.env` 파일 로드
2. **타입 안전 파싱**: TypeScript 타입으로 변환 및 검증
3. **필수 값 검증**: 필수 환경 변수 누락 시 즉시 에러 발생
4. **기본값 제공**: 선택적 환경 변수에 대한 fallback 값

**핵심 헬퍼 함수**:

```typescript
// 환경 변수 조회 + 필수 검증
function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

// 숫자 파싱 + 유효성 검증
function parseNumber(value: string, key: string): number {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number, received "${value}"`);
  }

  return parsed;
}
```

**Export 설정 객체**:

```typescript
export const env: AppConfig = {
  // 환경
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // 서버
  host: getEnv('APP_HOST', '0.0.0.0'),
  port: parseNumber(process.env.APP_PORT ?? '3000', 'APP_PORT'),

  // 인증
  jwtSecret: getEnv('JWT_SECRET'),              // 필수!
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '1h'),
  bcryptSaltRounds: parseNumber(process.env.BCRYPT_SALT_ROUNDS ?? '10', 'BCRYPT_SALT_ROUNDS'),

  // 데이터베이스
  database: {
    host: getEnv('DB_HOST', 'localhost'),
    port: parseNumber(process.env.DB_PORT ?? '3306', 'DB_PORT'),
    name: getEnv('DB_NAME', 'community_board'),
    user: getEnv('DB_USER', 'community'),
    password: getEnv('DB_PASSWORD', 'communitypass'),
  },
};

// 테스트 환경 여부 플래그
export const isTestEnv = env.nodeEnv === 'test';
```

**사용 예시**:

```typescript
import { env, isTestEnv } from './config';

console.log(env.port);              // 3000
console.log(env.database.host);     // 'localhost'
console.log(isTestEnv);             // false (development 환경)
```

**중요 포인트**:
- **즉시 실패 전략**: 서버 시작 전 필수 환경 변수 누락 시 즉시 에러 발생 (런타임 에러 방지)
- **타입 안전성**: `AppConfig` 타입으로 컴파일 타임 타입 체크
- **문서화 역할**: `env` 객체를 보면 필요한 모든 환경 변수를 한눈에 파악 가능

---

### 2. Knex Config (`knex.ts`)

**목적**: 환경별 Knex 데이터베이스 설정을 제공하고 Knex 인스턴스를 생성합니다.

**주요 기능**:
1. **환경별 데이터베이스 전략**: 개발/프로덕션은 MySQL, 테스트는 SQLite
2. **마이그레이션 경로 분리**: 개발/테스트는 `.ts` 파일, 프로덕션은 `.js` 파일
3. **커넥션 풀 최적화**: 환경별로 다른 pool 크기 설정

**환경별 설정**:

| 환경 | 데이터베이스 | 마이그레이션 경로 | Pool 크기 |
|------|--------------|-------------------|-----------|
| **development** | MySQL 8.0 | `./src/db/migrations/*.ts` | min: 2, max: 10 |
| **test** | SQLite (`:memory:`) | `./src/db/migrations/*.ts` | min: 1, max: 1 |
| **production** | MySQL 8.0 | `./dist/db/migrations/*.js` | min: 2, max: 20 |

**Development 설정 예시**:

```typescript
{
  client: 'mysql2',
  connection: {
    host: env.database.host,      // 'localhost' 또는 'db' (Docker)
    port: env.database.port,      // 3306
    database: env.database.name,  // 'community_board'
    user: env.database.user,      // 'community'
    password: env.database.password,
    ssl: false,
  },
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',              // TypeScript 소스 파일
  },
  seeds: {
    directory: './src/db/seeds',
    extension: 'ts',
  },
  pool: {
    min: 2,                       // 최소 2개 연결 유지
    max: 10,                      // 최대 10개 동시 연결
  },
}
```

**Test 설정 특징**:

```typescript
{
  client: 'sqlite3',
  connection: {
    filename: ':memory:',         // 메모리 DB (초고속, 격리)
  },
  useNullAsDefault: true,         // SQLite 호환성
  pool: {
    min: 1,                       // 단일 연결 (메모리 DB)
    max: 1,
  },
}
```

**Knex 인스턴스 생성**:

```typescript
const config = knexConfig[env.nodeEnv];

if (!config) {
  throw new Error(`${env.nodeEnv} 환경에 대한 데이터베이스 설정을 찾을 수 없습니다`);
}

const db: Knex = knex(config);  // Knex 인스턴스 생성

export default db;
```

**사용 예시**:

```typescript
import db from './config/database';

// 쿼리 빌더 사용
const users = await db('users')
  .select('id', 'email')
  .where('active', true);

// Raw 쿼리
const result = await db.raw('SELECT NOW()');
```

**중요 포인트**:
- **듀얼 데이터베이스 전략**: 테스트는 SQLite로 빠르고 격리된 환경, 개발/프로덕션은 MySQL로 실제 환경 재현
- **마이그레이션 경로 주의**: 프로덕션은 컴파일된 `dist/` 디렉토리 사용 (배포 전 `npm run build` 필수)
- **커넥션 풀 튜닝**: 프로덕션은 더 큰 pool 크기로 동시 요청 처리 능력 향상

---

### 3. Fastify Config (`fastify.ts`)

**목적**: 환경별 Fastify 서버 설정을 제공합니다 (로거, JWT, 서버 옵션).

**주요 기능**:
1. **서버 설정**: host, port 설정
2. **로거 설정**: 환경별로 다른 로그 레벨 및 포맷
3. **JWT 설정**: 인증 플러그인용 비밀키 및 토큰 옵션

**환경별 로거 설정**:

| 환경 | 로그 레벨 | 로그 포맷 | Transport |
|------|-----------|-----------|-----------|
| **development** | `debug` | Pretty (컬러풀) | `pino-pretty` |
| **test** | 비활성화 (`false`) | - | - |
| **production** | `info` | JSON | 기본 (표준 출력) |

**Development 설정 예시**:

```typescript
{
  server: {
    host: env.host,               // '0.0.0.0'
    port: env.port,               // 3000
  },
  logger: {
    level: 'debug',               // 모든 로그 출력
    transport: {
      target: 'pino-pretty',      // 가독성 좋은 포맷
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',   // 불필요한 필드 제거
      },
    },
  },
  jwt: {
    secret: env.jwtSecret,        // JWT 서명 비밀키
    sign: {
      expiresIn: env.jwtExpiresIn, // '1h', '7d' 등
    },
  },
}
```

**Test 설정 특징**:

```typescript
{
  server: {
    host: env.host,
    port: 0,                      // 랜덤 포트 (테스트 격리)
  },
  logger: false,                  // 로깅 비활성화 (깨끗한 출력)
  jwt: {
    secret: env.jwtSecret,
    sign: {
      expiresIn: env.jwtExpiresIn,
    },
  },
}
```

**Production 설정 특징**:

```typescript
{
  server: {
    host: env.host,
    port: env.port,
  },
  logger: {
    level: 'info',                // 중요 로그만 (warn, error, info)
    // transport 없음 → JSON 포맷 (로그 수집 시스템 연동 용이)
  },
  jwt: {
    secret: env.jwtSecret,
    sign: {
      expiresIn: env.jwtExpiresIn,
    },
  },
}
```

**사용 예시**:

```typescript
import fastify from 'fastify';
import { fastifyConfig } from './config';

// Fastify 앱 생성
const app = fastify({
  logger: fastifyConfig.logger,
});

// JWT 플러그인 등록
app.register(fastifyJwt, {
  secret: fastifyConfig.jwt.secret,
  sign: fastifyConfig.jwt.sign,
});

// 서버 시작
await app.listen({
  host: fastifyConfig.server.host,
  port: fastifyConfig.server.port,
});
```

**타입 정의**:

```typescript
interface FastifyConfig {
  server: {
    host: string;
    port: number;
  };
  logger: FastifyServerOptions['logger'];  // false | LoggerOptions
  jwt: {
    secret: string;
    sign: {
      expiresIn: string;
    };
  };
}
```

**중요 포인트**:
- **환경별 로깅 최적화**: 개발은 가독성, 테스트는 깨끗한 출력, 프로덕션은 파싱 가능한 JSON
- **테스트 포트 0**: OS가 사용 가능한 랜덤 포트 자동 할당 (포트 충돌 방지)
- **JWT 설정 중앙화**: 인증 플러그인에서 직접 `env.jwtSecret` 접근 대신 `fastifyConfig.jwt` 사용

---

### 4. Config Index (`index.ts`)

**목적**: Barrel Export 패턴으로 모든 설정을 단일 진입점에서 제공합니다.

**주요 기능**:
- **중앙 집중식 import**: 하나의 파일에서 모든 설정 import 가능
- **Named exports**: 명시적으로 필요한 설정만 선택 가능
- **타입 export**: 설정 관련 TypeScript 타입도 함께 제공

**Export 구조**:

```typescript
// 환경 변수 (Single Source of Truth)
export { env, isTestEnv };
export type { AppConfig as EnvConfig, DatabaseConfig };

// Knex 데이터베이스
export { default as db };
export type { Knex };

// Fastify 서버
export { fastifyConfig };
export type { FastifyConfig };

// 기본 export (하위 호환성)
export { fastifyConfig as default };
```

**사용 예시**:

```typescript
// 방법 1: Named imports (권장)
import { env, db, fastifyConfig } from './config';

console.log(env.nodeEnv);           // 'development'
const users = await db('users').select('*');
const app = fastify({ logger: fastifyConfig.logger });

// 방법 2: Default import (Fastify 설정)
import config from './config';
const app = fastify({ logger: config.logger });

// 방법 3: 타입만 import
import type { EnvConfig, FastifyConfig } from './config';

function processConfig(config: EnvConfig) {
  // ...
}
```

**중요 포인트**:
- **일관된 import 경로**: `'./config'` 하나로 모든 설정 접근
- **Tree-shaking 친화적**: Named exports로 필요한 것만 번들에 포함
- **타입 중앙화**: 설정 관련 타입을 한 곳에서 관리

---

## 설정 시스템 설계 원칙

### 1. Single Source of Truth (`env.ts`)

환경 변수를 한 곳에서만 읽고 파싱합니다. 다른 모든 설정 파일은 `env.ts`의 `env` 객체를 import합니다.

**장점**:
- 환경 변수 검증 로직 중복 방지
- 타입 안전성 보장
- 설정 변경 시 단일 지점 수정

**예시**:
```typescript
// ✅ Good: env.ts에서만 process.env 접근
// env.ts
export const env = { port: Number(process.env.APP_PORT) };

// knex.ts
import { env } from './env';
const config = { port: env.port };  // ✅

// ❌ Bad: 여러 파일에서 process.env 접근
// knex.ts
const port = Number(process.env.APP_PORT);  // ❌
```

### 2. 환경별 설정 분리

`NODE_ENV`에 따라 다른 설정 객체를 선택하는 패턴을 사용합니다.

```typescript
const configs: Record<string, Config> = {
  development: { /* ... */ },
  test: { /* ... */ },
  production: { /* ... */ },
};

const config = configs[env.nodeEnv];

if (!config) {
  throw new Error(`${env.nodeEnv} 환경에 대한 설정을 찾을 수 없습니다`);
}
```

**장점**:
- 환경별 차이가 명확히 구분됨
- if/else 체인 대신 객체 lookup으로 간결함
- 잘못된 환경 이름 즉시 감지

### 3. Fail-Fast 전략

서버 시작 전에 필수 설정을 검증하고, 문제 발생 시 즉시 에러를 발생시킵니다.

```typescript
// 필수 환경 변수 누락 시
function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);  // 즉시 실패!
  }

  return value;
}

// 잘못된 환경 이름 사용 시
if (!config) {
  throw new Error(`${env.nodeEnv} 환경에 대한 설정을 찾을 수 없습니다`);
}
```

**장점**:
- 런타임 에러 대신 시작 시점 에러 (빠른 피드백)
- 프로덕션 배포 전 설정 문제 발견

---

## 새 설정 추가 시 체크리스트

1. **환경 변수 정의**
   - `.env.example`에 새 환경 변수 추가 및 설명
   - `src/types/app-config.ts`에 타입 정의

2. **env.ts에 파싱 로직 추가**
   - `getEnv()` 또는 `parseNumber()` 사용
   - 기본값 제공 여부 결정
   - `env` 객체에 추가

3. **해당 설정 파일 업데이트**
   - `knex.ts`, `fastify.ts` 등에서 `env` 객체 사용
   - 환경별 차이가 있다면 각 환경 설정 객체에 반영

4. **타입 export**
   - `index.ts`에서 새 타입 export (필요 시)

5. **문서 업데이트**
   - 이 문서 (`docs/config-structure.md`) 업데이트
   - `CLAUDE.md`의 환경 변수 섹션 업데이트

---

## 참고 자료

- [dotenv - 환경 변수 로딩](https://github.com/motdotla/dotenv)
- [Knex.js Configuration](https://knexjs.org/guide/#configuration-options)
- [Fastify Server Options](https://fastify.dev/docs/latest/Reference/Server/)
- [Pino Logger (Fastify 기본 로거)](https://github.com/pinojs/pino)
- [pino-pretty (개발용 로그 포맷)](https://github.com/pinojs/pino-pretty)
