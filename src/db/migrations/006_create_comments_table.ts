import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('comments', table => {
    table.increments('id').primary();
    table.text('content').notNullable();
    table.integer('user_id').unsigned().notNullable();
    table.integer('post_id').unsigned().notNullable();
    table.integer('parent_id').unsigned().nullable();
    table.integer('likes_count').unsigned().notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('post_id').references('id').inTable('posts').onDelete('CASCADE');
    table.foreign('parent_id').references('id').inTable('comments').onDelete('CASCADE');

    table.index(['user_id']);
    table.index(['post_id']);
    table.index(['parent_id']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('comments');
}
