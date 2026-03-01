import { describe, it, expect, beforeAll } from 'vitest'
import { getDb, runMigrations, saveDb } from '@/lib/db'
import { hashPassword } from '@/lib/security/password'
import { authenticateUser, createUser } from '@/lib/auth/repo'

describe('auth api', () => {
  beforeAll(async () => {
    await runMigrations()
  })

  it('rejects banned users at login', async () => {
    const db = await getDb()
    
    const passwordHash = await hashPassword('testpass123')
    db.run(
      "INSERT INTO users (username, password_hash, role, is_banned) VALUES (?, ?, ?, ?)",
      ['banned_user', passwordHash, 'user', 1]
    )
    saveDb()
    
    const result = await authenticateUser('banned_user', 'testpass123')
    
    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error).toBe('账号已被封禁')
    }
  })

  it('creates new user successfully', async () => {
    const user = await createUser('newuser', 'password123')
    
    expect(user).not.toBeNull()
    expect(user?.username).toBe('newuser')
    expect(user?.role).toBe('user')
    expect(user?.is_banned).toBe(false)
  })

  it('rejects duplicate username', async () => {
    await createUser('duplicateuser', 'password123')
    const user = await createUser('duplicateuser', 'password456')
    
    expect(user).toBeNull()
  })

  it('authenticates valid user', async () => {
    await createUser('validuser', 'correctpass')
    const result = await authenticateUser('validuser', 'correctpass')
    
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.username).toBe('validuser')
    }
  })

  it('rejects wrong password', async () => {
    await createUser('wrongpassuser', 'correctpass')
    const result = await authenticateUser('wrongpassuser', 'wrongpass')
    
    expect('error' in result).toBe(true)
  })
})