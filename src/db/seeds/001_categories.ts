import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('categories').del();

  await knex('categories').insert([
    {
      id: 1,
      name: '공지사항',
      description: '중요한 공지사항을 위한 카테고리입니다.',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: 2,
      name: '자유게시판',
      description: '자유로운 주제의 게시글을 위한 카테고리입니다.',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: 3,
      name: 'Q&A',
      description: '질문과 답변을 위한 카테고리입니다.',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: 4,
      name: '이벤트',
      description: '이벤트 관련 게시글을 위한 카테고리입니다.',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ]);
}
