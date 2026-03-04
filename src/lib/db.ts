import initSqlJs from 'sql.js'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

let db: any = null
let dbPath: string
let SQL: any = null
let migrated = false

export async function getDb(): Promise<any> {
  if (db) {
    if (!migrated) {
      await autoMigrate(db)
      migrated = true
    }
    return db
  }

  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file: string) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file)
    })
  }

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

  await autoMigrate(db)
  migrated = true

  return db
}

async function autoMigrate(database: any): Promise<void> {
  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql')
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8')
    // Must use exec() for multi-statement SQL — run() only executes the first statement
    database.exec(schema)
  }

  // 处理SQLite不支持IF NOT EXISTS的ALTER TABLE
  const migrations = [
    // 角色表字段
    `ALTER TABLE characters ADD COLUMN worldview_id INTEGER`,
    `ALTER TABLE characters ADD COLUMN portrait_url TEXT`,
    // 用户表OAuth字段
    `ALTER TABLE users ADD COLUMN discord_id TEXT UNIQUE`,
    `ALTER TABLE users ADD COLUMN discord_username TEXT`,
    `ALTER TABLE users ADD COLUMN discord_avatar TEXT`,
    // 用户表角色信息字段
    `ALTER TABLE users ADD COLUMN avatar_name TEXT`,
    `ALTER TABLE users ADD COLUMN avatar_age INTEGER`,
    `ALTER TABLE users ADD COLUMN avatar_appearance TEXT`,
    `ALTER TABLE users ADD COLUMN avatar_personality TEXT`,
    `ALTER TABLE users ADD COLUMN avatar_background TEXT`,
    // 用户表onboarding字段
    `ALTER TABLE users ADD COLUMN needs_onboarding BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE users ADD COLUMN onboarding_step TEXT DEFAULT 'character'`,
  ]

  for (const migration of migrations) {
    try {
      database.exec(migration)
    } catch (e: any) {
      // 如果列已存在，忽略错误
      if (!e.message?.includes('duplicate column name')) {
        console.error('Migration error:', e)
      }
    }
  }

  // 数据迁移：为老用户设置needs_onboarding为FALSE
  // 管理员和已有avatar_name的用户不需要onboarding
  try {
    database.exec(`
      UPDATE users 
      SET needs_onboarding = FALSE,
          onboarding_step = 'complete'
      WHERE role = 'admin' 
         OR avatar_name IS NOT NULL
         OR (needs_onboarding = TRUE AND created_at < datetime('now', '-1 day'))
    `)
  } catch (e: any) {
    console.error('Data migration error:', e)
  }

  saveDb()
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

  database.exec(schema)
  saveDb()
}

export function generateId(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * 安全的SQL参数处理函数
 * 用于防止SQL注入攻击
 */

// 验证整数，返回安全的整数值或默认值
export function safeInt(value: unknown, defaultValue: number = 0): number {
  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue
  }
  return Math.floor(num)
}

// 验证并转义SQL字符串
export function safeSqlString(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).replace(/'/g, "''")
}

// 验证日期字符串格式 (YYYY-MM-DD)
export function safeDateString(value: unknown): string {
  if (typeof value !== 'string') {
    return new Date().toISOString().split('T')[0]
  }
  // 只允许数字和连字符
  const cleaned = value.replace(/[^0-9-]/g, '')
  // 验证格式
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return new Date().toISOString().split('T')[0]
  }
  return cleaned
}

// 验证表名/列名（只允许字母、数字、下划线）
export function safeIdentifier(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }
  const cleaned = value.replace(/[^a-zA-Z0-9_]/g, '')
  // 防止SQL关键字
  const reservedWords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TABLE', 'FROM', 'WHERE']
  if (reservedWords.includes(cleaned.toUpperCase())) {
    return ''
  }
  return cleaned
}