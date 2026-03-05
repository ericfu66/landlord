import { getDb } from '@/lib/db'
import {
  getUnsummarizedMessages,
  markMessagesSummarized,
  saveGroupChatSummary
} from '@/lib/services/group-chat-service'
import { GroupChatMessage } from '@/types/group-chat'

function chunkMessages(messages: GroupChatMessage[], size: number): GroupChatMessage[][] {
  const chunks: GroupChatMessage[][] = []
  for (let i = 0; i < messages.length; i += size) {
    chunks.push(messages.slice(i, i + size))
  }
  return chunks
}

async function getNextSummaryIndex(saveId: number): Promise<number> {
  const db = await getDb()
  const result = db.exec(
    `SELECT COALESCE(MAX(summary_index), 0) FROM group_chat_summaries WHERE save_id = ${saveId}`
  )

  if (!result || result.length === 0 || result[0].values.length === 0) {
    return 1
  }

  const maxValue = result[0].values[0][0] as number
  return maxValue + 1
}

async function summarizeChunk(messages: GroupChatMessage[]): Promise<string> {
  const line = messages
    .map((item) => `${item.senderName}: ${item.content}`)
    .join(' | ')

  return `群聊摘要：${line}`
}

export async function restartGroupChatContext(
  saveId: number,
  keepRecentCount = 3
): Promise<{ created: number }> {
  const unsummarized = await getUnsummarizedMessages(saveId)
  if (unsummarized.length === 0) {
    return { created: 0 }
  }

  const safeKeep = Math.max(0, keepRecentCount)
  const cutoff = Math.max(0, unsummarized.length - safeKeep)
  const target = unsummarized.slice(0, cutoff)
  if (target.length === 0) {
    return { created: 0 }
  }

  const chunks = chunkMessages(target, 10)
  let summaryIndex = await getNextSummaryIndex(saveId)
  let created = 0

  for (const chunk of chunks) {
    const summaryContent = await summarizeChunk(chunk)
    const firstId = chunk[0]?.id ?? 0
    const lastId = chunk[chunk.length - 1]?.id ?? 0

    await saveGroupChatSummary({
      saveId,
      summaryIndex,
      messageRange: `${firstId}-${lastId}`,
      summaryContent
    })

    await markMessagesSummarized(chunk.map((item) => item.id ?? 0).filter((id) => id > 0))

    summaryIndex += 1
    created += 1
  }

  return { created }
}
