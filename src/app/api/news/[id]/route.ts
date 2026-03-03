import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDb } from '@/lib/db'

// 获取单条新闻详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const newsId = parseInt(params.id)
    if (isNaN(newsId)) {
      return NextResponse.json({ error: '无效的新闻ID' }, { status: 400 })
    }

    const db = await getDb()
    
    const result = db.exec(`
      SELECT id, user_id, date, title, content, world_news, tenant_events, weather, is_read, created_at
      FROM daily_news
      WHERE id = ${newsId} AND user_id = ${session.userId}
    `)

    if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
      return NextResponse.json({ error: '新闻不存在' }, { status: 404 })
    }

    const row = result[0].values[0]
    
    return NextResponse.json({
      news: {
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
    })
  } catch (error) {
    console.error('Get news detail error:', error)
    return NextResponse.json({ error: '获取新闻详情失败' }, { status: 500 })
  }
}