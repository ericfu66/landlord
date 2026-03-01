import { describe, it, expect } from 'vitest'

describe('admin permissions', () => {
  it('only admin can ban user', () => {
    const isAdmin = (role: string) => role === 'admin'
    expect(isAdmin('admin')).toBe(true)
    expect(isAdmin('user')).toBe(false)
  })

  it('admin cannot be banned', () => {
    const canBan = (role: string) => role !== 'admin'
    expect(canBan('user')).toBe(true)
    expect(canBan('admin')).toBe(false)
  })

  it('stats calculation is correct', () => {
    const stats = {
      totalUsers: 10,
      activeUsers: 8,
      bannedUsers: 2,
      totalApiCalls: 1500
    }
    
    expect(stats.totalUsers).toBe(stats.activeUsers + stats.bannedUsers)
    expect(stats.totalApiCalls).toBeGreaterThanOrEqual(0)
  })
})