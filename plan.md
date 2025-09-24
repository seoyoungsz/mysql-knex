# 커뮤니티 게시판 PRD (Product Requirements Document)

## 1. Overview
이 프로젝트는 **MySQL + Knex.js**를 활용하여 커뮤니티 게시판 시스템을 구축하는 것을 목표로 한다.  
주요 학습 포인트:
- 관계형 데이터베이스 설계 (User, Post, Comment 등)
- Knex.js 기반의 Migration, Seed, Query Builder 활용
- 트랜잭션/Join/GroupBy 등 SQL 고급 기능 연습
- RESTful API + 기본 CRUD 패턴

---

## 2. Core Features

### 2.1 사용자(User)
- 회원가입 / 로그인
- 닉네임, 이메일, 비밀번호
- 프로필 이미지 (선택)

### 2.2 게시글(Post)
- 게시글 작성 / 조회 / 수정 / 삭제
- 카테고리(Category) 선택 가능
- 태그(Tag) 추가 가능 (Many-to-Many 관계)

### 2.3 댓글(Comment)
- 특정 게시글에 댓글 작성 가능
- 댓글 수정 / 삭제
- 대댓글 (replyDepth = 1까지만 지원)

### 2.4 좋아요(Like)
- 게시글 및 댓글에 좋아요 가능
- 중복 좋아요 방지

### 2.5 검색/필터링
- 게시글 제목 + 내용 검색 (LIKE 쿼리)
- 카테고리별/태그별 필터링
- 최신순/좋아요순 정렬

### 2.6 관리자(Admin)
- 게시글/댓글 삭제 권한
- 유저 정지 처리

---

## 3. Database Schema (초안)

### User
| Column       | Type        | Constraints              |
|--------------|------------|--------------------------|
| id           | INT PK AI   |                          |
| email        | VARCHAR(100)| UNIQUE, NOT NULL         |
| password     | VARCHAR(255)| NOT NULL                 |
| nickname     | VARCHAR(50) | NOT NULL                 |
| profile_url  | VARCHAR(255)| NULLABLE                 |
| created_at   | DATETIME    | DEFAULT NOW              |

### Post
| Column       | Type        | Constraints              |
|--------------|-------------|--------------------------|
| id           | INT PK AI   |                          |
| user_id      | INT FK(User)| NOT NULL                 |
| title        | VARCHAR(255)| NOT NULL                 |
| content      | TEXT        | NOT NULL                 |
| category_id  | INT FK(Category)| NOT NULL            |
| created_at   | DATETIME    | DEFAULT NOW              |
| updated_at   | DATETIME    | ON UPDATE CURRENT_TIMESTAMP |

### Comment
| Column       | Type        | Constraints              |
|--------------|-------------|--------------------------|
| id           | INT PK AI   |                          |
| post_id      | INT FK(Post)| NOT NULL                 |
| user_id      | INT FK(User)| NOT NULL                 |
| parent_id    | INT (self FK)| NULLABLE (대댓글 지원)  |
| content      | TEXT        | NOT NULL                 |
| created_at   | DATETIME    | DEFAULT NOW              |

### Category
| Column       | Type        | Constraints              |
|--------------|-------------|--------------------------|
| id           | INT PK AI   |                          |
| name         | VARCHAR(50) | UNIQUE, NOT NULL         |

### Tag
| Column       | Type        | Constraints              |
|--------------|-------------|--------------------------|
| id           | INT PK AI   |                          |
| name         | VARCHAR(50) | UNIQUE, NOT NULL         |

### PostTag (Many-to-Many)
| Column       | Type        | Constraints              |
|--------------|-------------|--------------------------|
| post_id      | INT FK(Post)| PK                       |
| tag_id       | INT FK(Tag) | PK                       |

### Like
| Column       | Type        | Constraints              |
|--------------|-------------|--------------------------|
| id           | INT PK AI   |                          |
| user_id      | INT FK(User)| NOT NULL                 |
| target_type  | ENUM('post','comment') | NOT NULL      |
| target_id    | INT         | NOT NULL                 |
| created_at   | DATETIME    | DEFAULT NOW              |

---

## 4. API Endpoints (예시)

### User
- `POST /users/register` → 회원가입
- `POST /users/login` → 로그인
- `GET /users/:id` → 프로필 조회

### Post
- `POST /posts` → 게시글 작성
- `GET /posts` → 게시글 목록 조회 (검색/필터링 지원)
- `GET /posts/:id` → 게시글 상세 조회 (댓글 포함)
- `PUT /posts/:id` → 게시글 수정
- `DELETE /posts/:id` → 게시글 삭제

### Comment
- `POST /posts/:id/comments` → 댓글 작성
- `PUT /comments/:id` → 댓글 수정
- `DELETE /comments/:id` → 댓글 삭제

### Like
- `POST /likes` → 좋아요 추가
- `DELETE /likes` → 좋아요 취소

---

## 5. Tech Stack
- **Backend**: Node.js (Express or Fastify) + Knex.js
- **Database**: MySQL
- **ORM/Query**: Knex.js (Migration, Seed, Query Builder)
- **Auth**: JWT 기반 토큰 인증
- **API Docs**: Swagger or Redoc

---

## 6. Milestones
1. 프로젝트 초기 설정 (Node.js + Knex + MySQL 연결)
2. User, Post, Comment 기본 CRUD 구현
3. Migration & Seed 데이터 구성
4. Like, Tag, Category 확장
5. 검색/필터링 기능 추가
6. 관리자(Admin) 기능 추가
7. 배포 및 문서화

---