import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('posts', table => {
    table.increments('id').primary();
    table.string('title', 255).notNullable();
    table.text('content').notNullable();
    table.integer('user_id').unsigned().notNullable();
    table.integer('category_id').unsigned().notNullable();
    table.integer('likes_count').unsigned().notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('category_id').references('id').inTable('categories').onDelete('RESTRICT');

    table.index(['user_id']);
    table.index(['category_id']);
    table.index(['created_at']);
    table.index(['title']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('posts');
}
