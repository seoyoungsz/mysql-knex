/**
 * 사용자 리포지토리
 *
 * 사용자 데이터베이스 작업을 담당하는 리포지토리 레이어입니다.
 * 데이터베이스와의 모든 상호작용을 캡슐화하며,
 * 비즈니스 로직은 포함하지 않습니다.
 */

import { Knex } from 'knex';
import { User } from './model';
import { UserEntity, CreateUserDTO, UpdateUserDTO, UserFilter } from './types';

export class UserRepository {
  private readonly tableName = 'users';

  constructor(private readonly knex: Knex) {}

  /**
   * count 쿼리 결과를 숫자로 변환하는 헬퍼 메서드
   * Knex의 count()는 DB에 따라 string 또는 number를 반환할 수 있음
   */
  private async getCount(query: Knex.QueryBuilder<UserEntity, UserEntity[]>): Promise<number> {
    const result = (await query.count('id as count').first()) as
      | { count: string | number }
      | undefined;

    return Number(result?.count || 0);
  }

  /**
   * 새로운 사용자 생성
   *
   * @param data 생성할 사용자 데이터
   * @param trx 트랜잭션 (선택적)
   * @returns 생성된 사용자
   * @throws 이메일 또는 닉네임 중복 시 에러
   */
  async create(data: CreateUserDTO, trx?: Knex.Transaction): Promise<User> {
    const db = trx || this.knex;

    const [id] = await db<UserEntity>(this.tableName).insert({
      email: data.email,
      password: data.password,
      nickname: data.nickname,
      profile_url: data.profile_url || null,
      role: data.role || 'user',
      status: data.status || 'active',
    });

    // 생성된 사용자 조회
    const user = await this.findById(id, trx);
    if (!user) {
      throw new Error('Failed to create user');
    }

    return user;
  }

  /**
   * ID로 사용자 조회
   *
   * @param id 사용자 ID
   * @param trx 트랜잭션 (선택적)
   * @returns 사용자 또는 null
   */
  async findById(id: number, trx?: Knex.Transaction): Promise<User | null> {
    const db = trx || this.knex;

    const entity = await db<UserEntity>(this.tableName).where({ id }).first();

    return entity ? User.fromEntity(entity) : null;
  }

  /**
   * 이메일로 사용자 조회
   *
   * @param email 이메일 주소
   * @param trx 트랜잭션 (선택적)
   * @returns 사용자 또는 null
   */
  async findByEmail(email: string, trx?: Knex.Transaction): Promise<User | null> {
    const db = trx || this.knex;

    const entity = await db<UserEntity>(this.tableName).where({ email }).first();

    return entity ? User.fromEntity(entity) : null;
  }

  /**
   * 닉네임으로 사용자 조회
   *
   * @param nickname 닉네임
   * @param trx 트랜잭션 (선택적)
   * @returns 사용자 또는 null
   */
  async findByNickname(nickname: string, trx?: Knex.Transaction): Promise<User | null> {
    const db = trx || this.knex;

    const entity = await db<UserEntity>(this.tableName).where({ nickname }).first();

    return entity ? User.fromEntity(entity) : null;
  }

  /**
   * 사용자 정보 수정
   *
   * @param id 사용자 ID
   * @param data 수정할 데이터
   * @param trx 트랜잭션 (선택적)
   * @returns 수정된 사용자 또는 null (존재하지 않는 경우)
   */
  async update(id: number, data: UpdateUserDTO, trx?: Knex.Transaction): Promise<User | null> {
    const db = trx || this.knex;

    // 수정할 데이터를 snake_case로 변환
    const updateData: Partial<UserEntity> = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.password !== undefined) updateData.password = data.password;
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.profile_url !== undefined) updateData.profile_url = data.profile_url;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;

    const affectedRows = await db<UserEntity>(this.tableName).where({ id }).update(updateData);

    if (affectedRows === 0) {
      return null;
    }

    return this.findById(id, trx);
  }

  /**
   * 사용자 삭제 (hard delete)
   *
   * @param id 사용자 ID
   * @param trx 트랜잭션 (선택적)
   * @returns 삭제 성공 여부
   */
  async delete(id: number, trx?: Knex.Transaction): Promise<boolean> {
    const db = trx || this.knex;

    const affectedRows = await db<UserEntity>(this.tableName).where({ id }).delete();

    return affectedRows > 0;
  }

  /**
   * 사용자 소프트 삭제 (상태를 'deleted'로 변경)
   *
   * @param id 사용자 ID
   * @param trx 트랜잭션 (선택적)
   * @returns 수정된 사용자 또는 null
   */
  async softDelete(id: number, trx?: Knex.Transaction): Promise<User | null> {
    return this.update(id, { status: 'deleted' }, trx);
  }

  /**
   * 이메일 중복 검사
   *
   * @param email 이메일 주소
   * @param excludeId 제외할 사용자 ID (수정 시 자신의 이메일 제외)
   * @param trx 트랜잭션 (선택적)
   * @returns 중복 여부
   */
  async existsByEmail(email: string, excludeId?: number, trx?: Knex.Transaction): Promise<boolean> {
    const db = trx || this.knex;

    let query = db<UserEntity>(this.tableName).where({ email });

    if (excludeId !== undefined) {
      query = query.whereNot({ id: excludeId });
    }

    const count = await this.getCount(query);
    return count > 0;
  }

  /**
   * 닉네임 중복 검사
   *
   * @param nickname 닉네임
   * @param excludeId 제외할 사용자 ID (수정 시 자신의 닉네임 제외)
   * @param trx 트랜잭션 (선택적)
   * @returns 중복 여부
   */
  async existsByNickname(
    nickname: string,
    excludeId?: number,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const db = trx || this.knex;

    let query = db<UserEntity>(this.tableName).where({ nickname });

    if (excludeId !== undefined) {
      query = query.whereNot({ id: excludeId });
    }

    const count = await this.getCount(query);
    return count > 0;
  }

  /**
   * 사용자 목록 조회 (필터링 지원)
   *
   * @param filter 필터 조건
   * @param trx 트랜잭션 (선택적)
   * @returns 사용자 목록
   */
  async findAll(filter?: UserFilter, trx?: Knex.Transaction): Promise<User[]> {
    const db = trx || this.knex;

    let query = db<UserEntity>(this.tableName).select('*');

    if (filter) {
      if (filter.role) {
        query = query.where({ role: filter.role });
      }
      if (filter.status) {
        query = query.where({ status: filter.status });
      }
      if (filter.email) {
        query = query.where({ email: filter.email });
      }
      if (filter.nickname) {
        query = query.where({ nickname: filter.nickname });
      }
    }

    const entities = await query;

    return entities.map(entity => User.fromEntity(entity));
  }

  /**
   * 전체 사용자 수 조회
   *
   * @param filter 필터 조건 (선택적)
   * @param trx 트랜잭션 (선택적)
   * @returns 사용자 수
   */
  async count(filter?: UserFilter, trx?: Knex.Transaction): Promise<number> {
    const db = trx || this.knex;

    let query = db<UserEntity>(this.tableName);

    if (filter) {
      if (filter.role) {
        query = query.where({ role: filter.role });
      }
      if (filter.status) {
        query = query.where({ status: filter.status });
      }
      if (filter.email) {
        query = query.where({ email: filter.email });
      }
      if (filter.nickname) {
        query = query.where({ nickname: filter.nickname });
      }
    }

    return this.getCount(query);
  }
}
