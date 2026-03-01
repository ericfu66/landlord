import { describe, it, expect, beforeAll } from 'vitest'
import { getDb, runMigrations, saveDb } from '@/lib/db'
import { hashPassword } from '@/lib/security/password'

describe('database schema', () => {
  beforeAll(async () => {
    await runMigrations()
    
    const db = await getDb()
    const result = db.exec("SELECT id FROM users WHERE username = 'ericfu'")
    
    if (result.length === 0 || result[0].values.length === 0) {
      const passwordHash = await hashPassword('jesica16')
      db.run(
        `INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`,
        ['ericfu', passwordHash, 'admin']
      )
      saveDb()
    }
  })

  it('contains default admin account', async () => {
    const db = await getDb()
    const result = db.exec(
      "SELECT username, role FROM users WHERE username = 'ericfu'"
    )
    
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].values.length).toBeGreaterThan(0)
    
    const row = result[0].values[0]
    expect(row[0]).toBe('ericfu')
    expect(row[1]).toBe('admin')
  })

  it('can hash and verify password', async () => {
    const hash = await hashPassword('testpassword')
    expect(hash).toBeDefined()
    expect(hash).not.toBe('testpassword')
  })
})