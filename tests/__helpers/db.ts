import path from 'path';
import { knex, Knex } from 'knex';

const ROOT_PATH = path.resolve(__dirname, '..', '..');
const MIGRATIONS_DIR = path.join(ROOT_PATH, 'src', 'db', 'migrations');
const SEEDS_DIR = path.join(ROOT_PATH, 'src', 'db', 'seeds');

export async function createTestDatabase(): Promise<Knex> {
  const testDb = knex({
    client: 'sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
    migrations: {
      directory: MIGRATIONS_DIR,
      extension: 'ts',
      loadExtensions: ['.js', '.ts'],
    },
    seeds: {
      directory: SEEDS_DIR,
      extension: 'ts',
      loadExtensions: ['.js', '.ts'],
    },
    pool: {
      afterCreate: (conn: any, done: (err: Error | null, conn: any) => void) => {
        conn.run('PRAGMA foreign_keys = ON', (err: Error | null) => done(err, conn));
      },
    },
  });

  return testDb;
}

export async function resetDatabase(db: Knex): Promise<void> {
  await db.migrate.rollback(undefined, true);
  await db.migrate.latest();
}

export async function closeTestDatabase(db: Knex): Promise<void> {
  await db.destroy();
}
