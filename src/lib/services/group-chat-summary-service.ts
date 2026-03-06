import { getDb } from '@/lib/db'
import {
  getUnsummarizedMessages,
  markMessagesSummarized,
  saveGroupChatSummary
} from '@/lib/services/group-chat-service'
import { GroupChatMessage } from '@/types/group-chat'
import { createChatCompletion } from '@/lib/ai/client'

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

interface AIConfig {
  baseUrl: string
  apiKey: string
  model: string
}

/**
 * 使用AI生成群聊总结
 */
async function summarizeChunkWithAI(
  messages: GroupChatMessage[],
  aiConfig?: AIConfig
): Promise<string> {
  // 构建聊天记录文本
  const chatText = messages
    .map((item) => {
      const prefix = item.senderType === 'player' ? '房东' : item.senderName
      let content = item.content
      
      // 特殊消息类型的处理
      if (item.messageType === 'transfer' && item.transferAmount) {
        content = `[转账 ${item.transferAmount}金币] ${content}`
      } else if (item.messageType === 'sticker') {
        content = `[${item.stickerEmotion || '表情包'}]`
      }
      
      return `${prefix}: ${content}`
    })
    .join('\n')

  // 如果没有AI配置，使用简单总结
  if (!aiConfig) {
    const topics = messages
      .filter(m => m.senderType !== 'system')
      .slice(0, 3)
      .map(m => m.content.slice(0, 20))
      .join('、')
    return `群聊话题：${topics}...`
  }

  try {
    const aiResponse = await createChatCompletion(aiConfig, {
      messages: [
        {
          role: 'system',
          content: '你是一位群聊总结助手。请用2-3句话简要总结以下公寓群聊的主要内容，包括讨论的话题、角色的主要观点和情绪。总结要简洁明了。'
        },
        {
          role: 'user',
          content: `请总结以下群聊记录：\n\n${chatText}`
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    })

    const summary = aiResponse.choices[0]?.message?.content?.trim()
    if (summary) {
      return summary
    }
  } catch (error) {
    console.error('AI summary error:', error)
  }

  // AI失败时的fallback
  const participantNames = Array.from(new Set(
    messages
      .filter(m => m.senderType === 'character')
      .map(m => m.senderName)
  )).slice(0, 3)
  
  return `${participantNames.join('、')}等参与了讨论，话题涉及${messages[0]?.content.slice(0, 15) || '日常聊天'}...`
}

/**
 * 重启群聊上下文 - 将未总结的消息生成AI总结，保留最近的消息不标记
 */
export async function restartGroupChatContext(
  saveId: number,
  keepRecentCount = 3,
  aiConfig?: AIConfig
): Promise<{ created: number; cleared: boolean }> {
  const unsummarized = await getUnsummarizedMessages(saveId)
  if (unsummarized.length === 0) {
    return { created: 0, cleared: false }
  }

  const safeKeep = Math.max(0, keepRecentCount)
  const cutoff = Math.max(0, unsummarized.length - safeKeep)
  const target = unsummarized.slice(0, cutoff)
  
  // 保留的最近消息（不移除，只保留）
  const kept = unsummarized.slice(cutoff)
  
  if (target.length === 0) {
    return { created: 0, cleared: false }
  }

  const chunks = chunkMessages(target, 10)
  let summaryIndex = await getNextSummaryIndex(saveId)
  let created = 0

  for (const chunk of chunks) {
    const summaryContent = await summarizeChunkWithAI(chunk, aiConfig)
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

  // 注意：保留的最近消息(keepRecentCount条)不会被标记为已总结
  // 这样它们仍然会出现在历史记录中

  return { created, cleared: created > 0 }
}

/**
 * 获取用于AI上下文的总结文本
 */
export async function getSummaryContext(saveId: number): Promise<string> {
  const db = await getDb()
  const result = db.exec(
    `SELECT summary_content 
     FROM group_chat_summaries 
     WHERE save_id = ${saveId} AND selected = 1
     ORDER BY summary_index DESC
     LIMIT 5`
  )

  if (!result || result.length === 0 || !result[0].values) {
    return ''
  }

  const summaries = result[0].values.map((row: unknown[]) => row[0] as string)
  
  if (summaries.length === 0) {
    return ''
  }

  return `【历史话题摘要】\n${summaries.join('\n')}\n`
}
