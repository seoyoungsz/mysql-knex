/**
 * 사용자 서비스
 *
 * 사용자 관련 비즈니스 로직을 담당합니다.
 * - 비밀번호 해싱 및 검증
 * - 중복 검사 (이메일, 닉네임)
 * - 사용자 생성/수정/조회 비즈니스 규칙
 */

import bcrypt from 'bcrypt';
import { Knex } from 'knex';
import { env } from '../../config/env';
import { User } from './model';
import { UserRepository } from './repository';
import { CreateUserInput, UpdateUserInput, SafeUser } from './types';

export class UserService {
  private readonly repository: UserRepository;

  constructor(knex: Knex) {
    this.repository = new UserRepository(knex);
  }

  /**
   * 비밀번호를 안전하게 해싱
   *
   * @param password 평문 비밀번호
   * @returns 해싱된 비밀번호
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, env.bcryptSaltRounds);
  }

  /**
   * 비밀번호 검증
   *
   * @param plainPassword 평문 비밀번호
   * @param hashedPassword 해싱된 비밀번호
   * @returns 일치 여부
   */
  async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * 새로운 사용자 생성
   *
   * @param input 사용자 생성 입력 데이터
   * @param trx 트랜잭션 (선택적)
   * @returns 생성된 사용자
   * @throws 이메일 또는 닉네임 중복 시 에러
   */
  async createUser(input: CreateUserInput, trx?: Knex.Transaction): Promise<User> {
    // 이메일 중복 검사
    const emailExists = await this.repository.existsByEmail(input.email, undefined, trx);
    if (emailExists) {
      throw new Error('Email already exists');
    }

    // 닉네임 중복 검사
    const nicknameExists = await this.repository.existsByNickname(input.nickname, undefined, trx);
    if (nicknameExists) {
      throw new Error('Nickname already exists');
    }

    // 비밀번호 해싱
    const hashedPassword = await this.hashPassword(input.password);

    // 사용자 생성
    return this.repository.create(
      {
        email: input.email,
        password: hashedPassword,
        nickname: input.nickname,
        profile_url: input.profileUrl,
      },
      trx
    );
  }

  /**
   * ID로 사용자 조회
   *
   * @param id 사용자 ID
   * @param trx 트랜잭션 (선택적)
   * @returns 사용자 또는 null
   */
  async getUserById(id: number, trx?: Knex.Transaction): Promise<User | null> {
    return this.repository.findById(id, trx);
  }

  /**
   * 이메일로 사용자 조회
   * 주로 로그인 인증에 사용
   *
   * @param email 이메일 주소
   * @param trx 트랜잭션 (선택적)
   * @returns 사용자 또는 null
   */
  async getUserByEmail(email: string, trx?: Knex.Transaction): Promise<User | null> {
    return this.repository.findByEmail(email, trx);
  }

  /**
   * 안전한 사용자 프로필 조회 (비밀번호 제외)
   *
   * @param id 사용자 ID
   * @param trx 트랜잭션 (선택적)
   * @returns 안전한 사용자 객체
   * @throws 사용자를 찾을 수 없을 때
   */
  async getUserProfile(id: number, trx?: Knex.Transaction): Promise<SafeUser> {
    const user = await this.repository.findById(id, trx);

    if (!user) {
      throw new Error('User not found');
    }

    return user.toJSON();
  }

  /**
   * 사용자 정보 수정
   *
   * @param id 사용자 ID
   * @param input 수정할 데이터
   * @param trx 트랜잭션 (선택적)
   * @returns 수정된 사용자
   * @throws 사용자를 찾을 수 없거나 중복 데이터가 있을 때
   */
  async updateUser(id: number, input: UpdateUserInput, trx?: Knex.Transaction): Promise<User> {
    // 사용자 존재 확인
    const existingUser = await this.repository.findById(id, trx);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // 이메일 변경 시 중복 검사 (자신 제외)
    if (input.email !== undefined && input.email !== existingUser.email) {
      const emailExists = await this.repository.existsByEmail(input.email, id, trx);
      if (emailExists) {
        throw new Error('Email already exists');
      }
    }

    // 닉네임 변경 시 중복 검사 (자신 제외)
    if (input.nickname !== undefined && input.nickname !== existingUser.nickname) {
      const nicknameExists = await this.repository.existsByNickname(input.nickname, id, trx);
      if (nicknameExists) {
        throw new Error('Nickname already exists');
      }
    }

    // 비밀번호 변경 시 해싱
    const updateData: {
      email?: string;
      password?: string;
      nickname?: string;
      profile_url?: string | null;
    } = {
      email: input.email,
      nickname: input.nickname,
      profile_url: input.profileUrl,
    };

    if (input.password !== undefined) {
      updateData.password = await this.hashPassword(input.password);
    }

    // 사용자 수정
    const updatedUser = await this.repository.update(id, updateData, trx);

    if (!updatedUser) {
      throw new Error('Failed to update user');
    }

    return updatedUser;
  }

  /**
   * 비밀번호 변경 전용 메서드
   *
   * @param id 사용자 ID
   * @param newPassword 새로운 평문 비밀번호
   * @param trx 트랜잭션 (선택적)
   * @throws 사용자를 찾을 수 없을 때
   */
  async updatePassword(id: number, newPassword: string, trx?: Knex.Transaction): Promise<void> {
    const user = await this.repository.findById(id, trx);
    if (!user) {
      throw new Error('User not found');
    }

    const hashedPassword = await this.hashPassword(newPassword);
    await this.repository.update(id, { password: hashedPassword }, trx);
  }
}
