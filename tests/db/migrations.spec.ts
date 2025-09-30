import type { Knex } from 'knex';
import { createTestDatabase } from '../__helpers/db';

const DEFAULT_USER = {
  email: 'user@example.com',
  password: 'hashed-password',
  nickname: 'tester',
  role: 'user',
  profile_url: null as string | null,
};

async function insertUser(db: Knex, overrides: Partial<typeof DEFAULT_USER> = {}): Promise<number> {
  const [id] = await db('users').insert({
    ...DEFAULT_USER,
    email: overrides.email ?? DEFAULT_USER.email,
    password: overrides.password ?? DEFAULT_USER.password,
    nickname: overrides.nickname ?? DEFAULT_USER.nickname,
    role: overrides.role ?? DEFAULT_USER.role,
    profile_url: overrides.profile_url ?? null,
  });

  return typeof id === 'number' ? id : Number(id);
}

async function insertCategory(db: Knex, name = '공지사항'): Promise<number> {
  const [id] = await db('categories').insert({
    name,
    description: `${name} 카테고리`,
  });

  return typeof id === 'number' ? id : Number(id);
}

async function insertPost(
  db: Knex,
  overrides: Partial<{ userId: number; categoryId: number; title: string }> = {}
): Promise<number> {
  const [id] = await db('posts').insert({
    user_id: overrides.userId ?? 1,
    category_id: overrides.categoryId ?? 1,
    title: overrides.title ?? '테스트 게시글',
    content: '내용',
  });

  return typeof id === 'number' ? id : Number(id);
}

describe('database migrations', () => {
  let db: Knex;

  beforeAll(async () => {
    db = await createTestDatabase();
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await db.migrate.rollback(undefined, true);
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.migrate.rollback(undefined, true);
    await db.destroy();
  });

  it('creates users table with uniqueness constraints', async () => {
    await db('users').insert(DEFAULT_USER);

    await expect(
      db('users').insert({
        ...DEFAULT_USER,
        nickname: 'tester-2',
      })
    ).rejects.toThrow(/UNIQUE|unique/);

    await expect(
      db('users').insert({
        ...DEFAULT_USER,
        email: 'unique@example.com',
      })
    ).rejects.toThrow(/UNIQUE|unique/);

    const [user] = await db('users').select('*').limit(1);
    expect(user.role).toBe('user');
  });

  it('creates categories table with unique name constraint', async () => {
    await db('categories').insert({ name: '공지사항', description: '공지용 카테고리' });

    await expect(
      db('categories').insert({ name: '공지사항', description: '중복' })
    ).rejects.toThrow(/UNIQUE|unique/);
  });

  it('enforces foreign key relationship between posts, users, and categories', async () => {
    const userId = await insertUser(db);
    const categoryId = await insertCategory(db);

    const postId = await insertPost(db, { userId, categoryId, title: '첫 글' });
    expect(postId).toBeGreaterThan(0);

    await expect(
      insertPost(db, { userId: 999, categoryId, title: '잘못된 사용자' })
    ).rejects.toThrow(/FOREIGN KEY|foreign key/);

    await expect(
      insertPost(db, { userId, categoryId: 999, title: '잘못된 카테고리' })
    ).rejects.toThrow(/FOREIGN KEY|foreign key/);
  });

  it('supports comment hierarchy and cascades when post is deleted', async () => {
    const userId = await insertUser(db);
    const categoryId = await insertCategory(db);
    const postId = await insertPost(db, { userId, categoryId });

    const [commentId] = await db('comments').insert({
      post_id: postId,
      user_id: userId,
      content: '댓글입니다',
    });

    await db('comments').insert({
      post_id: postId,
      user_id: userId,
      parent_id: commentId,
      content: '대댓글입니다',
    });

    await db('posts').where({ id: postId }).del();

    const comments = await db('comments');
    expect(comments).toHaveLength(0);
  });

  it('enforces uniqueness on post_tags composite key and cascades with posts/tags', async () => {
    const userId = await insertUser(db);
    const categoryId = await insertCategory(db);
    const postId = await insertPost(db, { userId, categoryId });

    const [tagId] = await db('tags').insert({ name: '공지' });

    await db('post_tags').insert({ post_id: postId, tag_id: tagId });

    await expect(db('post_tags').insert({ post_id: postId, tag_id: tagId })).rejects.toThrow(
      /UNIQUE|unique|PRIMARY KEY/
    );

    await db('posts').where({ id: postId }).del();

    const postTags = await db('post_tags');
    expect(postTags).toHaveLength(0);
  });

  it('enforces unique likes per target and cascades on user deletion', async () => {
    const userId = await insertUser(db);
    const categoryId = await insertCategory(db);
    const postId = await insertPost(db, { userId, categoryId });

    await db('likes').insert({ user_id: userId, target_type: 'post', target_id: postId });

    await expect(
      db('likes').insert({ user_id: userId, target_type: 'post', target_id: postId })
    ).rejects.toThrow(/UNIQUE|unique/);

    await db('users').where({ id: userId }).del();

    const likes = await db('likes');
    expect(likes).toHaveLength(0);
  });
});
