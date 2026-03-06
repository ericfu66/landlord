import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb, runMigrations, saveDb } from '@/lib/db'
import { resetGroupChatCooldownForTest } from '@/lib/services/group-chat-rate-limit'

const { getSessionMock, createChatCompletionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  createChatCompletionMock: vi.fn(async () => ({
    choices: [{ message: { content: '这是AI回复' } }]
  }))
}))

vi.mock('@/lib/auth/session', () => ({
  getSession: getSessionMock
}))

vi.mock('@/lib/ai/client', () => ({
  createChatCompletion: createChatCompletionMock
}))

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

import { POST } from '@/app/api/group-chat/send/route'

describe('group chat send api', () => {
  beforeAll(async () => {
    await runMigrations()
  })

  beforeEach(async () => {
    resetGroupChatCooldownForTest()
    getSessionMock.mockReset()
    createChatCompletionMock.mockClear()
    const db = await getDb()
    db.run("DELETE FROM group_chat_messages WHERE save_id = 9901")
    db.run("DELETE FROM characters WHERE user_id = 9901")
    db.run("DELETE FROM users WHERE id = 9901")
    db.run("INSERT INTO users (id, username, password_hash, api_config) VALUES (9901, 'gc_user', 'hash', '{\"baseUrl\":\"https://api.test\",\"apiKey\":\"test-key\",\"model\":\"test-model\"}')")
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

  it('uses AI-generated reply instead of placeholder', async () => {
    getSessionMock.mockResolvedValue({ userId: 9901, username: 'gc_user', role: 'user' })
    const req = new Request('http://localhost/api/group-chat/send', {
      method: 'POST',
      body: JSON.stringify({ content: '今晚停水', mentionedCharacters: ['gc_char_1'] })
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    const text = await readStreamText(res)
    expect(text.includes('收到：今晚停水')).toBe(false)
    expect(text.includes('这是AI回复')).toBe(true)
  })
})
