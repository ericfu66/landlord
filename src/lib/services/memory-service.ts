import { getDb, saveDb } from '@/lib/db'
import { createChatCompletion } from '@/lib/ai/client'
import { getCharactersByUser } from './recruit-service'
import { getCharacterDiaries } from './diary-service'

function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

export interface CharacterMemory {
  id: number
  characterName: string
  userId: number
  summary: string
  interactionDate: string
  createdAt: string
}

export interface EnhancedMemoryContext {
  selfSummary: string
  cohabitantsInfo: string
  recentDiaries: string
  relationshipWithUser: string
}

export async function getCharacterMemories(
  characterName: string,
  userId: number,
  limit: number = 10
): Promise<CharacterMemory[]> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT id, character_name, user_id, summary, interaction_date, created_at 
     FROM character_memories 
     WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId}
     ORDER BY interaction_date DESC
     LIMIT ${limit}`
  )
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    characterName: row[1] as string,
    userId: row[2] as number,
    summary: row[3] as string,
    interactionDate: row[4] as string,
    createdAt: row[5] as string
  }))
}

export async function saveMemorySummary(
  characterName: string,
  userId: number,
  summary: string,
  interactionDate: string
): Promise<CharacterMemory> {
  const db = await getDb()
  
  const summaryEscaped = escapeSql(summary)
  const dateEscaped = escapeSql(interactionDate)
  
  db.run(
    `INSERT INTO character_memories (character_name, user_id, summary, interaction_date) 
     VALUES ('${escapeSql(characterName)}', ${userId}, '${summaryEscaped}', '${dateEscaped}')`
  )
  
  saveDb()
  
  const result = db.exec(
    `SELECT id FROM character_memories WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId} ORDER BY id DESC LIMIT 1`
  )
  const id = result[0].values[0][0] as number
  
  return {
    id,
    characterName,
    userId,
    summary,
    interactionDate,
    createdAt: new Date().toISOString()
  }
}

export async function generateMemorySummary(
  characterName: string,
  userId: number,
  chatHistory: string,
  apiConfig: any
): Promise<string | null> {
  const prompt = `请总结以下对话内容，提取关键信息作为角色的记忆：

对话记录：
${chatHistory}

请总结：
1. 本次互动的核心内容
2. 用户的意图或需求
3. 角色的回应和态度
4. 任何重要的决定或承诺
5. 关系的变化

请用简洁的一段话（100字以内）总结。`

  try {
    const response = await createChatCompletion(apiConfig, {
      messages: [{ role: 'user', content: prompt }]
    })
    
    return response.choices[0]?.message?.content || null
  } catch (error) {
    console.error('Generate memory summary error:', error)
    return null
  }
}

export async function getEnhancedMemoryContext(
  characterName: string,
  userId: number
): Promise<EnhancedMemoryContext> {
  // 1. 获取自己的记忆摘要（最近5条）
  const memories = await getCharacterMemories(characterName, userId, 5)
  const selfSummary = memories.length > 0
    ? memories.map(m => `[${m.interactionDate}] ${m.summary}`).join('\n')
    : '暂无记忆'
  
  // 2. 获取同租者信息
  const allCharacters = await getCharactersByUser(userId)
  const currentChar = allCharacters.find(c => c.name === characterName)
  const cohabitants = allCharacters.filter(c => c.name !== characterName)
  
  const cohabitantsInfo = cohabitants.length > 0
    ? cohabitants.map(c => `- ${c.name}：${c.template.角色档案.基本信息.身份}，好感度${c.favorability}，当前心情${c.mood}`).join('\n')
    : '暂无同租者'
  
  // 3. 获取最近日记（从diary-service获取）
  const diaries = await getCharacterDiaries(characterName, userId, 5)
  const recentDiaries = diaries.length > 0
    ? diaries.map(d => `[${d.date}] 心情：${d.mood}\n${d.content}`).join('\n\n')
    : '暂无日记'
  
  // 4. 与user的关系
  const relationshipWithUser = currentChar
    ? `与房东的关系：${currentChar.template.角色档案.关系设定?.与用户的关系 || '未设定'}。相识过程：${currentChar.template.角色档案.关系设定?.相识过程 || '未设定'}。当前好感度：${currentChar.favorability}。`
    : '关系未知'
  
  return {
    selfSummary,
    cohabitantsInfo,
    recentDiaries,
    relationshipWithUser
  }
}

export async function autoSummarizeInteraction(
  characterName: string,
  userId: number,
  userInput: string,
  assistantReply: string,
  apiConfig: any
): Promise<void> {
  // 1. 获取本次聊天历史
  const chatHistory = `用户：${userInput}\n角色：${assistantReply}`
  
  // 2. 调用AI生成摘要（100字以内）
  const summary = await generateMemorySummary(characterName, userId, chatHistory, apiConfig)
  
  // 3. 保存到character_memories表
  if (summary) {
    const today = new Date().toISOString().split('T')[0]
    await saveMemorySummary(characterName, userId, summary, today)
  }
}
