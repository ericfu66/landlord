import initSqlJs, { Database } from 'sql.js'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

let db: Database | null = null
let dbPath: string

export async function getDb(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs()
  
  dbPath = process.env.DATABASE_PATH || './data/landlord.db'
  const dbDir = path.dirname(dbPath)
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  return db
}

export function saveDb(): void {
  if (db && dbPath) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

export function closeDb(): void {
  if (db) {
    saveDb()
    db.close()
    db = null
  }
}

export async function runMigrations(): Promise<void> {
  const database = await getDb()
  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf-8')
  
  database.run(schema)
  saveDb()
}

export function generateId(): string {
  return crypto.randomBytes(16).toString('hex')
}