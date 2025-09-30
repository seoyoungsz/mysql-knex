import type { Knex } from 'knex';
import { createTestDatabase } from '../__helpers/db';

const DEFAULT_ADMIN_EMAIL = 'admin@community.local';
const EXPECTED_CATEGORIES = ['공지사항', '자유게시판', 'Q&A', '이벤트'];
const EXPECTED_TAGS = ['공지', '정보', '질문', '이벤트'];

describe('database seeds', () => {
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

  it('populates initial categories, tags, and admin user', async () => {
    await db.seed.run();

    const categories = await db('categories').select('name').orderBy('name');
    expect(categories.map((category) => category.name)).toEqual(
      expect.arrayContaining(EXPECTED_CATEGORIES)
    );

    const tags = await db('tags').select('name').orderBy('name');
    expect(tags.map((tag) => tag.name)).toEqual(expect.arrayContaining(EXPECTED_TAGS));

    const [admin] = await db('users').where({ email: DEFAULT_ADMIN_EMAIL }).select('*');
    expect(admin).toBeDefined();
    expect(admin.nickname).toBe('커뮤니티 관리자');
    expect(admin.role).toBe('admin');
    expect(admin.password).toMatch(/^\$2[aby]\$/);
  });

  it('is idempotent when executed multiple times', async () => {
    await db.seed.run();
    await db.seed.run();

    const [{ count: categoryCount }] = await db('categories').count({ count: '*' });
    const [{ count: tagCount }] = await db('tags').count({ count: '*' });
    const [{ count: userCount }] = await db('users').count({ count: '*' });

    expect(Number(categoryCount)).toBe(EXPECTED_CATEGORIES.length);
    expect(Number(tagCount)).toBe(EXPECTED_TAGS.length);
    expect(Number(userCount)).toBe(1);
  });
});
