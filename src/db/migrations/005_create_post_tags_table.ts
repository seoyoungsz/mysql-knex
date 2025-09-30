import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('post_tags', table => {
    table.integer('post_id').unsigned().notNullable();
    table.integer('tag_id').unsigned().notNullable();
    table.timestamps(true, true);

    table.primary(['post_id', 'tag_id']);
    table.foreign('post_id').references('id').inTable('posts').onDelete('CASCADE');
    table.foreign('tag_id').references('id').inTable('tags').onDelete('CASCADE');

    table.index(['post_id']);
    table.index(['tag_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('post_tags');
}
