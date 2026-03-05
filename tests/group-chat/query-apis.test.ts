import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb, runMigrations, saveDb } from '@/lib/db'

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn()
}))

vi.mock('@/lib/auth/session', () => ({
  getSession: getSessionMock
}))

import { GET as getHistory } from '@/app/api/group-chat/history/route'
import { GET as getParticipants } from '@/app/api/group-chat/participants/route'

describe('group chat query apis', () => {
  beforeAll(async () => {
    await runMigrations()
  })

  beforeEach(async () => {
    getSessionMock.mockReset()
    getSessionMock.mockResolvedValue({ userId: 9902, username: 'gc_user_2', role: 'user' })

    const db = await getDb()
    db.run('DELETE FROM group_chat_messages WHERE save_id = 9902')
    db.run('DELETE FROM characters WHERE user_id = 9902')
    db.run('DELETE FROM users WHERE id = 9902')
    db.run("INSERT INTO users (id, username, password_hash) VALUES (9902, 'gc_user_2', 'hash')")
    db.run("INSERT INTO characters (name, user_id, template, mood) VALUES ('gc_participant_1', 9902, '{\"角色档案\":{\"基本信息\":{\"姓名\":\"gc_participant_1\"}}}', '平静')")
    db.run("INSERT INTO group_chat_messages (save_id, sender_type, sender_name, content, message_type) VALUES (9902, 'player', '房东', '测试历史', 'text')")
    saveDb()
  })

  it('returns paginated history with default limit 50', async () => {
    const req = new Request('http://localhost/api/group-chat/history')
    const res = await getHistory(req as never)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(Array.isArray(json.messages)).toBe(true)
    expect(json.messages.length).toBeGreaterThan(0)
  })

  it('returns participants for current user', async () => {
    const req = new Request('http://localhost/api/group-chat/participants')
    const res = await getParticipants(req as never)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(Array.isArray(json.participants)).toBe(true)
    expect(json.participants).toContain('gc_participant_1')
  })
})
