import { getDb, saveDb } from '@/lib/db'
import { WorkshopItem, WorkshopItemType } from '@/types/workshop'
import { getCharactersByUser } from './recruit-service'

function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

export async function getPublicWorkshopItems(type?: WorkshopItemType): Promise<WorkshopItem[]> {
  const db = await getDb()
  
  let query = `
    SELECT w.id, w.type, w.user_id, w.original_id, w.name, w.description, 
           w.data, w.downloads, w.rating, w.is_public, w.created_at, u.username as author_name
    FROM workshop_items w
    JOIN users u ON w.user_id = u.id
    WHERE w.is_public = 1
  `
  
  if (type) {
    query += ` AND w.type = '${type}'`
  }
  
  query += ` ORDER BY w.downloads DESC, w.created_at DESC`
  
  const result = db.exec(query)
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    type: row[1] as WorkshopItemType,
    userId: row[2] as number,
    originalId: row[3] as string,
    name: row[4] as string,
    description: row[5] as string,
    data: row[6] as string,
    downloads: row[7] as number,
    rating: row[8] as number,
    isPublic: row[9] === 1,
    createdAt: row[10] as string,
    authorName: row[11] as string
  }))
}

export async function uploadToWorkshop(
  userId: number,
  type: WorkshopItemType,
  originalId: string,
  name: string,
  description: string,
  isPublic: boolean = true
): Promise<WorkshopItem | null> {
  const db = await getDb()
  
  // 获取原始数据
  let data: any = null
  
  if (type === 'character') {
    const chars = await getCharactersByUser(userId)
    const char = chars.find(c => c.name === originalId)
    if (!char) return null
    data = {
      template: char.template,
      portraitUrl: char.portraitUrl,
      rent: char.rent
    }
  } else if (type === 'worldview') {
    // 获取世界观数据
    const result = db.exec(
      `SELECT description, content, is_ai_generated FROM worldviews WHERE id = ${parseInt(originalId)} AND user_id = ${userId}`
    )
    
    if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
      return null
    }
    
    const row = result[0].values[0]
    data = {
      description: row[0] as string,
      content: row[1] as string,
      isAiGenerated: row[2] === 1
    }
  }
  
  if (!data) return null
  
  const nameEscaped = escapeSql(name)
  const descriptionEscaped = escapeSql(description)
  const dataJson = escapeSql(JSON.stringify(data))
  
  db.run(
    `INSERT INTO workshop_items (type, user_id, original_id, name, description, data, is_public) 
     VALUES ('${type}', ${userId}, '${escapeSql(originalId)}', '${nameEscaped}', '${descriptionEscaped}', '${dataJson}', ${isPublic ? 1 : 0})`
  )
  
  saveDb()
  
  const result = db.exec(`SELECT id FROM workshop_items WHERE user_id = ${userId} ORDER BY id DESC LIMIT 1`)
  const id = result[0].values[0][0] as number
  
  return {
    id,
    type,
    userId,
    originalId,
    name,
    description,
    data: JSON.stringify(data),
    downloads: 0,
    rating: 0,
    isPublic,
    createdAt: new Date().toISOString()
  }
}

export async function downloadFromWorkshop(
  itemId: number,
  userId: number
): Promise<{ success: boolean; item?: any; error?: string }> {
  const db = await getDb()
  
  // 获取工坊项目
  const result = db.exec(
    `SELECT type, data FROM workshop_items WHERE id = ${itemId}`
  )
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return { success: false, error: '项目不存在' }
  }
  
  const type = result[0].values[0][0] as WorkshopItemType
  const data = JSON.parse(result[0].values[0][1] as string)
  
  // 增加下载计数
  db.run(`UPDATE workshop_items SET downloads = downloads + 1 WHERE id = ${itemId}`)
  saveDb()
  
  return { success: true, item: { type, data } }
}

export async function getMyUploads(userId: number): Promise<WorkshopItem[]> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT id, type, user_id, original_id, name, description, 
            data, downloads, rating, is_public, created_at
     FROM workshop_items WHERE user_id = ${userId} ORDER BY created_at DESC`
  )
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    type: row[1] as WorkshopItemType,
    userId: row[2] as number,
    originalId: row[3] as string,
    name: row[4] as string,
    description: row[5] as string,
    data: row[6] as string,
    downloads: row[7] as number,
    rating: row[8] as number,
    isPublic: row[9] === 1,
    createdAt: row[10] as string
  }))
}

export async function deleteWorkshopItem(itemId: number, userId: number): Promise<boolean> {
  const db = await getDb()
  
  db.run(`DELETE FROM workshop_items WHERE id = ${itemId} AND user_id = ${userId}`)
  saveDb()
  
  return true
}
