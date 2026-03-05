import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb, runMigrations, saveDb } from '@/lib/db'

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn()
}))

vi.mock('@/lib/auth/session', () => ({
  getSession: getSessionMock
}))

import { POST as restartPost } from '@/app/api/group-chat/restart/route'
import { GET as summariesGet, POST as summariesPost } from '@/app/api/group-chat/summaries/route'

describe('group chat restart api', () => {
  beforeAll(async () => {
    await runMigrations()
  })

  beforeEach(async () => {
    getSessionMock.mockReset()
    getSessionMock.mockResolvedValue({ userId: 9903, username: 'gc_user_3', role: 'user' })

    const db = await getDb()
    db.run('DELETE FROM group_chat_summaries WHERE save_id = 9903')
    db.run('DELETE FROM group_chat_messages WHERE save_id = 9903')
    db.run('DELETE FROM users WHERE id = 9903')
    db.run("INSERT INTO users (id, username, password_hash) VALUES (9903, 'gc_user_3', 'hash')")

    for (let i = 0; i < 12; i += 1) {
      db.run(
        `INSERT INTO group_chat_messages (save_id, sender_type, sender_name, content, message_type, is_summarized)
         VALUES (9903, 'player', '房东', 'message-${i}', 'text', 0)`
      )
    }

    saveDb()
  })

  it('creates summaries in chunks of 10 and marks messages summarized', async () => {
    const res = await restartPost(
      new Request('http://localhost/api/group-chat/restart', {
        method: 'POST',
        body: JSON.stringify({ keepRecentCount: 3 })
      }) as never
    )
    expect(res.status).toBe(200)

    const db = await getDb()
    const summaries = db.exec('SELECT id FROM group_chat_summaries WHERE save_id = 9903')
    expect(summaries[0].values.length).toBeGreaterThan(0)

    const remaining = db.exec('SELECT id FROM group_chat_messages WHERE save_id = 9903 AND is_summarized = 0')
    expect(remaining[0].values.length).toBe(3)
  })

  it('lists summaries and updates selection', async () => {
    await restartPost(
      new Request('http://localhost/api/group-chat/restart', {
        method: 'POST',
        body: JSON.stringify({ keepRecentCount: 0 })
      }) as never
    )

    const listRes = await summariesGet(new Request('http://localhost/api/group-chat/summaries') as never)
    expect(listRes.status).toBe(200)
    const listJson = await listRes.json()
    expect(Array.isArray(listJson.summaries)).toBe(true)

    const firstId = listJson.summaries[0]?.id as number
    const updateRes = await summariesPost(
      new Request('http://localhost/api/group-chat/summaries', {
        method: 'POST',
        body: JSON.stringify({ summaryIds: [firstId] })
      }) as never
    )
    expect(updateRes.status).toBe(200)
  })
})
