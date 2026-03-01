import { getDb, saveDb } from '@/lib/db'

export interface AdminUser {
  id: number
  username: string
  role: string
  isBanned: boolean
  apiCallsCount: number
  createdAt: string
}

export interface AdminStats {
  totalUsers: number
  totalApiCalls: number
  activeUsers: number
  bannedUsers: number
}

export async function getAllUsers(): Promise<AdminUser[]> {
  const db = await getDb()
  const result = db.exec(
    `SELECT id, username, role, is_banned, api_calls_count, created_at
     FROM users ORDER BY created_at DESC`
  )

  if (result.length === 0) {
    return []
  }

  return result[0].values.map((row) => ({
    id: row[0] as number,
    username: row[1] as string,
    role: row[2] as string,
    isBanned: row[3] === 1,
    apiCallsCount: row[4] as number,
    createdAt: row[5] as string
  }))
}

export async function banUser(userId: number): Promise<boolean> {
  const db = await getDb()
  
  const result = db.exec('SELECT role FROM users WHERE id = ?', [userId])
  if (result.length === 0 || result[0].values.length === 0) {
    return false
  }

  if (result[0].values[0][0] === 'admin') {
    return false
  }

  db.run('UPDATE users SET is_banned = 1 WHERE id = ?', [userId])
  saveDb()
  
  return true
}

export async function unbanUser(userId: number): Promise<boolean> {
  const db = await getDb()
  
  const result = db.exec('SELECT id FROM users WHERE id = ?', [userId])
  if (result.length === 0 || result[0].values.length === 0) {
    return false
  }

  db.run('UPDATE users SET is_banned = 0 WHERE id = ?', [userId])
  saveDb()
  
  return true
}

export async function getAdminStats(): Promise<AdminStats> {
  const db = await getDb()
  
  const totalUsersResult = db.exec('SELECT COUNT(*) FROM users')
  const totalUsers = totalUsersResult[0]?.values[0]?.[0] as number || 0
  
  const totalApiCallsResult = db.exec('SELECT SUM(api_calls_count) FROM users')
  const totalApiCalls = totalApiCallsResult[0]?.values[0]?.[0] as number || 0
  
  const activeUsersResult = db.exec('SELECT COUNT(*) FROM users WHERE is_banned = 0')
  const activeUsers = activeUsersResult[0]?.values[0]?.[0] as number || 0
  
  const bannedUsersResult = db.exec('SELECT COUNT(*) FROM users WHERE is_banned = 1')
  const bannedUsers = bannedUsersResult[0]?.values[0]?.[0] as number || 0

  return {
    totalUsers,
    totalApiCalls,
    activeUsers,
    bannedUsers
  }
}

export async function isAdmin(userId: number): Promise<boolean> {
  const db = await getDb()
  const result = db.exec('SELECT role FROM users WHERE id = ?', [userId])
  
  if (result.length === 0 || result[0].values.length === 0) {
    return false
  }
  
  return result[0].values[0][0] === 'admin'
}

export interface GlobalSettings {
  backgroundUrl: string
  bgmUrl: string
  fontCss: string
}

export async function getGlobalSettings(): Promise<GlobalSettings> {
  return {
    backgroundUrl: process.env.NEXT_PUBLIC_DEFAULT_BG_URL || '',
    bgmUrl: '',
    fontCss: ''
  }
}

export async function updateGlobalSettings(settings: Partial<GlobalSettings>): Promise<void> {
  console.log('Global settings updated:', settings)
}