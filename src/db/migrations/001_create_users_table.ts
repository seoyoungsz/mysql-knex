import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', table => {
    table.increments('id').primary();
    table.string('email', 255).notNullable().unique();
    table.string('password', 255).notNullable();
    table.string('nickname', 50).notNullable().unique();
    table.string('profile_url', 500).nullable();
    table.enum('role', ['user', 'admin']).notNullable().defaultTo('user');
    table.enum('status', ['active', 'suspended', 'deleted']).notNullable().defaultTo('active');
    table.timestamps(true, true);

    table.index(['email']);
    table.index(['nickname']);
    table.index(['status']);
    table.index(['role']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('users');
}
