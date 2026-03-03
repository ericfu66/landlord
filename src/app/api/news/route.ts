import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDailyNews, getNewsList, markNewsAsRead } from '@/lib/services/news-service'

// 获取今日新闻或新闻列表
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const list = searchParams.get('list') === 'true'
    const limit = parseInt(searchParams.get('limit') || '30')

    if (list) {
      // 获取新闻列表
      const newsList = await getNewsList(session.userId, limit)
      return NextResponse.json({ news: newsList })
    } else {
      // 获取指定日期或今日的新闻
      const news = await getDailyNews(session.userId, date || undefined)
      return NextResponse.json({ news })
    }
  } catch (error) {
    console.error('Get daily news error:', error)
    return NextResponse.json({ error: '获取新闻失败' }, { status: 500 })
  }
}

// 标记新闻为已读
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { newsId } = body

    if (!newsId) {
      return NextResponse.json({ error: '缺少新闻ID' }, { status: 400 })
    }

    await markNewsAsRead(newsId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark news as read error:', error)
    return NextResponse.json({ error: '标记失败' }, { status: 500 })
  }
}