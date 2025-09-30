import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('tags', table => {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique();
    table.timestamps(true, true);

    table.index(['name']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('tags');
}
