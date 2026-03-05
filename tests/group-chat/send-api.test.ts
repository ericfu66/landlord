import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb, runMigrations, saveDb } from '@/lib/db'

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn()
}))

vi.mock('@/lib/auth/session', () => ({
  getSession: getSessionMock
}))

import { POST } from '@/app/api/group-chat/send/route'

describe('group chat send api', () => {
  beforeAll(async () => {
    await runMigrations()
  })

  beforeEach(async () => {
    getSessionMock.mockReset()
    const db = await getDb()
    db.run("DELETE FROM group_chat_messages WHERE save_id = 9901")
    db.run("DELETE FROM characters WHERE user_id = 9901")
    db.run("DELETE FROM users WHERE id = 9901")
    db.run("INSERT INTO users (id, username, password_hash) VALUES (9901, 'gc_user', 'hash')")
    db.run("INSERT INTO characters (name, user_id, template, mood) VALUES ('gc_char_1', 9901, '{\"角色档案\":{\"基本信息\":{\"姓名\":\"gc_char_1\"}}}', '平静')")
    db.run("INSERT INTO characters (name, user_id, template, mood) VALUES ('gc_char_2', 9901, '{\"角色档案\":{\"基本信息\":{\"姓名\":\"gc_char_2\"}}}', '平静')")
    saveDb()
  })

  it('returns 401 when user is not authenticated', async () => {
    getSessionMock.mockResolvedValue(null)
    const req = new Request('http://localhost/api/group-chat/send', {
      method: 'POST',
      body: JSON.stringify({ content: '今晚停水' })
    })

    const res = await POST(req as never)
    expect(res.status).toBe(401)
  })

  it('returns 400 when content is invalid', async () => {
    getSessionMock.mockResolvedValue({ userId: 9901, username: 'gc_user', role: 'user' })
    const req = new Request('http://localhost/api/group-chat/send', {
      method: 'POST',
      body: JSON.stringify({ content: 'a'.repeat(501) })
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })

  it('returns event stream when request is valid', async () => {
    getSessionMock.mockResolvedValue({ userId: 9901, username: 'gc_user', role: 'user' })
    const req = new Request('http://localhost/api/group-chat/send', {
      method: 'POST',
      body: JSON.stringify({ content: '今晚停水', mentionedCharacters: ['gc_char_1'] })
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
  })
})
