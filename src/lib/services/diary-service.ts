import { getDb, saveDb } from '@/lib/db'
import { DiaryEntry } from '@/types/diary'
import { createChatCompletion } from '@/lib/ai/client'
import { getCharactersByUser } from './recruit-service'
import { AIConfig } from '@/lib/ai/client'

function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

export async function getCharacterDiaries(
  characterName: string, 
  userId: number,
  limit: number = 10
): Promise<DiaryEntry[]> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT id, character_name, user_id, date, content, mood, is_peeked, created_at 
     FROM character_diaries 
     WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId}
     ORDER BY date DESC, created_at DESC
     LIMIT ${limit}`
  )
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    characterName: row[1] as string,
    userId: row[2] as number,
    date: row[3] as string,
    content: row[4] as string,
    mood: row[5] as string,
    isPeeked: row[6] === 1,
    createdAt: row[7] as string
  }))
}

export async function getDiaryByDate(
  characterName: string,
  userId: number,
  date: string
): Promise<DiaryEntry | null> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT id, character_name, user_id, date, content, mood, is_peeked, created_at 
     FROM character_diaries 
     WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId} AND date = '${escapeSql(date)}'
     LIMIT 1`
  )
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return null
  }
  
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    characterName: row[1] as string,
    userId: row[2] as number,
    date: row[3] as string,
    content: row[4] as string,
    mood: row[5] as string,
    isPeeked: row[6] === 1,
    createdAt: row[7] as string
  }
}

export async function createDiaryEntry(
  characterName: string,
  userId: number,
  content: string,
  mood: string,
  date: string,
  isPeeked: boolean = false
): Promise<DiaryEntry> {
  const db = await getDb()
  
  const contentEscaped = escapeSql(content)
  const moodEscaped = escapeSql(mood)
  const dateEscaped = escapeSql(date)
  
  db.run(
    `INSERT INTO character_diaries (character_name, user_id, date, content, mood, is_peeked) 
     VALUES ('${escapeSql(characterName)}', ${userId}, '${dateEscaped}', '${contentEscaped}', '${moodEscaped}', ${isPeeked ? 1 : 0})`
  )
  
  saveDb()
  
  const result = db.exec(
    `SELECT id FROM character_diaries WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId} ORDER BY id DESC LIMIT 1`
  )
  const id = result[0].values[0][0] as number
  
  return {
    id,
    characterName,
    userId,
    date,
    content,
    mood,
    isPeeked,
    createdAt: new Date().toISOString()
  }
}

export async function generateDiaryWithAI(
  characterName: string,
  userId: number,
  apiConfig: AIConfig,
  date: string,
  isPeeked: boolean = false
): Promise<DiaryEntry | null> {
  // 获取角色数据
  const characters = await getCharactersByUser(userId)
  const character = characters.find(c => c.name === characterName)
  if (!character) return null
  
  // 获取最近的聊天记录作为上下文
  const db = await getDb()
  const chatResult = db.exec(
    `SELECT content FROM chat_messages 
     WHERE character_name = '${escapeSql(characterName)}' 
     ORDER BY created_at DESC LIMIT 5`
  )
  
  const recentChats = chatResult && chatResult.length > 0 && chatResult[0].values
    ? chatResult[0].values.map((row: unknown[]) => row[0] as string).reverse()
    : []
  
  const prompt = `作为${character.template.角色档案.基本信息.姓名}，请写一篇${date}的日记。

角色设定：
${JSON.stringify(character.template, null, 2)}

当前状态：
- 好感度：${character.favorability}
- 顺从度：${character.obedience}
- 心情：${character.mood}

${recentChats.length > 0 ? `最近与房东的互动：\n${recentChats.join('\n')}` : '最近没有特别的互动。'}

${isPeeked ? '注意：这是被偷看的日记，角色并不知道房东会读到。请写得更加私密和真实，包含角色不想让别人知道的真实想法。' : '注意：这是向房东展示的日记。'}

请以第一人称写一篇日记，包含：
1. 当天的心情（用一个词或简短短语描述，如"开心"、"焦虑"、"平静"等）
2. 日记内容（200-400字，描述当天的感受、想法、对房东的看法等）

请以JSON格式返回：
{
  "mood": "心情词",
  "content": "日记内容"
}`

  try {
    const response = await createChatCompletion(apiConfig, {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8
    })
    
    const content = response.choices[0]?.message?.content || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) return null
    
    const data = JSON.parse(jsonMatch[0])
    
    return createDiaryEntry(characterName, userId, data.content, data.mood, date, isPeeked)
  } catch (error) {
    console.error('Generate diary error:', error)
    return null
  }
}

export async function deleteOldestDiaries(characterName: string, userId: number, keepCount: number = 5): Promise<void> {
  const db = await getDb()
  
  // 获取需要删除的日记ID
  const result = db.exec(
    `SELECT id FROM character_diaries 
     WHERE character_name = '${escapeSql(characterName)}' AND user_id = ${userId}
     ORDER BY created_at DESC`
  )
  
  if (!result || result.length === 0 || !result[0].values) {
    return
  }
  
  const allIds = result[0].values.map((row: unknown[]) => row[0] as number)
  
  if (allIds.length <= keepCount) {
    return
  }
  
  // 删除超出保留数量的旧日记
  const idsToDelete = allIds.slice(keepCount)
  if (idsToDelete.length > 0) {
    db.run(
      `DELETE FROM character_diaries WHERE id IN (${idsToDelete.join(',')})`
    )
    saveDb()
  }
}

// 获取最近5篇日记作为记忆内容
export async function getRecentDiariesAsMemory(
  characterName: string,
  userId: number
): Promise<string> {
  const diaries = await getCharacterDiaries(characterName, userId, 5)
  
  if (diaries.length === 0) {
    return '暂无日记记录'
  }
  
  return diaries.map(d => `[${d.date}] 心情：${d.mood}\n${d.content}`).join('\n\n')
}
