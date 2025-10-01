# Fastify 플러그인 구조

프로젝트의 Fastify 플러그인들은 `src/plugins/` 디렉토리에 위치하며, 애플리케이션의 핵심 기능을 제공합니다.

## 플러그인 등록 순서

`src/app.ts`에서 다음 순서로 플러그인이 등록됩니다:

```typescript
app.register(databasePlugin);      // 1. 데이터베이스
app.register(errorHandlerPlugin);  // 2. 에러 핸들러
app.register(authPlugin);          // 3. 인증
app.register(routes);              // 4. 라우트
```

이 순서는 **의존성 때문에 중요**합니다. 예를 들어, 라우트는 인증 데코레이터를 사용할 수 있어야 하고, 모든 플러그인은 에러 핸들러가 먼저 설정되어야 합니다.

## 플러그인 상세

### 1. Database Plugin (`database.ts`)

**목적**: Knex 인스턴스를 Fastify에 등록하여 데이터베이스 접근을 제공합니다.

**주요 기능**:
- `config/database.ts`의 Knex 인스턴스를 Fastify 인스턴스에 데코레이터로 추가
- `fastify.knex`를 통해 애플리케이션 전역에서 데이터베이스 접근 가능

**사용 예시**:
```typescript
// 라우트 핸들러에서 사용
fastify.get('/users', async (request, reply) => {
  const users = await fastify.knex('users').select('*');
  return users;
});
```

**타입 확장**:
```typescript
declare module 'fastify' {
  interface FastifyInstance {
    knex: Knex;
  }
}
```

**중요 포인트**:
- `fastify-plugin`으로 래핑되어 **캡슐화를 방지**하므로, 하위 컨텍스트에서도 `fastify.knex` 접근 가능
- 연결 생명주기는 `config/database.ts`에서 생성된 Knex 인스턴스가 관리

---

### 2. Error Handler Plugin (`error-handler.ts`)

**목적**: 애플리케이션의 중앙 집중식 에러 처리를 제공합니다.

**주요 기능**:
1. **전역 에러 핸들러 설정**: `fastify.setErrorHandler()` 사용
2. **에러 타입 매핑**: 에러 이름/코드를 HTTP 상태 코드로 자동 변환
3. **404 Not Found 핸들러**: `fastify.setNotFoundHandler()` 설정
4. **환경별 스택 트레이스**: 개발 환경에서만 500 에러의 스택 트레이스 노출

**에러 매핑 테이블**:
```typescript
const ERROR_MAPPINGS = {
  ValidationError: { statusCode: 400, code: 'VALIDATION_ERROR' },
  FST_ERR_VALIDATION: { statusCode: 400, code: 'VALIDATION_ERROR' },
  UnauthorizedError: { statusCode: 401, code: 'UNAUTHORIZED' },
  ForbiddenError: { statusCode: 403, code: 'FORBIDDEN' },
  NotFoundError: { statusCode: 404, code: 'NOT_FOUND' },
  ConflictError: { statusCode: 409, code: 'CONFLICT' },
  DatabaseError: { statusCode: 500, code: 'DATABASE_ERROR' },
};
```

**에러 응답 형식**:
```json
{
  "error": {
    "message": "에러 메시지",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "validation": { /* 유효성 검증 실패 시 상세 정보 */ },
    "stack": "..." // 개발 환경에서만 (500 에러)
  }
}
```

**로깅 전략**:
- **5xx 에러**: `error` 레벨로 로깅 (스택 트레이스 포함)
- **4xx 에러**: `warn` 레벨로 로깅

---

### 3. Auth Plugin (`auth.ts`)

**목적**: JWT 기반 인증을 Fastify에 등록하고 라우트 보호 기능을 제공합니다.

**주요 기능**:
1. **@fastify/jwt 등록**: `config.jwt` 설정 사용
2. **authenticate 데코레이터 추가**: 보호된 라우트에서 사용할 인증 미들웨어

**JWT 설정**:
```typescript
{
  secret: config.jwt.secret,      // JWT 서명 비밀키
  sign: {
    expiresIn: config.jwt.expiresIn  // 토큰 만료 시간 (예: '1h', '7d')
  }
}
```

**authenticate 데코레이터 사용 예시**:
```typescript
// 보호된 라우트 정의
fastify.get('/protected', {
  preHandler: [fastify.authenticate],  // 인증 미들웨어
  handler: async (request, reply) => {
    // request.user에 JWT 페이로드 접근 가능
    return { message: '인증된 사용자만 접근 가능' };
  }
});
```

**인증 실패 응답**:
```json
{
  "error": {
    "message": "인증이 필요합니다",
    "code": "UNAUTHORIZED",
    "statusCode": 401
  }
}
```

**타입 확장**:
```typescript
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
```

---

## 플러그인 작성 패턴

모든 플러그인은 다음 패턴을 따릅니다:

```typescript
import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

// 플러그인 함수 정의
const myPlugin: FastifyPluginAsync = async (fastify) => {
  // 플러그인 로직
  fastify.decorate('myFeature', /* ... */);

  fastify.log.info('My Plugin 등록 완료');
};

// 필요시 TypeScript 타입 확장
declare module 'fastify' {
  interface FastifyInstance {
    myFeature: SomeType;
  }
}

// fastify-plugin으로 래핑하여 export
export default fp(myPlugin, {
  name: 'my-plugin',
});
```

**fastify-plugin을 사용하는 이유**:
- Fastify는 기본적으로 플러그인을 **캡슐화(encapsulation)** 하여 하위 컨텍스트에서만 접근 가능
- `fastify-plugin`으로 래핑하면 캡슐화를 방지하여 **전역적으로 데코레이터 접근 가능**
- 데이터베이스 연결, 인증 등 전역 기능에 필수적

## 새 플러그인 추가 시 체크리스트

1. `src/plugins/` 디렉토리에 플러그인 파일 생성
2. `FastifyPluginAsync` 타입으로 플러그인 함수 작성
3. 필요시 `declare module 'fastify'`로 타입 확장
4. `fastify-plugin`으로 래핑 (전역 접근 필요 시)
5. `src/app.ts`에서 적절한 순서로 등록
6. 플러그인 등록 완료 로그 추가 (디버깅용)

## 참고 자료

- [Fastify Plugins 공식 문서](https://fastify.dev/docs/latest/Reference/Plugins/)
- [fastify-plugin 패키지](https://github.com/fastify/fastify-plugin)
- [@fastify/jwt 플러그인](https://github.com/fastify/fastify-jwt)
