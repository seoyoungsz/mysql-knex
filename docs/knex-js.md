# Knex.js 가이드

## 목차
1. [Knex.js란?](#knexjs란)
2. [Knex.js vs TypeORM](#knexjs-vs-typeorm)
3. [프로젝트 구조](#프로젝트-구조)
4. [설정 파일](#설정-파일)
5. [마이그레이션](#마이그레이션)
6. [시드](#시드)
7. [실행 흐름](#실행-흐름)
8. [실무 팁](#실무-팁)

---

## Knex.js란?

Knex.js는 Node.js를 위한 **SQL 쿼리 빌더**이자 **데이터베이스 마이그레이션 도구**입니다.

### 주요 특징

1. **데이터베이스 독립성 (Database Agnostic)**
   - 하나의 코드로 MySQL, PostgreSQL, SQLite 등 여러 DB 지원
   - DB를 변경해도 코드 수정이 최소화됨

   ```typescript
   // 이 코드는 MySQL, PostgreSQL, SQLite 모두에서 동작
   table.string('email', 255).notNullable().unique();
   // Knex가 각 DB에 맞는 SQL로 자동 변환
   ```

2. **타입 안정성과 자동완성**

   **IDE 자동완성:**
   ```typescript
   knex.schema.createTable('users', table => {
     table.  // ← 점(.)을 찍으면 IDE가 가능한 메서드 제안
     // 제안: increments, string, integer, boolean, timestamps...
   });
   ```

   **컴파일 타임 오류 검증:**
   ```typescript
   // ❌ SQL 파일: 실행해야 오류 발견
   CREATE TABLE users (
     id INT AUTO_INCREMNET  -- 오타! 런타임 에러
   );

   // ✅ Knex: 저장하는 순간 오류 발견
   table.incremets('id');  // ❌ TypeScript 즉시 에러 표시!
   //    ^^^^^^^^^ Property 'incremets' does not exist
   ```

   **파라미터 타입 검증:**
   ```typescript
   table.string('email', 'very-long');  // ❌ 컴파일 에러
   //                    ^^^^^^^^^^^ 숫자여야 함

   table.string('email', 255);  // ✅ 올바른 타입
   ```

   **쿼리 결과 타입 추론:**
   ```typescript
   interface User {
     id: number;
     email: string;
   }

   const users = await knex('users').select('*');
   //    ^^^^^ 타입: User[] (자동 추론!)

   const email = users[0].email;  // ✅ string 타입
   const invalid = users[0].phone;  // ❌ 컴파일 에러!
   ```

3. **마이그레이션 시스템**
   - 데이터베이스 스키마의 버전 관리
   - up/down 함수로 안전한 롤백
   - Git처럼 DB 구조를 버전 관리

   ```typescript
   // 적용
   export async function up(knex: Knex): Promise<void> {
     return knex.schema.createTable('users', table => { ... });
   }

   // 롤백
   export async function down(knex: Knex): Promise<void> {
     return knex.schema.dropTableIfExists('users');
   }
   ```

4. **쿼리 빌더**
   - SQL을 직접 작성하지 않고 JavaScript/TypeScript로 쿼리 작성
   - 가독성 높고 유지보수 용이
   - 프로그래밍 로직 활용 가능 (반복문, 조건문)

   ```typescript
   // 동적 쿼리 생성
   const query = knex('users').select('*');

   if (status) {
     query.where('status', status);
   }

   if (limit) {
     query.limit(limit);
   }

   const results = await query;
   ```

### 주요 단점

Knex도 완벽하지 않습니다. 다음과 같은 단점들이 있습니다:

1. **반복적인 CRUD 코드**

   ```typescript
   // 모든 테이블마다 CRUD를 직접 작성해야 함

   // 사용자 생성
   async function createUser(data: UserInput) {
     return knex('users').insert(data);
   }

   // 사용자 조회
   async function getUser(id: number) {
     return knex('users').where({ id }).first();
   }

   // 사용자 수정
   async function updateUser(id: number, data: Partial<UserInput>) {
     return knex('users').where({ id }).update(data);
   }

   // 사용자 삭제
   async function deleteUser(id: number) {
     return knex('users').where({ id }).delete();
   }

   // TypeORM이라면? 모두 자동 제공!
   // userRepository.save(data)
   // userRepository.findOne(id)
   // userRepository.update(id, data)
   // userRepository.delete(id)
   ```

2. **제한적인 타입 추론**

   ```typescript
   // Knex: 쿼리 결과 타입을 수동으로 지정해야 함
   const users = await knex('users').select('*') as User[];
   //                                             ^^^^^^^^^ 수동 캐스팅

   // TypeORM: 자동 타입 추론
   const users = await userRepository.find();
   //    ^^^^^ 자동으로 User[] 타입
   ```

3. **관계(Relation) 처리의 복잡성**

   ```typescript
   // Knex: 수동으로 JOIN 작성
   const postsWithUser = await knex('posts')
     .select('posts.*', 'users.nickname as author_name')
     .join('users', 'posts.user_id', 'users.id')
     .where('posts.id', postId);

   // 결과를 수동으로 객체 구조화
   const result = {
     ...postsWithUser[0],
     author: {
       nickname: postsWithUser[0].author_name
     }
   };

   // TypeORM: 관계 자동 로딩
   const post = await postRepository.findOne({
     where: { id: postId },
     relations: ['user']  // 자동으로 user 객체 포함
   });
   // post.user.nickname 바로 접근 가능
   ```

4. **N+1 쿼리 문제 해결의 어려움**

   ```typescript
   // Knex: N+1 문제가 쉽게 발생
   const posts = await knex('posts').select('*');

   for (const post of posts) {
     // 각 post마다 쿼리 실행 (N+1 문제!)
     post.comments = await knex('comments')
       .where('post_id', post.id)
       .select('*');
   }

   // 최적화하려면 수동으로 복잡한 JOIN 또는 서브쿼리 작성 필요
   const postsWithComments = await knex('posts')
     .select('posts.*')
     .leftJoin('comments', 'posts.id', 'comments.post_id')
     // 결과를 그룹화하는 복잡한 로직 필요...

   // TypeORM: 자동 최적화
   const posts = await postRepository.find({
     relations: ['comments']  // 자동으로 JOIN하여 최적화
   });
   ```

5. **마이그레이션의 제한적인 자동 생성**

   ```typescript
   // Knex: 마이그레이션을 100% 수동으로 작성
   export async function up(knex: Knex): Promise<void> {
     return knex.schema.createTable('users', table => {
       table.increments('id');
       table.string('email');
       // 모든 컬럼을 직접 타이핑...
     });
   }

   // TypeORM: Entity에서 마이그레이션 자동 생성
   // npx typeorm migration:generate -n CreateUsers
   // Entity 정의만으로 마이그레이션 파일 자동 생성
   ```

6. **트랜잭션 관리의 보일러플레이트**

   ```typescript
   // Knex: 트랜잭션을 명시적으로 관리
   await knex.transaction(async (trx) => {
     const userId = await trx('users').insert(userData);
     await trx('profiles').insert({ user_id: userId, ...profileData });
     await trx('settings').insert({ user_id: userId, ...settingsData });
     // 모든 쿼리에 trx를 전달해야 함
   });

   // TypeORM: 자동 트랜잭션 관리
   await entityManager.transaction(async (manager) => {
     const user = await manager.save(User, userData);
     await manager.save(Profile, { user, ...profileData });
     await manager.save(Settings, { user, ...settingsData });
     // manager가 자동으로 처리
   });
   ```

7. **학습 리소스와 커뮤니티**

   - TypeORM/Prisma에 비해 최신 튜토리얼이 적음
   - 복잡한 쿼리 패턴은 직접 찾아서 구현해야 함
   - Stack Overflow 답변 수가 ORM에 비해 적음

8. **타입 정의 동기화**

   ```typescript
   // 마이그레이션에서 컬럼 추가
   await knex.schema.alterTable('users', table => {
     table.string('phone_number');
   });

   // TypeScript 인터페이스도 수동으로 동기화 필요
   interface User {
     id: number;
     email: string;
     phone_number: string;  // ← 수동으로 추가해야 함
   }

   // TypeORM: Entity 하나만 수정하면 끝
   @Entity()
   class User {
     @Column()
     phone_number: string;  // ← 이것만으로 DB와 타입 모두 동기화
   }
   ```

### 언제 Knex가 적합하지 않은가?

다음과 같은 경우에는 TypeORM이나 Prisma를 고려하세요:

1. **빠른 프로토타이핑**: CRUD 반복 코드를 줄이고 싶을 때
2. **복잡한 객체 관계**: 1:N, N:M 관계가 많은 도메인 모델
3. **타입 안정성 최우선**: DB 스키마와 TypeScript 타입을 완벽히 동기화하고 싶을 때
4. **팀원의 SQL 지식이 부족**: ORM 패턴에 익숙한 팀
5. **대규모 엔터프라이즈**: 표준화된 패턴이 중요한 프로젝트

### 그럼에도 Knex를 선택하는 이유

현재 프로젝트에서 Knex를 선택한 이유:

1. **SQL 제어권**: 복잡한 통계/집계 쿼리의 성능 최적화
2. **학습 곡선**: SQL을 알면 바로 사용 가능
3. **가벼움**: ORM의 추상화 오버헤드 없음
4. **투명성**: 생성되는 SQL을 명확히 알 수 있음
5. **유연성**: 레거시 DB나 특수한 요구사항에 대응 용이

### SQL vs Knex 비교

```sql
-- SQL 파일
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```typescript
// Knex (TypeScript)
knex.schema.createTable('users', table => {
  table.increments('id').primary();
  table.string('email', 255).notNullable().unique();
  table.timestamp('created_at').defaultTo(knex.fn.now());
});
```

**Knex의 장점:**
- ✅ MySQL, PostgreSQL, SQLite 모두에서 동작
- ✅ 타입 체크 및 자동완성
- ✅ 프로그래밍 로직 활용 가능 (반복문, 조건문)
- ✅ 실행 전 오류 검증

---

## Knex.js vs TypeORM

### 개념 비교

| 구분 | Knex.js | TypeORM |
|------|---------|---------|
| **타입** | 쿼리 빌더 (Query Builder) | ORM (Object-Relational Mapping) |
| **접근 방식** | SQL 중심 | 객체 중심 |
| **학습 곡선** | 낮음 (SQL 지식 필요) | 높음 (ORM 개념 이해 필요) |
| **유연성** | 높음 (SQL 자유도) | 중간 (ORM 제약) |
| **복잡한 쿼리** | 쉬움 (SQL에 가까움) | 어려움 (QueryBuilder 필요) |

### 코드 비교

#### 테이블 생성

**Knex:**
```typescript
// 마이그레이션
export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', table => {
    table.increments('id').primary();
    table.string('email', 255).notNullable().unique();
    table.string('password', 255).notNullable();
    table.timestamps(true, true);
  });
}
```

**TypeORM:**
```typescript
// Entity (클래스로 정의)
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

#### 데이터 조회

**Knex:**
```typescript
// SQL에 가까운 방식
const users = await knex('users')
  .select('id', 'email')
  .where('status', 'active')
  .orderBy('created_at', 'desc')
  .limit(10);
```

**TypeORM:**
```typescript
// Repository 패턴
const users = await userRepository.find({
  select: ['id', 'email'],
  where: { status: 'active' },
  order: { created_at: 'DESC' },
  take: 10,
});
```

#### 복잡한 조인 쿼리

**Knex:**
```typescript
const result = await knex('posts')
  .select('posts.*', 'users.nickname', 'categories.name as category_name')
  .join('users', 'posts.user_id', 'users.id')
  .join('categories', 'posts.category_id', 'categories.id')
  .where('posts.status', 'published')
  .andWhere('categories.name', 'like', '%공지%');
```

**TypeORM:**
```typescript
const result = await postRepository
  .createQueryBuilder('post')
  .select(['post', 'user.nickname', 'category.name'])
  .innerJoin('post.user', 'user')
  .innerJoin('post.category', 'category')
  .where('post.status = :status', { status: 'published' })
  .andWhere('category.name LIKE :name', { name: '%공지%' })
  .getMany();
```

### 장단점 비교

#### Knex.js

**장점:**
- ✅ **SQL 지식 활용**: SQL을 알면 바로 사용 가능
- ✅ **낮은 학습 곡선**: ORM보다 배우기 쉬움
- ✅ **높은 유연성**: 원하는 대로 쿼리 작성 가능
- ✅ **성능 최적화**: SQL에 가까워 최적화가 쉬움
- ✅ **가벼움**: ORM보다 오버헤드가 적음
- ✅ **Raw SQL 지원**: 복잡한 쿼리는 직접 SQL 작성 가능

**단점:**
- ❌ **반복 코드**: CRUD 작업마다 쿼리를 직접 작성
- ❌ **타입 안정성 제한**: 쿼리 결과 타입을 수동으로 정의
- ❌ **객체 매핑 없음**: DB 결과를 객체로 변환하는 작업 필요
- ❌ **관계 관리**: 외래 키 관계를 수동으로 관리

#### TypeORM

**장점:**
- ✅ **객체 지향**: 클래스와 객체로 데이터 다룸
- ✅ **자동 타입 추론**: Entity에서 타입이 자동으로 추론됨
- ✅ **관계 관리**: 관계를 코드로 표현하고 자동으로 처리
- ✅ **적은 보일러플레이트**: CRUD는 자동 생성
- ✅ **Active Record / Data Mapper**: 다양한 패턴 지원
- ✅ **마이그레이션 자동 생성**: Entity 변경 시 자동 생성 가능

**단점:**
- ❌ **학습 곡선**: ORM 개념과 API를 배워야 함
- ❌ **복잡한 쿼리**: 복잡한 쿼리는 QueryBuilder를 사용해야 하고, 오히려 더 복잡
- ❌ **성능 오버헤드**: 객체 변환 과정에서 오버헤드 발생
- ❌ **마법 같은 동작**: 내부 동작을 이해하기 어려움
- ❌ **디버깅 어려움**: 생성된 SQL을 확인하고 디버깅하기 어려움

### 언제 무엇을 선택할까?

#### Knex.js를 선택하는 경우

1. **SQL에 익숙한 팀**
   - SQL 경험이 풍부한 개발자
   - DB 스키마 설계를 중요하게 생각하는 프로젝트

2. **복잡한 쿼리가 많은 경우**
   - 통계, 집계, 복잡한 조인
   - 성능 최적화가 중요한 프로젝트

3. **가벼운 프로젝트**
   - 간단한 API 서버
   - 마이크로서비스

4. **유연성이 필요한 경우**
   - 레거시 DB 연동
   - 동적 쿼리 생성

#### TypeORM을 선택하는 경우

1. **도메인 중심 설계**
   - DDD (Domain-Driven Design) 적용
   - 비즈니스 로직이 복잡한 경우

2. **빠른 개발**
   - CRUD 위주의 애플리케이션
   - 프로토타입 개발

3. **ORM 경험이 있는 팀**
   - 다른 언어에서 ORM 사용 경험
   - 객체 지향에 익숙한 팀

4. **타입 안정성 중시**
   - Entity로 타입을 정의하고 전체에서 재사용

### 실무 조합 패턴

많은 프로젝트에서 **두 가지를 함께 사용**합니다:

```typescript
// TypeORM: 간단한 CRUD
const user = await userRepository.findOne({ where: { id: 1 } });

// Knex: 복잡한 통계 쿼리
const stats = await knex('posts')
  .select(knex.raw('DATE(created_at) as date'))
  .count('* as count')
  .groupBy(knex.raw('DATE(created_at)'))
  .orderBy('date', 'desc');
```

### 결론

| 프로젝트 특성 | 추천 |
|--------------|------|
| SQL 중심, 복잡한 쿼리 | **Knex.js** |
| 객체 중심, 빠른 개발 | **TypeORM** |
| 성능 최적화 중요 | **Knex.js** |
| 타입 안정성 중요 | **TypeORM** |
| 작은 프로젝트 | **Knex.js** |
| 큰 엔터프라이즈 | **TypeORM** |

**현재 프로젝트는 Knex.js를 선택**했으며, 이는 다음과 같은 이유입니다:
- 커뮤니티 게시판 특성상 복잡한 조회/통계 쿼리가 많을 것으로 예상
- SQL 기반의 명확한 쿼리 작성으로 성능 최적화 용이
- 가벼운 구조로 빠른 응답 시간 확보

---

## 프로젝트 구조

```
project/
├── knexfile.ts                 # Knex 설정 파일 (환경별 DB 설정)
├── src/
│   ├── config/
│   │   └── database.ts         # DB 인스턴스 생성
│   └── db/
│       ├── migrations/         # 마이그레이션 파일
│       │   ├── 001_create_users_table.ts
│       │   ├── 002_create_categories_table.ts
│       │   └── ...
│       └── seeds/              # 시드 파일
│           ├── 001_categories.ts
│           ├── 002_users.ts
│           └── ...
└── tests/
    └── __helpers/
        └── db.ts               # 테스트용 DB 헬퍼
```

---

## 설정 파일

### knexfile.ts

**역할:**
- Knex CLI가 읽는 설정 파일
- 환경별(development, test, production) DB 연결 정보
- 마이그레이션/시드 디렉토리 경로

**주요 설정:**

```typescript
const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',              // DB 클라이언트
    connection: { /* ... */ },     // 연결 정보
    migrations: {
      directory: './src/db/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/db/seeds',
      extension: 'ts',
    },
    pool: { min: 2, max: 10 },     // 커넥션 풀 크기
  },

  test: {
    client: 'sqlite3',             // 테스트는 SQLite 인메모리 사용
    connection: { filename: ':memory:' },
    useNullAsDefault: true,        // SQLite 호환성
  },

  production: {
    client: 'mysql2',
    migrations: {
      directory: './dist/db/migrations',  // 컴파일된 JS 사용
      extension: 'js',
    },
    pool: { min: 2, max: 20 },     // 프로덕션은 더 큰 풀
  },
};
```

**환경별 차이점:**

| 환경 | DB | 마이그레이션 경로 | 확장자 | 풀 크기 |
|------|----|--------------------|--------|---------|
| development | MySQL | ./src/db/migrations | .ts | 2-10 |
| test | SQLite | ./src/db/migrations | .ts | 0-1 |
| production | MySQL | ./dist/db/migrations | .js | 2-20 |

### src/config/database.ts

**역할:**
- 애플리케이션 런타임에서 사용하는 DB 인스턴스 생성
- knexfile.ts의 설정을 읽어서 Knex 인스턴스 생성

```typescript
import knex from 'knex';
import knexConfig from '../../knexfile';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

const db = knex(config);

export default db;
```

**knexfile.ts vs database.ts:**
- `knexfile.ts`: 설정만 정의 (연결 생성 X)
- `database.ts`: knexfile의 설정을 읽어서 실제 연결 생성 (연결 생성 O)

### 왜 프로덕션은 JavaScript(.js)를 사용하나?

프로덕션 환경에서 `./dist/db/migrations/*.js`를 사용하는 이유를 이해하는 것이 중요합니다.

#### TypeScript는 컴파일 언어

TypeScript는 **브라우저나 Node.js에서 직접 실행할 수 없습니다**. 반드시 JavaScript로 변환(컴파일)해야 합니다.

```
개발 환경:
  TypeScript 파일 (.ts)
  ↓ (ts-node-dev가 실시간 변환)
  실행

프로덕션 환경:
  TypeScript 파일 (.ts)
  ↓ (tsc 명령어로 사전 컴파일)
  JavaScript 파일 (.js)
  ↓
  실행
```

#### 빌드 과정

```bash
# 개발 환경
npm run dev
# = ts-node-dev src/server.ts
# → TypeScript를 실시간으로 변환하며 실행

# 프로덕션 빌드
npm run build
# = tsc -p tsconfig.build.json
# → TypeScript를 JavaScript로 변환하여 dist/ 폴더에 저장

# 프로덕션 실행
npm start
# = node dist/server.js
# → 이미 변환된 JavaScript 실행
```

#### 빌드 전후 디렉토리 구조

```
빌드 전:
src/
├── server.ts
├── db/
│   ├── migrations/
│   │   ├── 001_create_users_table.ts
│   │   └── 002_create_posts_table.ts
│   └── seeds/
│       └── 001_categories.ts

빌드 후 (npm run build):
dist/
├── server.js                          ← 컴파일된 JS
├── db/
│   ├── migrations/
│   │   ├── 001_create_users_table.js  ← 컴파일된 JS
│   │   └── 002_create_posts_table.js  ← 컴파일된 JS
│   └── seeds/
│       └── 001_categories.js          ← 컴파일된 JS
```

#### 프로덕션에서 JavaScript를 사용하는 5가지 이유

**1. 성능**

```typescript
// TypeScript 실행 (개발)
ts-node server.ts
  ↓ (매번 변환 - 오버헤드 발생)
  실행 (느림)

// JavaScript 실행 (프로덕션)
node server.js
  ↓ (이미 변환됨)
  실행 (빠름, 즉시 시작)
```

**2. 의존성 최소화**

```json
// package.json
{
  "dependencies": {
    "knex": "^3.1.0",
    "mysql2": "^3.10.3"
    // TypeScript 관련 패키지 없음!
  },
  "devDependencies": {
    "typescript": "^5.4.5",      // 개발용
    "ts-node": "^10.9.2",        // 개발용
    "ts-node-dev": "^2.0.0"      // 개발용
  }
}
```

프로덕션 배포 시:
```bash
npm install --omit=dev
# devDependencies는 설치하지 않음
# → 더 작은 이미지 크기, 빠른 배포
```

**3. Docker 이미지 크기**

```dockerfile
# Development 이미지
FROM node:20-alpine
COPY . .                           # 모든 소스 코드
RUN npm install                    # devDependencies 포함
CMD ["npm", "run", "dev"]
# 크기: ~500MB

# Production 이미지
FROM node:20-alpine
COPY --from=build /usr/src/app/dist ./dist  # JavaScript만
RUN npm install --omit=dev                  # 프로덕션 의존성만
CMD ["node", "dist/server.js"]
# 크기: ~150MB (3배 이상 작음!)
```

**4. 안정성**

```typescript
// TypeScript: 런타임에 변환하다 실패할 수 있음
ts-node server.ts
// ❌ 메모리 부족으로 변환 실패 가능성

// JavaScript: 이미 변환된 파일 실행
node server.js
// ✅ 변환 과정 없이 바로 실행, 안정적
```

**5. 배포 프로세스 최적화**

```
CI/CD 파이프라인:

1. 빌드 단계 (한 번만)
   git push
   ↓
   npm run build (TypeScript → JavaScript)
   ↓
   dist/ 폴더 생성
   ↓
   Docker 이미지 빌드

2. 배포 단계 (여러 서버에 동시 배포)
   Docker 이미지 배포
   ↓
   서버 1: node dist/server.js
   서버 2: node dist/server.js
   서버 3: node dist/server.js
   (각 서버에서 TypeScript 변환 불필요 → 빠른 시작)
```

#### 환경별 실행 방식 비교

| 환경 | 파일 | 위치 | 실행 방식 | 우선순위 |
|------|------|------|----------|---------|
| **development** | .ts | ./src/ | ts-node-dev (실시간 변환) | 개발자 경험(DX) |
| **test** | .ts | ./src/ | ts-jest (테스트 시 변환) | 개발자 경험(DX) |
| **production** | .js | ./dist/ | node (변환 없이 실행) | 성능과 안정성 |

#### 프로덕션 마이그레이션 실행

```bash
# 프로덕션 서버에서 마이그레이션 실행
NODE_ENV=production npm run db:migrate

# 내부 동작:
# 1. NODE_ENV=production 확인
# 2. knexConfig.production 선택
# 3. directory: './dist/db/migrations' 사용
# 4. 001_create_users_table.js 실행 (이미 컴파일됨)
# 5. 002_create_posts_table.js 실행 (이미 컴파일됨)
```

#### 만약 프로덕션에서 .ts를 사용한다면?

```typescript
// ❌ 잘못된 설정
production: {
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',
  },
}

// 실행 시 발생하는 문제들:
// 1. ❌ Error: Cannot find module './src/db/migrations/...'
//    → src/ 폴더가 프로덕션 이미지에 없음!

// 2. ❌ Error: ts-node not found
//    → devDependencies가 설치되지 않음!

// 3. ❌ 실행 시마다 TypeScript 컴파일 오버헤드
//    → 시작 시간 3-5배 느림
```

#### 핵심 원칙

**개발 환경: 편의성 우선**
- TypeScript 실시간 변환
- 코드 수정 즉시 반영
- 디버깅 편의성

**프로덕션 환경: 성능과 안정성 우선**
- 사전 컴파일된 JavaScript
- 빠른 시작 시간
- 최소한의 의존성
- 안정적인 실행

---

## 마이그레이션

### 마이그레이션이란?

데이터베이스 스키마의 **버전 관리 시스템**입니다. Git이 코드를 관리하듯, 마이그레이션은 DB 구조를 관리합니다.

### 마이그레이션 파일 구조

```typescript
import { Knex } from 'knex';

// 적용: DB 구조 변경
export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', table => {
    table.increments('id').primary();
    table.string('email', 255).notNullable().unique();
    table.timestamps(true, true);
  });
}

// 롤백: 변경 취소
export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('users');
}
```

### 파일명 규칙

#### 1. 수동 넘버링 (현재 프로젝트 방식)

```
001_create_users_table.ts
002_create_categories_table.ts
003_create_tags_table.ts
```

**장점:** 간단하고 순서가 명확
**단점:** 여러 개발자 동시 작업 시 번호 충돌 가능

#### 2. 타임스탬프 (Knex 기본값)

```bash
npx knex migrate:make add_bio_to_users
# 생성: 20250130143022_add_bio_to_users.ts
```

**장점:** 충돌 없음, 생성 시각 포함
**단점:** 파일명이 길고 덜 직관적

### 마이그레이션 명령어

```bash
# 마이그레이션 생성 (타임스탬프 방식)
npx knex migrate:make migration_name

# 마이그레이션 실행 (미실행 파일 모두 실행)
npm run db:migrate
# = knex migrate:latest

# 마이그레이션 상태 확인
npm run db:status
# = knex migrate:status

# 롤백 (최근 배치 1개)
npm run db:rollback
# = knex migrate:rollback

# 전체 롤백
npx knex migrate:rollback --all

# 특정 개수만큼 롤백
npx knex migrate:rollback --step=2
```

### 배치(Batch) 시스템

Knex는 마이그레이션을 **배치 단위**로 관리합니다.

```
초기 상태: 빈 DB
  ↓
npm run db:migrate (1차 실행)
  → 001~007 모두 실행 → batch 1로 기록
  ↓
008_add_bio.ts 추가
npm run db:migrate (2차 실행)
  → 008만 실행 → batch 2로 기록
  ↓
npm run db:rollback
  → batch 2만 롤백 (008만 취소)
  → 001~007은 그대로 유지
```

### 배치 추적 테이블

Knex는 자동으로 `knex_migrations` 테이블을 생성하여 실행 이력을 저장합니다.

```sql
SELECT * FROM knex_migrations;

-- 결과:
-- id | name                          | batch | migration_time
-- 1  | 001_create_users_table.ts     | 1     | 2025-01-30 12:00:00
-- 2  | 002_create_categories_table.ts| 1     | 2025-01-30 12:00:01
-- 3  | 008_add_bio_to_users.ts       | 2     | 2025-01-30 14:30:22
```

### 실무 마이그레이션 패턴

#### ❌ 잘못된 방법: 기존 파일 수정

```typescript
// 001_create_users_table.ts 파일을 직접 수정 ❌
table.string('bio', 500).nullable();  // 추가
```

**문제:**
- 이미 실행된 마이그레이션은 재실행 안 됨
- 팀원들의 DB와 불일치 발생

#### ✅ 올바른 방법: 새 마이그레이션 추가

```typescript
// 008_add_bio_to_users.ts (새 파일 생성)
export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', table => {
    table.string('bio', 500).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', table => {
    table.dropColumn('bio');
  });
}
```

### 다양한 마이그레이션 예시

#### 컬럼 추가

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', table => {
    table.string('phone_number', 20).nullable();
    table.index(['phone_number']);
  });
}
```

#### 컬럼 이름 변경

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', table => {
    table.renameColumn('nickname', 'username');
  });
}
```

#### 인덱스 추가

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('posts', table => {
    table.index(['created_at']);
    table.index(['user_id', 'created_at']); // 복합 인덱스
  });
}
```

#### 데이터 마이그레이션

```typescript
export async function up(knex: Knex): Promise<void> {
  // 1. 새 컬럼 추가
  await knex.schema.alterTable('users', table => {
    table.string('avatar_url', 500).nullable();
  });

  // 2. 기존 데이터 변환
  await knex('users')
    .whereNotNull('profile_url')
    .update({
      avatar_url: knex.raw("CONCAT('https://cdn.example.com/', profile_url)")
    });

  // 3. 구 컬럼 삭제
  await knex.schema.alterTable('users', table => {
    table.dropColumn('profile_url');
  });
}
```

---

## 시드

### 시드란?

테스트나 개발을 위한 **초기 데이터**를 삽입하는 스크립트입니다.

### 시드 파일 구조

```typescript
import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // 기존 데이터 삭제 (멱등성 보장)
  await knex('categories').del();

  // 새 데이터 삽입
  await knex('categories').insert([
    { name: '공지사항', description: '공지용 카테고리' },
    { name: '자유게시판', description: '자유롭게 소통하는 공간' },
    { name: 'Q&A', description: '질문과 답변' },
  ]);
}
```

### 멱등성 (Idempotency)

시드는 여러 번 실행해도 같은 결과를 보장해야 합니다.

```typescript
export async function seed(knex: Knex): Promise<void> {
  // 방법 1: 먼저 삭제
  await knex('users').del();
  await knex('users').insert([...]);

  // 방법 2: upsert (있으면 업데이트, 없으면 삽입)
  await knex('users')
    .insert({ email: 'admin@example.com', ... })
    .onConflict('email')
    .merge();
}
```

### 시드 명령어

```bash
# 시드 실행
npm run db:seed
# = knex seed:run

# 전체 리셋 (롤백 + 마이그레이션 + 시드)
npm run db:reset
# = knex migrate:rollback --all && knex migrate:latest && knex seed:run
```

---

## 실행 흐름

### Docker Compose 환경

```bash
# 1. 컨테이너 시작
docker-compose up

# 실행되는 것:
#   - db 컨테이너: MySQL 8.0 시작 (빈 DB)
#   - app 컨테이너: Node.js 애플리케이션 시작

# 2. 마이그레이션 실행 (수동)
docker-compose exec app npm run db:migrate

# 3. 시드 실행 (수동)
docker-compose exec app npm run db:seed
```

**중요:** `docker-compose up`만으로는 테이블이 자동 생성되지 않습니다!

### 로컬 환경

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env

# 3. 마이그레이션 실행
npm run db:migrate

# 4. 시드 실행
npm run db:seed

# 5. 애플리케이션 시작
npm run dev
```

### 테스트 환경

```typescript
// tests/__helpers/db.ts
export async function createTestDatabase(): Promise<Knex> {
  const testDb = knex({
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });

  // 마이그레이션 실행
  await testDb.migrate.latest();

  return testDb;
}
```

테스트는 SQLite 인메모리를 사용하여:
- ✅ 빠른 실행 속도
- ✅ 각 테스트마다 깨끗한 상태
- ✅ 별도 DB 서버 불필요

---

## 실무 팁

### 1. 마이그레이션 불변성 원칙

**한 번 실행된 마이그레이션은 절대 수정하지 마세요!**

```
Git 커밋처럼 생각하기:
  - 커밋 후 히스토리 수정 안 함
  - 수정이 필요하면 새 커밋 추가

마이그레이션도 동일:
  - 실행 후 파일 수정 안 함
  - 수정이 필요하면 새 마이그레이션 추가
```

**예외:** 아직 프로덕션에 배포되지 않았고, 팀원도 실행하지 않은 경우에만 수정 가능.

### 2. 롤백보다 전진 (Forward-Only)

프로덕션에서는 롤백 대신 수정하는 새 마이그레이션을 추가하세요.

```typescript
// ❌ 프로덕션에서 롤백 (데이터 손실 위험)
npm run db:rollback

// ✅ 수정하는 새 마이그레이션 추가
// 009_fix_user_email_length.ts
export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', table => {
    table.string('email', 320).alter(); // RFC 5321 표준
  });
}
```

### 3. Blue-Green 마이그레이션

다운타임 없이 컬럼을 변경하는 방법:

```
1단계: 새 컬럼 추가 (기존 컬럼 유지)
  → 마이그레이션 010

2단계: 애플리케이션 코드 업데이트 (양쪽 컬럼 모두 쓰기)
  → 배포

3단계: 데이터 마이그레이션
  → 마이그레이션 011

4단계: 애플리케이션 코드 업데이트 (새 컬럼만 사용)
  → 배포

5단계: 구 컬럼 삭제
  → 마이그레이션 012
```

### 4. 의미 있는 마이그레이션 이름

```bash
# ✅ 명확한 이름
npx knex migrate:make add_bio_to_users
npx knex migrate:make create_payments_table
npx knex migrate:make add_index_to_posts_created_at

# ❌ 불명확한 이름
npx knex migrate:make update_users
npx knex migrate:make fix
npx knex migrate:make changes
```

### 5. down 함수 정확하게 작성

```typescript
// ✅ 올바른 down 함수
export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', table => {
    table.string('bio', 500).nullable();
    table.index(['bio']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', table => {
    table.dropIndex(['bio']);  // 인덱스부터 삭제
    table.dropColumn('bio');
  });
}
```

### 6. 트랜잭션 사용

복잡한 마이그레이션은 트랜잭션으로 감싸세요:

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.transaction(async (trx) => {
    await trx.schema.alterTable('users', table => {
      table.string('new_field');
    });

    await trx('users').update({ new_field: 'default_value' });

    await trx.schema.alterTable('users', table => {
      table.string('new_field').notNullable().alter();
    });
  });
}
```

### 7. 환경별 테스트

```bash
# 테스트 DB에서 먼저 실행
NODE_ENV=test npm run db:migrate

# 스테이징 환경에서 검증
NODE_ENV=staging npm run db:migrate

# 문제없으면 프로덕션 적용
NODE_ENV=production npm run db:migrate
```

---

## 참고 자료

- [Knex.js 공식 문서](https://knexjs.org/)
- [마이그레이션 가이드](https://knexjs.org/guide/migrations.html)
- [스키마 빌더 API](https://knexjs.org/guide/schema-builder.html)
- [쿼리 빌더 API](https://knexjs.org/guide/query-builder.html)
- [TypeORM 공식 문서](https://typeorm.io/)