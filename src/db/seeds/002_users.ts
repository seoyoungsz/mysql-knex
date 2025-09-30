import { Knex } from 'knex';
import * as bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  await knex('users').del();

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
  const adminPassword = await bcrypt.hash('admin123!', saltRounds);

  await knex('users').insert([
    {
      id: 1,
      email: 'admin@community.local',
      password: adminPassword,
      nickname: '커뮤니티 관리자',
      role: 'admin',
      status: 'active',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ]);
}
