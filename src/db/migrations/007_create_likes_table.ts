import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('likes', table => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.enum('target_type', ['post', 'comment']).notNullable();
    table.integer('target_id').unsigned().notNullable();
    table.timestamps(true, true);

    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    table.unique(['user_id', 'target_type', 'target_id']);
    table.index(['target_type', 'target_id']);
    table.index(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('likes');
}
