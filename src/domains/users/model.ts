/**
 * 사용자 도메인 모델
 *
 * 사용자 엔티티의 비즈니스 로직과 데이터 변환을 담당합니다.
 * 데이터베이스의 snake_case를 TypeScript의 camelCase로 변환하고,
 * 도메인 로직을 캡슐화합니다.
 */

import { UserEntity, UserRole, UserStatus, SafeUser } from './types';

export class User {
  constructor(
    readonly id: number,
    readonly email: string,
    private readonly password: string, // private으로 외부 노출 방지
    readonly nickname: string,
    readonly profileUrl: string | null,
    readonly role: UserRole,
    readonly status: UserStatus,
    readonly createdAt: Date,
    readonly updatedAt: Date
  ) {}

  /**
   * 비밀번호를 제외한 안전한 사용자 객체 반환
   * API 응답에 사용됨
   */
  toJSON(): SafeUser {
    return {
      id: this.id,
      email: this.email,
      nickname: this.nickname,
      profileUrl: this.profileUrl,
      role: this.role,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * 도메인 모델을 데이터베이스 엔티티로 변환
   * 주로 업데이트 작업에 사용됨
   */
  toEntity(): UserEntity {
    return {
      id: this.id,
      email: this.email,
      password: this.password,
      nickname: this.nickname,
      profile_url: this.profileUrl,
      role: this.role,
      status: this.status,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  /**
   * 비밀번호 해시 값 반환 (인증 시에만 사용)
   * 외부에서 직접 접근할 수 없도록 getter로 제공
   */
  getPassword(): string {
    return this.password;
  }

  /**
   * 관리자 권한 확인
   */
  isAdmin(): boolean {
    return this.role === 'admin';
  }

  /**
   * 활성 상태 확인
   */
  isActive(): boolean {
    return this.status === 'active';
  }

  /**
   * 정지 상태 확인
   */
  isSuspended(): boolean {
    return this.status === 'suspended';
  }

  /**
   * 삭제 상태 확인
   */
  isDeleted(): boolean {
    return this.status === 'deleted';
  }

  /**
   * 데이터베이스 엔티티로부터 도메인 모델 생성
   * 팩토리 메서드 패턴
   */
  static fromEntity(entity: UserEntity): User {
    return new User(
      entity.id,
      entity.email,
      entity.password,
      entity.nickname,
      entity.profile_url,
      entity.role,
      entity.status,
      new Date(entity.created_at),
      new Date(entity.updated_at)
    );
  }
}
