import { describe, it, expect, beforeAll } from 'vitest'
import { saveGroupChatMessage, getGroupChatHistory, getUnsummarizedMessages, saveGroupChatSummary, setSummarySelection } from '@/lib/services/group-chat-service'
import { getDb, runMigrations, saveDb } from '@/lib/db'

describe('group chat service', () => {
  beforeAll(async () => {
    await runMigrations()
  })

  it('saves and fetches messages by save_id desc', async () => {
    const db = await getDb()
    
    const existingUser = db.exec(`SELECT id FROM users WHERE id = 999`)
    if (!existingUser[0] || existingUser[0].values.length === 0) {
      db.run(`INSERT INTO users (id, username, password_hash) VALUES (999, 'test_save_user', 'hash')`)
      saveDb()
    }
    
    await saveGroupChatMessage({
      saveId: 999,
      senderType: 'player',
      senderName: '房东',
      content: '今晚停水',
      messageType: 'text'
    })
    
    const list = await getGroupChatHistory(999, 50, 0)
    expect(list.length).toBeGreaterThan(0)
    expect(list[0].content).toBe('今晚停水')
    expect(list[0].senderType).toBe('player')
  })

  it('fetches unsummarized messages', async () => {
    const db = await getDb()
    
    await saveGroupChatMessage({
      saveId: 999,
      senderType: 'character',
      senderName: '白领',
      content: '好的，我知道了',
      messageType: 'text'
    })
    
    const unsummarized = await getUnsummarizedMessages(999)
    expect(unsummarized.length).toBeGreaterThan(0)
    expect(unsummarized.every(m => !m.isSummarized)).toBe(true)
  })

  it('saves and fetches summaries', async () => {
    await saveGroupChatSummary({
      saveId: 999,
      summaryIndex: 1,
      messageRange: '1-10',
      summaryContent: '用户询问停水，白领回复已知'
    })
    
    const db = await getDb()
    const result = db.exec(`SELECT * FROM group_chat_summaries WHERE save_id = 999`)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].values.length).toBeGreaterThan(0)
  })

  it('sets summary selection', async () => {
    const db = await getDb()
    const summaryResult = db.exec(`SELECT id FROM group_chat_summaries WHERE save_id = 999 LIMIT 1`)
    const summaryId = summaryResult[0].values[0][0] as number
    
    await setSummarySelection(999, [summaryId])
    
    const result = db.exec(`SELECT selected FROM group_chat_summaries WHERE id = ${summaryId}`)
    expect(result[0].values[0][0]).toBe(1)
  })
})