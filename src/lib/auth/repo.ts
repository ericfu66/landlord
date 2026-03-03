import { getDb, saveDb } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/security/password'

export interface User {
  id: number
  username: string
  role: string
  is_banned: boolean
  api_config: string | null
}

// 辅助函数：转义 SQL 字符串
function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

export async function getUserById(userId: number): Promise<User | null> {
  const db = await getDb()
  const result = db.exec(
    `SELECT id, username, role, is_banned, api_config FROM users WHERE id = ${userId}`
  )
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return null
  }
  
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    username: row[1] as string,
    role: row[2] as string,
    is_banned: row[3] === 1,
    api_config: row[4] as string | null
  }
}

export async function createUser(username: string, password: string): Promise<User | null> {
  const db = await getDb()
  
  const existing = db.exec(`SELECT id FROM users WHERE username = '${escapeSql(username)}'`)
  if (existing && existing.length > 0 && existing[0].values && existing[0].values.length > 0) {
    return null
  }
  
  const passwordHash = await hashPassword(password)
  
  db.run(`INSERT INTO users (username, password_hash, role) VALUES ('${escapeSql(username)}', '${escapeSql(passwordHash)}', 'user')`)
  
  saveDb()
  
  const result = db.exec(`SELECT id, username, role, is_banned, api_config FROM users WHERE username = '${escapeSql(username)}'`)
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return null
  }
  
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    username: row[1] as string,
    role: row[2] as string,
    is_banned: row[3] === 1,
    api_config: row[4] as string | null
  }
}

export async function authenticateUser(username: string, password: string): Promise<User | { error: string }> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT id, username, password_hash, role, is_banned, api_config FROM users WHERE username = '${escapeSql(username)}'`
  )
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return { error: '用户名或密码错误' }
  }
  
  const row = result[0].values[0]
  const user = {
    id: row[0] as number,
    username: row[1] as string,
    passwordHash: row[2] as string | null,
    role: row[3] as string,
    is_banned: row[4] === 1,
    api_config: row[5] as string | null
  }
  
  if (user.is_banned) {
    return { error: '账号已被封禁' }
  }
  
  // 检查是否为Discord用户（没有密码，只能通过Discord登录）
  if (!user.passwordHash) {
    return { error: '此账号只能通过Discord登录' }
  }
  
  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    return { error: '用户名或密码错误' }
  }
  
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    is_banned: user.is_banned,
    api_config: user.api_config
  }
}

export async function updateUserApiConfig(userId: number, config: { baseUrl: string; apiKey: string; model: string }): Promise<void> {
  const db = await getDb()
  const configJson = JSON.stringify(config).replace(/'/g, "''")
  db.run(`UPDATE users SET api_config = '${configJson}' WHERE id = ${userId}`)
  saveDb()
}

export async function incrementApiCalls(userId: number): Promise<void> {
  const db = await getDb()
  db.run(`UPDATE users SET api_calls_count = api_calls_count + 1 WHERE id = ${userId}`)
  saveDb()
}
