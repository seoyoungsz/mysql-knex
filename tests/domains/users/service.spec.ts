/**
 * UserService 단위 테스트
 *
 * SQLite in-memory 데이터베이스를 사용하여
 * 서비스의 모든 비즈니스 로직을 테스트합니다.
 */

import { Knex } from 'knex';
import { UserService } from '../../../src/domains/users/service';
import { CreateUserInput, UpdateUserInput } from '../../../src/domains/users/types';
import { createTestDatabase, resetDatabase, closeTestDatabase } from '../../__helpers/db';

describe('UserService', () => {
  let db: Knex;
  let userService: UserService;

  // 모든 테스트 전에 데이터베이스 초기화
  beforeAll(async () => {
    db = await createTestDatabase();
    await resetDatabase(db);
    userService = new UserService(db);
  });

  // 각 테스트 전에 데이터베이스 리셋
  beforeEach(async () => {
    await resetDatabase(db);
  });

  // 모든 테스트 후 데이터베이스 종료
  afterAll(async () => {
    await closeTestDatabase(db);
  });

  describe('createUser', () => {
    it('새로운 사용자를 생성하고 비밀번호를 해싱해야 한다', async () => {
      // Given
      const input: CreateUserInput = {
        email: 'test@example.com',
        password: 'plainPassword123',
        nickname: '테스트유저',
      };

      // When
      const user = await userService.createUser(input);

      // Then
      expect(user).toBeDefined();
      expect(user.id).toBeGreaterThan(0);
      expect(user.email).toBe(input.email);
      expect(user.nickname).toBe(input.nickname);

      // 비밀번호가 해싱되었는지 확인
      expect(user.getPassword()).not.toBe(input.password);
      expect(user.getPassword()).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt 해시 패턴
    });

    it('프로필 URL을 포함한 사용자를 생성해야 한다', async () => {
      // Given
      const input: CreateUserInput = {
        email: 'test@example.com',
        password: 'plainPassword123',
        nickname: '테스트유저',
        profileUrl: 'https://example.com/profile.jpg',
      };

      // When
      const user = await userService.createUser(input);

      // Then
      expect(user.profileUrl).toBe(input.profileUrl);
    });

    it('이메일이 중복되면 에러를 던져야 한다', async () => {
      // Given
      const input: CreateUserInput = {
        email: 'duplicate@example.com',
        password: 'password123',
        nickname: '첫번째유저',
      };

      await userService.createUser(input);

      // When & Then
      const duplicateInput: CreateUserInput = {
        email: 'duplicate@example.com',
        password: 'password456',
        nickname: '두번째유저',
      };

      await expect(userService.createUser(duplicateInput)).rejects.toThrow('Email already exists');
    });

    it('닉네임이 중복되면 에러를 던져야 한다', async () => {
      // Given
      const input: CreateUserInput = {
        email: 'first@example.com',
        password: 'password123',
        nickname: '중복닉네임',
      };

      await userService.createUser(input);

      // When & Then
      const duplicateInput: CreateUserInput = {
        email: 'second@example.com',
        password: 'password456',
        nickname: '중복닉네임',
      };

      await expect(userService.createUser(duplicateInput)).rejects.toThrow(
        'Nickname already exists'
      );
    });
  });

  describe('getUserById', () => {
    it('ID로 사용자를 조회해야 한다', async () => {
      // Given
      const createdUser = await userService.createUser({
        email: 'test@example.com',
        password: 'password123',
        nickname: '테스트유저',
      });

      // When
      const user = await userService.getUserById(createdUser.id);

      // Then
      expect(user).toBeDefined();
      expect(user?.id).toBe(createdUser.id);
      expect(user?.email).toBe(createdUser.email);
    });

    it('존재하지 않는 ID로 조회하면 null을 반환해야 한다', async () => {
      // When
      const user = await userService.getUserById(999);

      // Then
      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('이메일로 사용자를 조회해야 한다', async () => {
      // Given
      const createdUser = await userService.createUser({
        email: 'test@example.com',
        password: 'password123',
        nickname: '테스트유저',
      });

      // When
      const user = await userService.getUserByEmail('test@example.com');

      // Then
      expect(user).toBeDefined();
      expect(user?.id).toBe(createdUser.id);
      expect(user?.email).toBe(createdUser.email);
    });

    it('존재하지 않는 이메일로 조회하면 null을 반환해야 한다', async () => {
      // When
      const user = await userService.getUserByEmail('notfound@example.com');

      // Then
      expect(user).toBeNull();
    });
  });

  describe('getUserProfile', () => {
    it('안전한 사용자 프로필을 반환해야 한다 (비밀번호 제외)', async () => {
      // Given
      const createdUser = await userService.createUser({
        email: 'test@example.com',
        password: 'password123',
        nickname: '테스트유저',
      });

      // When
      const profile = await userService.getUserProfile(createdUser.id);

      // Then
      expect(profile).toBeDefined();
      expect(profile.id).toBe(createdUser.id);
      expect(profile.email).toBe(createdUser.email);
      expect(profile.nickname).toBe(createdUser.nickname);

      // 비밀번호가 포함되지 않았는지 확인
      expect(profile).not.toHaveProperty('password');
    });

    it('존재하지 않는 사용자 프로필 조회 시 에러를 던져야 한다', async () => {
      // When & Then
      await expect(userService.getUserProfile(999)).rejects.toThrow('User not found');
    });
  });

  describe('updateUser', () => {
    it('사용자 정보를 수정해야 한다', async () => {
      // Given
      const createdUser = await userService.createUser({
        email: 'test@example.com',
        password: 'password123',
        nickname: '원래닉네임',
      });

      // When
      const updateInput: UpdateUserInput = {
        nickname: '변경된닉네임',
        profileUrl: 'https://example.com/new-profile.jpg',
      };

      const updatedUser = await userService.updateUser(createdUser.id, updateInput);

      // Then
      expect(updatedUser.nickname).toBe(updateInput.nickname);
      expect(updatedUser.profileUrl).toBe(updateInput.profileUrl);
      expect(updatedUser.email).toBe(createdUser.email); // 변경되지 않음
    });

    it('이메일을 변경할 수 있어야 한다', async () => {
      // Given
      const createdUser = await userService.createUser({
        email: 'old@example.com',
        password: 'password123',
        nickname: '테스트유저',
      });

      // When
      const updatedUser = await userService.updateUser(createdUser.id, {
        email: 'new@example.com',
      });

      // Then
      expect(updatedUser.email).toBe('new@example.com');
    });

    it('비밀번호를 변경하면 해싱되어야 한다', async () => {
      // Given
      const createdUser = await userService.createUser({
        email: 'test@example.com',
        password: 'oldPassword123',
        nickname: '테스트유저',
      });

      const oldPasswordHash = createdUser.getPassword();

      // When
      const updatedUser = await userService.updateUser(createdUser.id, {
        password: 'newPassword456',
      });

      // Then
      expect(updatedUser.getPassword()).not.toBe(oldPasswordHash);
      expect(updatedUser.getPassword()).not.toBe('newPassword456');
      expect(updatedUser.getPassword()).toMatch(/^\$2[aby]\$.{56}$/);
    });

    it('다른 사용자의 이메일로 변경하려고 하면 에러를 던져야 한다', async () => {
      // Given
      await userService.createUser({
        email: 'existing@example.com',
        password: 'password123',
        nickname: '기존유저',
      });

      const userToUpdate = await userService.createUser({
        email: 'test@example.com',
        password: 'password123',
        nickname: '테스트유저',
      });

      // When & Then
      await expect(
        userService.updateUser(userToUpdate.id, {
          email: 'existing@example.com',
        })
      ).rejects.toThrow('Email already exists');
    });

    it('다른 사용자의 닉네임으로 변경하려고 하면 에러를 던져야 한다', async () => {
      // Given
      await userService.createUser({
        email: 'existing@example.com',
        password: 'password123',
        nickname: '기존닉네임',
      });

      const userToUpdate = await userService.createUser({
        email: 'test@example.com',
        password: 'password123',
        nickname: '테스트닉네임',
      });

      // When & Then
      await expect(
        userService.updateUser(userToUpdate.id, {
          nickname: '기존닉네임',
        })
      ).rejects.toThrow('Nickname already exists');
    });

    it('자신의 이메일로 변경하는 것은 허용해야 한다', async () => {
      // Given
      const user = await userService.createUser({
        email: 'test@example.com',
        password: 'password123',
        nickname: '테스트유저',
      });

      // When
      const updatedUser = await userService.updateUser(user.id, {
        email: 'test@example.com', // 같은 이메일
        nickname: '새로운닉네임',
      });

      // Then
      expect(updatedUser.email).toBe('test@example.com');
      expect(updatedUser.nickname).toBe('새로운닉네임');
    });

    it('존재하지 않는 사용자 수정 시 에러를 던져야 한다', async () => {
      // When & Then
      await expect(
        userService.updateUser(999, {
          nickname: '새로운닉네임',
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('updatePassword', () => {
    it('비밀번호를 변경하고 해싱해야 한다', async () => {
      // Given
      const user = await userService.createUser({
        email: 'test@example.com',
        password: 'oldPassword123',
        nickname: '테스트유저',
      });

      const oldPasswordHash = user.getPassword();

      // When
      await userService.updatePassword(user.id, 'newPassword456');

      // Then
      const updatedUser = await userService.getUserById(user.id);
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.getPassword()).not.toBe(oldPasswordHash);
      expect(updatedUser!.getPassword()).not.toBe('newPassword456');
    });

    it('존재하지 않는 사용자의 비밀번호 변경 시 에러를 던져야 한다', async () => {
      // When & Then
      await expect(userService.updatePassword(999, 'newPassword123')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('comparePassword', () => {
    it('올바른 비밀번호를 검증해야 한다', async () => {
      // Given
      const plainPassword = 'mySecretPassword123';
      const user = await userService.createUser({
        email: 'test@example.com',
        password: plainPassword,
        nickname: '테스트유저',
      });

      // When
      const isMatch = await userService.comparePassword(plainPassword, user.getPassword());

      // Then
      expect(isMatch).toBe(true);
    });

    it('잘못된 비밀번호를 거부해야 한다', async () => {
      // Given
      const user = await userService.createUser({
        email: 'test@example.com',
        password: 'correctPassword123',
        nickname: '테스트유저',
      });

      // When
      const isMatch = await userService.comparePassword('wrongPassword456', user.getPassword());

      // Then
      expect(isMatch).toBe(false);
    });

    it('빈 비밀번호를 거부해야 한다', async () => {
      // Given
      const user = await userService.createUser({
        email: 'test@example.com',
        password: 'correctPassword123',
        nickname: '테스트유저',
      });

      // When
      const isMatch = await userService.comparePassword('', user.getPassword());

      // Then
      expect(isMatch).toBe(false);
    });
  });
});
