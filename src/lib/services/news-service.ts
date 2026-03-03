import { getDb, saveDb } from '@/lib/db'
import { createChatCompletion } from '@/lib/ai/client'
import { incrementApiCalls } from '@/lib/auth/repo'

export interface DailyNews {
  id: number
  userId: number
  date: string
  title: string
  content: string
  worldNews: string[]
  tenantEvents: string[]
  weather: string
  isRead: boolean
  createdAt: string
}

// 辅助函数：转义 SQL 字符串
function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

/**
 * 获取用户某一天的新闻
 */
export async function getDailyNews(userId: number, date?: string): Promise<DailyNews | null> {
  const db = await getDb()
  
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  const result = db.exec(`
    SELECT id, user_id, date, title, content, world_news, tenant_events, weather, is_read, created_at
    FROM daily_news
    WHERE user_id = ${userId} AND date = '${targetDate}'
    ORDER BY created_at DESC
    LIMIT 1
  `)

  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return null
  }

  const row = result[0].values[0]
  return {
    id: row[0] as number,
    userId: row[1] as number,
    date: row[2] as string,
    title: row[3] as string,
    content: row[4] as string,
    worldNews: row[5] ? JSON.parse(row[5] as string) : [],
    tenantEvents: row[6] ? JSON.parse(row[6] as string) : [],
    weather: row[7] as string,
    isRead: row[8] === 1,
    createdAt: row[9] as string
  }
}

/**
 * 获取用户的所有新闻列表
 */
export async function getNewsList(userId: number, limit: number = 30): Promise<DailyNews[]> {
  const db = await getDb()
  
  const result = db.exec(`
    SELECT id, user_id, date, title, content, world_news, tenant_events, weather, is_read, created_at
    FROM daily_news
    WHERE user_id = ${userId}
    ORDER BY date DESC
    LIMIT ${limit}
  `)

  if (!result || result.length === 0 || !result[0].values) {
    return []
  }

  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    userId: row[1] as number,
    date: row[2] as string,
    title: row[3] as string,
    content: row[4] as string,
    worldNews: row[5] ? JSON.parse(row[5] as string) : [],
    tenantEvents: row[6] ? JSON.parse(row[6] as string) : [],
    weather: row[7] as string,
    isRead: row[8] === 1,
    createdAt: row[9] as string
  }))
}

/**
 * 标记新闻为已读
 */
export async function markNewsAsRead(newsId: number): Promise<void> {
  const db = await getDb()
  
  db.run(`
    UPDATE daily_news
    SET is_read = TRUE
    WHERE id = ${newsId}
  `)
  
  saveDb()
}

/**
 * 生成每日新闻
 */
export async function generateDailyNews(
  userId: number,
  apiConfig: { baseUrl: string; apiKey: string; model: string },
  weather: string,
  tenantNames: string[]
): Promise<DailyNews | null> {
  const db = await getDb()
  
  // 检查今天是否已生成新闻
  const today = new Date().toISOString().split('T')[0]
  const existingNews = await getDailyNews(userId, today)
  
  if (existingNews) {
    return existingNews
  }

  // 构建提示词
  const tenantContext = tenantNames.length > 0 
    ? `你的租客包括：${tenantNames.join('、')}`
    : '你目前还没有租客'

  const prompt = `请为一款房东模拟游戏生成一份每日新闻播报。

背景信息：
- 今天的天气是：${weather}
- ${tenantContext}

请生成一份包含以下内容的新闻：
1. 一个吸引人的标题
2. 3-5条世界大事（虚构的、有趣的、与日常生活相关的新闻）
3. 2-4条关于租客在外发生的事（根据租客情况虚构他们在工作或外出的经历）
4. 一段简短的总结性开场白

请以JSON格式返回：
{
  "title": "新闻标题",
  "opening": "开场白段落",
  "worldNews": ["新闻1", "新闻2", "新闻3"],
  "tenantEvents": ["租客事件1", "租客事件2"]
}`

  try {
    const response = await createChatCompletion(apiConfig, {
      messages: [
        { role: 'system', content: '你是一个创意新闻编写AI，专门为房东模拟游戏生成有趣的每日新闻。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8
    })

    await incrementApiCalls(userId)

    const content = response.choices[0]?.message?.content || ''
    
    // 解析JSON响应
    let newsData: {
      title: string
      opening: string
      worldNews: string[]
      tenantEvents: string[]
    }
    
    try {
      // 尝试直接解析
      newsData = JSON.parse(content)
    } catch {
      // 如果直接解析失败，尝试提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        newsData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('无法解析新闻数据')
      }
    }

    // 构建完整内容
    const fullContent = `${newsData.opening}

📰 世界大事：
${newsData.worldNews.map((news, i) => `${i + 1}. ${news}`).join('\n')}

🏠 租客动态：
${newsData.tenantEvents.map((event, i) => `${i + 1}. ${event}`).join('\n')}`

    // 保存到数据库
    const worldNewsJson = JSON.stringify(newsData.worldNews).replace(/'/g, "''")
    const tenantEventsJson = JSON.stringify(newsData.tenantEvents).replace(/'/g, "''")
    
    db.run(`
      INSERT INTO daily_news (user_id, date, title, content, world_news, tenant_events, weather)
      VALUES (${userId}, '${today}', '${escapeSql(newsData.title)}', '${escapeSql(fullContent)}', 
              '${worldNewsJson}', '${tenantEventsJson}', '${escapeSql(weather)}')
    `)
    
    saveDb()

    // 返回生成的新闻
    return getDailyNews(userId, today)
  } catch (error) {
    console.error('Generate daily news error:', error)
    return null
  }
}

/**
 * 检查用户是否有未读新闻
 */
export async function hasUnreadNews(userId: number): Promise<boolean> {
  const db = await getDb()
  
  const today = new Date().toISOString().split('T')[0]
  
  const result = db.exec(`
    SELECT COUNT(*) 
    FROM daily_news
    WHERE user_id = ${userId} AND date = '${today}' AND is_read = FALSE
  `)

  if (!result || result.length === 0 || !result[0].values) {
    return false
  }

  return (result[0].values[0][0] as number) > 0
}

/**
 * 删除旧新闻（保留最近30天）
 */
export async function cleanupOldNews(userId: number, daysToKeep: number = 30): Promise<void> {
  const db = await getDb()
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0]
  
  db.run(`
    DELETE FROM daily_news
    WHERE user_id = ${userId} AND date < '${cutoffDateStr}'
  `)
  
  saveDb()
}