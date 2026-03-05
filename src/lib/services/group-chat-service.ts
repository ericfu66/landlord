import { getDb, saveDb } from '@/lib/db'
import { GroupChatMessage, GroupChatSummary } from '@/types/group-chat'

function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

export interface SaveGroupChatMessageInput {
  saveId: number
  senderType: 'player' | 'character' | 'system'
  senderName: string
  content: string
  messageType: 'text' | 'transfer' | 'sticker' | 'summary'
  transferAmount?: number
  stickerUrl?: string
  stickerEmotion?: string
  replyToId?: number
  chainDepth?: number
}

export interface SaveGroupChatSummaryInput {
  saveId: number
  summaryIndex: number
  messageRange: string
  summaryContent: string
}

export async function saveGroupChatMessage(
  input: SaveGroupChatMessageInput
): Promise<GroupChatMessage> {
  const db = await getDb()
  
  const transferAmount = input.transferAmount ?? 'NULL'
  const stickerUrl = input.stickerUrl ? `'${escapeSql(input.stickerUrl)}'` : 'NULL'
  const stickerEmotion = input.stickerEmotion ? `'${escapeSql(input.stickerEmotion)}'` : 'NULL'
  const replyToId = input.replyToId ?? 'NULL'
  const chainDepth = input.chainDepth ?? 0
  
  db.run(
    `INSERT INTO group_chat_messages 
     (save_id, sender_type, sender_name, content, message_type, transfer_amount, sticker_url, sticker_emotion, reply_to_id, chain_depth, is_summarized)
     VALUES (${input.saveId}, '${escapeSql(input.senderType)}', '${escapeSql(input.senderName)}', 
             '${escapeSql(input.content)}', '${escapeSql(input.messageType)}', ${transferAmount}, 
             ${stickerUrl}, ${stickerEmotion}, ${replyToId}, ${chainDepth}, 0)`
  )
  
  saveDb()
  
  const result = db.exec(`SELECT last_insert_rowid()`)
  const id = result[0].values[0][0] as number
  
  return {
    id,
    saveId: input.saveId,
    senderType: input.senderType,
    senderName: input.senderName,
    content: input.content,
    messageType: input.messageType,
    transferAmount: input.transferAmount,
    stickerUrl: input.stickerUrl,
    stickerEmotion: input.stickerEmotion,
    replyToId: input.replyToId,
    chainDepth: input.chainDepth,
    isSummarized: false
  }
}

export async function getGroupChatHistory(
  saveId: number, 
  limit: number = 50, 
  offset: number = 0
): Promise<GroupChatMessage[]> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT id, save_id, sender_type, sender_name, content, message_type, 
            transfer_amount, sticker_url, sticker_emotion, reply_to_id, 
            chain_depth, is_summarized, created_at
     FROM group_chat_messages 
     WHERE save_id = ${saveId}
     ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`
  )
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    saveId: row[1] as number,
    senderType: row[2] as 'player' | 'character' | 'system',
    senderName: row[3] as string,
    content: row[4] as string,
    messageType: row[5] as 'text' | 'transfer' | 'sticker' | 'summary',
    transferAmount: row[6] as number | undefined,
    stickerUrl: row[7] as string | undefined,
    stickerEmotion: row[8] as string | undefined,
    replyToId: row[9] as number | undefined,
    chainDepth: row[10] as number,
    isSummarized: row[11] === 1,
    createdAt: row[12] as string
  }))
}

export async function getUnsummarizedMessages(
  saveId: number
): Promise<GroupChatMessage[]> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT id, save_id, sender_type, sender_name, content, message_type, 
            transfer_amount, sticker_url, sticker_emotion, reply_to_id, 
            chain_depth, is_summarized, created_at
     FROM group_chat_messages 
     WHERE save_id = ${saveId} AND is_summarized = 0
     ORDER BY created_at ASC`
  )
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    saveId: row[1] as number,
    senderType: row[2] as 'player' | 'character' | 'system',
    senderName: row[3] as string,
    content: row[4] as string,
    messageType: row[5] as 'text' | 'transfer' | 'sticker' | 'summary',
    transferAmount: row[6] as number | undefined,
    stickerUrl: row[7] as string | undefined,
    stickerEmotion: row[8] as string | undefined,
    replyToId: row[9] as number | undefined,
    chainDepth: row[10] as number,
    isSummarized: row[11] === 1,
    createdAt: row[12] as string
  }))
}

export async function saveGroupChatSummary(
  input: SaveGroupChatSummaryInput
): Promise<GroupChatSummary> {
  const db = await getDb()
  
  db.run(
    `INSERT INTO group_chat_summaries 
     (save_id, summary_index, message_range, summary_content, selected)
     VALUES (${input.saveId}, ${input.summaryIndex}, '${escapeSql(input.messageRange)}', 
             '${escapeSql(input.summaryContent)}', 1)`
  )
  
  saveDb()
  
  const result = db.exec(`SELECT last_insert_rowid()`)
  const id = result[0].values[0][0] as number
  
  return {
    id,
    saveId: input.saveId,
    summaryIndex: input.summaryIndex,
    messageRange: input.messageRange,
    summaryContent: input.summaryContent,
    selected: true
  }
}

export async function setSummarySelection(
  saveId: number, 
  summaryIds: number[]
): Promise<void> {
  const db = await getDb()
  
  db.run(`UPDATE group_chat_summaries SET selected = 0 WHERE save_id = ${saveId}`)
  
  if (summaryIds.length > 0) {
    const idsStr = summaryIds.join(',')
    db.run(`UPDATE group_chat_summaries SET selected = 1 WHERE save_id = ${saveId} AND id IN (${idsStr})`)
  }
  
  saveDb()
}

export async function getGroupChatSummaries(saveId: number): Promise<GroupChatSummary[]> {
  const db = await getDb()
  const result = db.exec(
    `SELECT id, save_id, summary_index, message_range, summary_content, selected, created_at
     FROM group_chat_summaries
     WHERE save_id = ${saveId}
     ORDER BY summary_index DESC, created_at DESC`
  )

  if (!result || result.length === 0 || !result[0].values) {
    return []
  }

  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    saveId: row[1] as number,
    summaryIndex: row[2] as number,
    messageRange: row[3] as string,
    summaryContent: row[4] as string,
    selected: row[5] === 1,
    createdAt: row[6] as string
  }))
}

export async function markMessagesSummarized(messageIds: number[]): Promise<void> {
  if (messageIds.length === 0) {
    return
  }

  const db = await getDb()
  const ids = messageIds.join(',')
  db.run(`UPDATE group_chat_messages SET is_summarized = 1 WHERE id IN (${ids})`)
  saveDb()
}
