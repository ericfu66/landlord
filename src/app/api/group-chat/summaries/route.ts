import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getGroupChatSummaries, setSummarySelection } from '@/lib/services/group-chat-service'

interface SelectionBody {
  summaryIds?: number[]
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const summaries = await getGroupChatSummaries(session.userId)
    return NextResponse.json({ summaries })
  } catch (error) {
    console.error('Group chat summaries get error:', error)
    return NextResponse.json({ error: '获取总结失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = (await request.json()) as SelectionBody
    const summaryIds = Array.isArray(body.summaryIds)
      ? body.summaryIds.filter((item): item is number => Number.isFinite(item))
      : []

    await setSummarySelection(session.userId, summaryIds)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Group chat summaries update error:', error)
    return NextResponse.json({ error: '更新总结选择失败' }, { status: 500 })
  }
}
