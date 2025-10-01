/**
 * UserRepository 단위 테스트
 *
 * SQLite in-memory 데이터베이스를 사용하여
 * 리포지토리의 모든 CRUD 작업을 테스트합니다.
 */

import { Knex } from 'knex';
import { UserRepository } from '../../../src/domains/users/repository';
import { CreateUserDTO, UpdateUserDTO } from '../../../src/domains/users/types';
import { createTestDatabase, resetDatabase, closeTestDatabase } from '../../__helpers/db';

describe('UserRepository', () => {
  let db: Knex;
  let userRepository: UserRepository;

  // 모든 테스트 전에 데이터베이스 초기화
  beforeAll(async () => {
    db = await createTestDatabase();
    await resetDatabase(db);
    userRepository = new UserRepository(db);
  });

  // 각 테스트 전에 데이터베이스 리셋
  beforeEach(async () => {
    await resetDatabase(db);
  });

  // 모든 테스트 후 데이터베이스 종료
  afterAll(async () => {
    await closeTestDatabase(db);
  });

  describe('create', () => {
    it('새로운 사용자를 생성해야 한다', async () => {
      // Given
      const createData: CreateUserDTO = {
        email: 'test@example.com',
        password: 'hashed_password_123',
        nickname: '테스트유저',
      };

      // When
      const user = await userRepository.create(createData);

      // Then
      expect(user).toBeDefined();
      expect(user.id).toBeGreaterThan(0);
      expect(user.email).toBe(createData.email);
      expect(user.nickname).toBe(createData.nickname);
      expect(user.role).toBe('user'); // 기본값
      expect(user.status).toBe('active'); // 기본값
      expect(user.profileUrl).toBeNull();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('profile_url을 포함한 사용자를 생성해야 한다', async () => {
      // Given
      const createData: CreateUserDTO = {
        email: 'test2@example.com',
        password: 'hashed_password_123',
        nickname: '테스트유저2',
        profile_url: 'https://example.com/profile.jpg',
      };

      // When
      const user = await userRepository.create(createData);

      // Then
      expect(user.profileUrl).toBe(createData.profile_url);
    });

    it('관리자 역할로 사용자를 생성해야 한다', async () => {
      // Given
      const createData: CreateUserDTO = {
        email: 'admin@example.com',
        password: 'hashed_password_123',
        nickname: '관리자',
        role: 'admin',
      };

      // When
      const user = await userRepository.create(createData);

      // Then
      expect(user.role).toBe('admin');
      expect(user.isAdmin()).toBe(true);
    });

    it('이메일 중복 시 에러를 발생시켜야 한다', async () => {
      // Given
      const createData: CreateUserDTO = {
        email: 'duplicate@example.com',
        password: 'hashed_password_123',
        nickname: '유저1',
      };

      await userRepository.create(createData);

      // When & Then
      const duplicateData: CreateUserDTO = {
        email: 'duplicate@example.com', // 동일한 이메일
        password: 'hashed_password_456',
        nickname: '유저2',
      };

      await expect(userRepository.create(duplicateData)).rejects.toThrow();
    });

    it('닉네임 중복 시 에러를 발생시켜야 한다', async () => {
      // Given
      const createData: CreateUserDTO = {
        email: 'user1@example.com',
        password: 'hashed_password_123',
        nickname: '중복닉네임',
      };

      await userRepository.create(createData);

      // When & Then
      const duplicateData: CreateUserDTO = {
        email: 'user2@example.com',
        password: 'hashed_password_456',
        nickname: '중복닉네임', // 동일한 닉네임
      };

      await expect(userRepository.create(duplicateData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('ID로 사용자를 조회해야 한다', async () => {
      // Given
      const createData: CreateUserDTO = {
        email: 'find@example.com',
        password: 'hashed_password_123',
        nickname: '찾을유저',
      };
      const createdUser = await userRepository.create(createData);

      // When
      const foundUser = await userRepository.findById(createdUser.id);

      // Then
      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(createdUser.email);
      expect(foundUser?.nickname).toBe(createdUser.nickname);
    });

    it('존재하지 않는 ID는 null을 반환해야 한다', async () => {
      // When
      const user = await userRepository.findById(99999);

      // Then
      expect(user).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('이메일로 사용자를 조회해야 한다', async () => {
      // Given
      const createData: CreateUserDTO = {
        email: 'email@example.com',
        password: 'hashed_password_123',
        nickname: '이메일유저',
      };
      await userRepository.create(createData);

      // When
      const user = await userRepository.findByEmail('email@example.com');

      // Then
      expect(user).toBeDefined();
      expect(user?.email).toBe(createData.email);
    });

    it('존재하지 않는 이메일은 null을 반환해야 한다', async () => {
      // When
      const user = await userRepository.findByEmail('notexist@example.com');

      // Then
      expect(user).toBeNull();
    });
  });

  describe('findByNickname', () => {
    it('닉네임으로 사용자를 조회해야 한다', async () => {
      // Given
      const createData: CreateUserDTO = {
        email: 'nick@example.com',
        password: 'hashed_password_123',
        nickname: '특별한닉네임',
      };
      await userRepository.create(createData);

      // When
      const user = await userRepository.findByNickname('특별한닉네임');

      // Then
      expect(user).toBeDefined();
      expect(user?.nickname).toBe(createData.nickname);
    });

    it('존재하지 않는 닉네임은 null을 반환해야 한다', async () => {
      // When
      const user = await userRepository.findByNickname('존재하지않음');

      // Then
      expect(user).toBeNull();
    });
  });

  describe('update', () => {
    it('사용자 닉네임을 수정해야 한다', async () => {
      // Given
      const createData: CreateUserDTO = {
        email: 'update@example.com',
        password: 'hashed_password_123',
        nickname: '원래닉네임',
      };
      const user = await userRepository.create(createData);

      // When
      const updateData: UpdateUserDTO = {
        nickname: '변경된닉네임',
      };
      const updatedUser = await userRepository.update(user.id, updateData);

      // Then
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.nickname).toBe('변경된닉네임');
      expect(updatedUser?.email).toBe(createData.email); // 다른 필드는 유지
    });

    it('사용자 프로필 URL을 수정해야 한다', async () => {
      // Given
      const user = await userRepository.create({
        email: 'profile@example.com',
        password: 'hashed_password_123',
        nickname: '프로필유저',
      });

      // When
      const updateData: UpdateUserDTO = {
        profile_url: 'https://example.com/new-profile.jpg',
      };
      const updatedUser = await userRepository.update(user.id, updateData);

      // Then
      expect(updatedUser?.profileUrl).toBe(updateData.profile_url);
    });

    it('사용자 상태를 변경해야 한다', async () => {
      // Given
      const user = await userRepository.create({
        email: 'status@example.com',
        password: 'hashed_password_123',
        nickname: '상태유저',
      });

      // When
      const updateData: UpdateUserDTO = {
        status: 'suspended',
      };
      const updatedUser = await userRepository.update(user.id, updateData);

      // Then
      expect(updatedUser?.status).toBe('suspended');
      expect(updatedUser?.isSuspended()).toBe(true);
    });

    it('여러 필드를 동시에 수정해야 한다', async () => {
      // Given
      const user = await userRepository.create({
        email: 'multi@example.com',
        password: 'hashed_password_123',
        nickname: '다중유저',
      });

      // When
      const updateData: UpdateUserDTO = {
        nickname: '새닉네임',
        profile_url: 'https://example.com/profile.jpg',
        status: 'suspended',
      };
      const updatedUser = await userRepository.update(user.id, updateData);

      // Then
      expect(updatedUser?.nickname).toBe('새닉네임');
      expect(updatedUser?.profileUrl).toBe('https://example.com/profile.jpg');
      expect(updatedUser?.status).toBe('suspended');
    });

    it('존재하지 않는 사용자 수정 시 null을 반환해야 한다', async () => {
      // When
      const result = await userRepository.update(99999, { nickname: '없음' });

      // Then
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('사용자를 삭제해야 한다', async () => {
      // Given
      const user = await userRepository.create({
        email: 'delete@example.com',
        password: 'hashed_password_123',
        nickname: '삭제될유저',
      });

      // When
      const result = await userRepository.delete(user.id);

      // Then
      expect(result).toBe(true);

      // 삭제 확인
      const deletedUser = await userRepository.findById(user.id);
      expect(deletedUser).toBeNull();
    });

    it('존재하지 않는 사용자 삭제 시 false를 반환해야 한다', async () => {
      // When
      const result = await userRepository.delete(99999);

      // Then
      expect(result).toBe(false);
    });
  });

  describe('softDelete', () => {
    it('사용자 상태를 deleted로 변경해야 한다', async () => {
      // Given
      const user = await userRepository.create({
        email: 'soft@example.com',
        password: 'hashed_password_123',
        nickname: '소프트삭제유저',
      });

      // When
      const result = await userRepository.softDelete(user.id);

      // Then
      expect(result).toBeDefined();
      expect(result?.status).toBe('deleted');
      expect(result?.isDeleted()).toBe(true);

      // 소프트 삭제된 사용자는 여전히 조회 가능
      const deletedUser = await userRepository.findById(user.id);
      expect(deletedUser).toBeDefined();
      expect(deletedUser?.status).toBe('deleted');
    });
  });

  describe('existsByEmail', () => {
    it('중복 이메일이 있으면 true를 반환해야 한다', async () => {
      // Given
      await userRepository.create({
        email: 'exists@example.com',
        password: 'hashed_password_123',
        nickname: '존재유저',
      });

      // When
      const exists = await userRepository.existsByEmail('exists@example.com');

      // Then
      expect(exists).toBe(true);
    });

    it('중복 이메일이 없으면 false를 반환해야 한다', async () => {
      // When
      const exists = await userRepository.existsByEmail('notexists@example.com');

      // Then
      expect(exists).toBe(false);
    });

    it('특정 사용자를 제외하고 중복 검사를 해야 한다', async () => {
      // Given
      const user = await userRepository.create({
        email: 'exclude@example.com',
        password: 'hashed_password_123',
        nickname: '제외유저',
      });

      // When - 자기 자신의 이메일은 제외
      const exists = await userRepository.existsByEmail('exclude@example.com', user.id);

      // Then
      expect(exists).toBe(false);
    });
  });

  describe('existsByNickname', () => {
    it('중복 닉네임이 있으면 true를 반환해야 한다', async () => {
      // Given
      await userRepository.create({
        email: 'nick1@example.com',
        password: 'hashed_password_123',
        nickname: '중복체크닉네임',
      });

      // When
      const exists = await userRepository.existsByNickname('중복체크닉네임');

      // Then
      expect(exists).toBe(true);
    });

    it('중복 닉네임이 없으면 false를 반환해야 한다', async () => {
      // When
      const exists = await userRepository.existsByNickname('없는닉네임');

      // Then
      expect(exists).toBe(false);
    });

    it('특정 사용자를 제외하고 중복 검사를 해야 한다', async () => {
      // Given
      const user = await userRepository.create({
        email: 'nick2@example.com',
        password: 'hashed_password_123',
        nickname: '자기닉네임',
      });

      // When - 자기 자신의 닉네임은 제외
      const exists = await userRepository.existsByNickname('자기닉네임', user.id);

      // Then
      expect(exists).toBe(false);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // 테스트 데이터 생성
      await userRepository.create({
        email: 'user1@example.com',
        password: 'hashed_password_123',
        nickname: '유저1',
        role: 'user',
        status: 'active',
      });

      await userRepository.create({
        email: 'admin@example.com',
        password: 'hashed_password_123',
        nickname: '관리자',
        role: 'admin',
        status: 'active',
      });

      await userRepository.create({
        email: 'suspended@example.com',
        password: 'hashed_password_123',
        nickname: '정지유저',
        role: 'user',
        status: 'suspended',
      });
    });

    it('모든 사용자를 조회해야 한다', async () => {
      // When
      const users = await userRepository.findAll();

      // Then
      expect(users).toHaveLength(3);
    });

    it('역할로 필터링하여 조회해야 한다', async () => {
      // When
      const admins = await userRepository.findAll({ role: 'admin' });

      // Then
      expect(admins).toHaveLength(1);
      expect(admins[0].role).toBe('admin');
    });

    it('상태로 필터링하여 조회해야 한다', async () => {
      // When
      const activeUsers = await userRepository.findAll({ status: 'active' });

      // Then
      expect(activeUsers).toHaveLength(2);
      activeUsers.forEach(user => {
        expect(user.status).toBe('active');
      });
    });

    it('여러 조건으로 필터링하여 조회해야 한다', async () => {
      // When
      const users = await userRepository.findAll({
        role: 'user',
        status: 'active',
      });

      // Then
      expect(users).toHaveLength(1);
      expect(users[0].role).toBe('user');
      expect(users[0].status).toBe('active');
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      // 테스트 데이터 생성
      await userRepository.create({
        email: 'count1@example.com',
        password: 'hashed_password_123',
        nickname: '카운트1',
        role: 'user',
      });

      await userRepository.create({
        email: 'count2@example.com',
        password: 'hashed_password_123',
        nickname: '카운트2',
        role: 'admin',
      });
    });

    it('전체 사용자 수를 반환해야 한다', async () => {
      // When
      const count = await userRepository.count();

      // Then
      expect(count).toBe(2);
    });

    it('필터링된 사용자 수를 반환해야 한다', async () => {
      // When
      const adminCount = await userRepository.count({ role: 'admin' });

      // Then
      expect(adminCount).toBe(1);
    });
  });

  describe('User 모델 메서드', () => {
    it('toJSON은 비밀번호를 제외해야 한다', async () => {
      // Given
      const user = await userRepository.create({
        email: 'json@example.com',
        password: 'hashed_password_123',
        nickname: 'JSON유저',
      });

      // When
      const json = user.toJSON();

      // Then
      expect(json).not.toHaveProperty('password');
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('email');
      expect(json).toHaveProperty('nickname');
      expect(json).toHaveProperty('role');
      expect(json).toHaveProperty('status');
    });

    it('getPassword는 비밀번호를 반환해야 한다', async () => {
      // Given
      const password = 'hashed_password_123';
      const user = await userRepository.create({
        email: 'pwd@example.com',
        password,
        nickname: '비밀번호유저',
      });

      // When
      const userPassword = user.getPassword();

      // Then
      expect(userPassword).toBe(password);
    });

    it('isAdmin은 관리자 여부를 반환해야 한다', async () => {
      // Given
      const admin = await userRepository.create({
        email: 'admin-check@example.com',
        password: 'hashed_password_123',
        nickname: '관리자체크',
        role: 'admin',
      });

      const normalUser = await userRepository.create({
        email: 'user-check@example.com',
        password: 'hashed_password_123',
        nickname: '일반유저체크',
      });

      // Then
      expect(admin.isAdmin()).toBe(true);
      expect(normalUser.isAdmin()).toBe(false);
    });

    it('isActive는 활성 상태를 반환해야 한다', async () => {
      // Given
      const activeUser = await userRepository.create({
        email: 'active@example.com',
        password: 'hashed_password_123',
        nickname: '활성유저',
      });

      const suspendedUser = await userRepository.create({
        email: 'suspended-check@example.com',
        password: 'hashed_password_123',
        nickname: '정지체크유저',
        status: 'suspended',
      });

      // Then
      expect(activeUser.isActive()).toBe(true);
      expect(suspendedUser.isActive()).toBe(false);
    });
  });
});
