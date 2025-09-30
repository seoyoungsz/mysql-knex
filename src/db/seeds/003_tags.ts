import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('tags').del();

  await knex('tags').insert([
    {
      id: 1,
      name: '공지',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: 2,
      name: '정보',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: 3,
      name: '질문',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: 4,
      name: '이벤트',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ]);
}
