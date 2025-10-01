/**
 * 사용자 도메인 타입 정의
 */

/**
 * 사용자 역할
 */
export type UserRole = 'user' | 'admin';

/**
 * 사용자 상태
 */
export type UserStatus = 'active' | 'suspended' | 'deleted';

/**
 * 데이터베이스 사용자 엔티티 (snake_case)
 * users 테이블의 원시 데이터 구조
 */
export interface UserEntity {
  id: number;
  email: string;
  password: string;
  nickname: string;
  profile_url: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

/**
 * 사용자 생성 데이터 전송 객체
 * 회원가입 시 필요한 필수 정보
 */
export interface CreateUserDTO {
  email: string;
  password: string; // 해싱된 비밀번호
  nickname: string;
  profile_url?: string;
  role?: UserRole;
  status?: UserStatus;
}

/**
 * 사용자 수정 데이터 전송 객체
 * 모든 필드가 선택적이며, 제공된 필드만 수정됨
 */
export interface UpdateUserDTO {
  email?: string;
  password?: string; // 해싱된 비밀번호
  nickname?: string;
  profile_url?: string | null;
  role?: UserRole;
  status?: UserStatus;
}

/**
 * 사용자 필터 조건
 * 사용자 목록 조회 시 사용
 */
export interface UserFilter {
  role?: UserRole;
  status?: UserStatus;
  email?: string;
  nickname?: string;
}

/**
 * 안전한 사용자 응답 객체 (비밀번호 제외)
 * API 응답에 사용됨
 */
export interface SafeUser {
  id: number;
  email: string;
  nickname: string;
  profileUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 사용자 생성 입력 객체 (서비스 레이어용)
 * 평문 비밀번호를 받아 서비스 레이어에서 해싱 처리
 */
export interface CreateUserInput {
  email: string;
  password: string; // 평문 비밀번호
  nickname: string;
  profileUrl?: string;
}

/**
 * 사용자 수정 입력 객체 (서비스 레이어용)
 * 평문 비밀번호를 받아 서비스 레이어에서 해싱 처리
 */
export interface UpdateUserInput {
  email?: string;
  password?: string; // 평문 비밀번호 (제공 시 해싱)
  nickname?: string;
  profileUrl?: string | null;
}
