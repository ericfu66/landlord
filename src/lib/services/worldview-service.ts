import { getDb, saveDb } from '@/lib/db'
import { WorldView, WorldViewTemplate } from '@/types/worldview'
import { createChatCompletion } from '@/lib/ai/client'

function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

export async function getUserWorldViews(userId: number): Promise<WorldView[]> {
  const db = await getDb()
  const result = db.exec(
    `SELECT id, user_id, name, description, content, is_ai_generated, created_at, updated_at 
     FROM worldviews WHERE user_id = ${userId} ORDER BY created_at DESC`
  )
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    userId: row[1] as number,
    name: row[2] as string,
    description: row[3] as string,
    content: row[4] as string,
    isAiGenerated: row[5] === 1,
    createdAt: row[6] as string,
    updatedAt: row[7] as string
  }))
}

export async function getWorldViewById(id: number, userId: number): Promise<WorldView | null> {
  const db = await getDb()
  const result = db.exec(
    `SELECT id, user_id, name, description, content, is_ai_generated, created_at, updated_at 
     FROM worldviews WHERE id = ${id} AND user_id = ${userId}`
  )
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return null
  }
  
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    userId: row[1] as number,
    name: row[2] as string,
    description: row[3] as string,
    content: row[4] as string,
    isAiGenerated: row[5] === 1,
    createdAt: row[6] as string,
    updatedAt: row[7] as string
  }
}

export async function createWorldView(
  userId: number,
  template: WorldViewTemplate,
  isAiGenerated: boolean = false
): Promise<WorldView> {
  const db = await getDb()
  
  const name = escapeSql(template.name)
  const description = escapeSql(template.description)
  const content = escapeSql(template.content)
  
  db.run(
    `INSERT INTO worldviews (user_id, name, description, content, is_ai_generated) 
     VALUES (${userId}, '${name}', '${description}', '${content}', ${isAiGenerated ? 1 : 0})`
  )
  
  saveDb()
  
  const result = db.exec(`SELECT id FROM worldviews WHERE user_id = ${userId} ORDER BY id DESC LIMIT 1`)
  const id = result[0].values[0][0] as number
  
  return {
    id,
    userId,
    name: template.name,
    description: template.description,
    content: template.content,
    isAiGenerated,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

export async function updateWorldView(
  id: number,
  userId: number,
  updates: Partial<WorldViewTemplate>
): Promise<WorldView | null> {
  const db = await getDb()
  
  const sets: string[] = []
  if (updates.name !== undefined) sets.push(`name = '${escapeSql(updates.name)}'`)
  if (updates.description !== undefined) sets.push(`description = '${escapeSql(updates.description)}'`)
  if (updates.content !== undefined) sets.push(`content = '${escapeSql(updates.content)}'`)
  sets.push(`updated_at = CURRENT_TIMESTAMP`)
  
  db.run(
    `UPDATE worldviews SET ${sets.join(', ')} WHERE id = ${id} AND user_id = ${userId}`
  )
  
  saveDb()
  
  return getWorldViewById(id, userId)
}

export async function deleteWorldView(id: number, userId: number): Promise<boolean> {
  const db = await getDb()
  
  // 检查是否有角色使用此世界观
  const charResult = db.exec(`SELECT COUNT(*) FROM characters WHERE worldview_id = ${id}`)
  const count = charResult[0].values[0][0] as number
  
  if (count > 0) {
    return false // 不能删除正在使用的世界观
  }
  
  db.run(`DELETE FROM worldviews WHERE id = ${id} AND user_id = ${userId}`)
  saveDb()
  
  return true
}

export async function generateWorldViewWithAI(
  userId: number,
  theme: string,
  apiConfig: any
): Promise<WorldView | null> {
  const prompt = `请基于主题"${theme}"生成一个详细的世界观设定。

要求：
1. 世界观名称（简洁有吸引力）
2. 世界观描述（100字以内）
3. 详细的世界观内容，包含以下要素：
   - 世界背景和历史
   - 地理环境和主要区域
   - 社会结构和文化习俗
   - 魔法/科技体系（如果适用）
   - 种族/势力分布
   - 独特规则和限制
   - 可用占位符：{{location}}, {{faction}}, {{era}}, {{protagonist_role}}

请以JSON格式返回：
{
  "name": "世界观名称",
  "description": "简短描述",
  "content": "详细世界观内容，可以使用{{占位符}}"
}`

  try {
    const response = await createChatCompletion(apiConfig, {
      messages: [{ role: 'user', content: prompt }]
    })
    
    const content = response.choices[0]?.message?.content || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) return null
    
    const data = JSON.parse(jsonMatch[0])
    
    return createWorldView(userId, {
      name: data.name,
      description: data.description,
      content: data.content
    }, true)
  } catch (error) {
    console.error('Generate worldview error:', error)
    return null
  }
}
