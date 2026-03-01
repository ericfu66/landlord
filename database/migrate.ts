import { getDb, runMigrations, saveDb } from '../src/lib/db'

async function migrate() {
  console.log('Running migrations...')
  await runMigrations()
  console.log('Migrations completed successfully.')
}

migrate().catch(console.error)