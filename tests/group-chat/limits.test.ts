import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb, runMigrations, saveDb } from '@/lib/db'

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn()
}))

vi.mock('@/lib/auth/session', () => ({
  getSession: getSessionMock
}))

import { POST } from '@/app/api/group-chat/send/route'
import { resetGroupChatCooldownForTest } from '@/lib/services/group-chat-rate-limit'

async function readStreamText(response: Response): Promise<string> {
  if (!response.body) {
    return ''
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let result = ''

  while (true) {
    const chunk = await reader.read()
    if (chunk.done) {
      break
    }
    if (chunk.value) {
      result += decoder.decode(chunk.value, { stream: true })
    }
  }

  return result
}

describe('group chat limits', () => {
  beforeAll(async () => {
    await runMigrations()
  })

  beforeEach(async () => {
    resetGroupChatCooldownForTest()
    getSessionMock.mockReset()
    getSessionMock.mockResolvedValue({ userId: 9910, username: 'gc_limit_user', role: 'user' })

    const db = await getDb()
    db.run('DELETE FROM group_chat_messages WHERE save_id = 9910')
    db.run('DELETE FROM characters WHERE user_id = 9910')
    db.run('DELETE FROM users WHERE id = 9910')
    db.run("INSERT INTO users (id, username, password_hash) VALUES (9910, 'gc_limit_user', 'hash')")

    for (let i = 0; i < 12; i += 1) {
      db.run(
        `INSERT INTO characters (name, user_id, template, mood)
         VALUES ('gc_limit_char_${i}', 9910, '{\"角色档案\":{\"基本信息\":{\"姓名\":\"gc_limit_char_${i}\"}}}', '平静')`
      )
    }

    saveDb()
  })

  it('enforces 3-second cooldown for same user', async () => {
    const first = await POST(
      new Request('http://localhost/api/group-chat/send', {
        method: 'POST',
        body: JSON.stringify({ content: 'first message' })
      }) as never
    )
    expect(first.status).toBe(200)

    const second = await POST(
      new Request('http://localhost/api/group-chat/send', {
        method: 'POST',
        body: JSON.stringify({ content: 'second message' })
      }) as never
    )
    expect(second.status).toBe(429)
  })

  it('caps triggered characters to at most 5', async () => {
    const mentionAll = Array.from({ length: 12 }, (_, i) => `gc_limit_char_${i}`)

    const response = await POST(
      new Request('http://localhost/api/group-chat/send', {
        method: 'POST',
        body: JSON.stringify({ content: 'ping', mentionedCharacters: mentionAll })
      }) as never
    )

    expect(response.status).toBe(200)
    const text = await readStreamText(response)
    const doneLine = text
      .split('\n')
      .find((line) => line.startsWith('data: {"ok":true'))

    expect(doneLine).toBeDefined()
    const payload = JSON.parse((doneLine as string).slice(6)) as { triggerCount: number }
    expect(payload.triggerCount).toBeLessThanOrEqual(5)
  })

  it('stores chain depth no greater than 3', async () => {
    const response = await POST(
      new Request('http://localhost/api/group-chat/send', {
        method: 'POST',
        body: JSON.stringify({ content: 'depth check', mentionedCharacters: ['gc_limit_char_1'] })
      }) as never
    )

    expect(response.status).toBe(200)
    await readStreamText(response)

    const db = await getDb()
    const maxDepth = db.exec('SELECT MAX(chain_depth) FROM group_chat_messages WHERE save_id = 9910')
    expect(Number(maxDepth[0].values[0][0])).toBeLessThanOrEqual(3)
  })
})
