import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { restartGroupChatContext } from '@/lib/services/group-chat-summary-service'
import { getUserById } from '@/lib/auth/repo'

interface RestartBody {
  keepRecentCount?: number
}

function parseApiConfig(configText: string): { baseUrl: string; apiKey: string; model: string } | null {
  try {
    const parsed = JSON.parse(configText) as Record<string, unknown>
    const baseUrl = typeof parsed.baseUrl === 'string' ? parsed.baseUrl : ''
    const apiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey : ''
    const model = typeof parsed.model === 'string' ? parsed.model : ''

    if (!baseUrl || !apiKey || !model) {
      return null
    }

    return { baseUrl, apiKey, model }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = (await request.json()) as RestartBody
    const keepRecentCount = Number.isFinite(body.keepRecentCount)
      ? Math.max(0, body.keepRecentCount as number)
      : 3

    // 获取用户AI配置用于生成总结
    const user = await getUserById(session.userId)
    const aiConfig = user?.api_config 
      ? parseApiConfig(user.api_config) 
      : undefined

    const result = await restartGroupChatContext(session.userId, keepRecentCount, aiConfig || undefined)

    return NextResponse.json({ 
      ok: true, 
      created: result.created,
      cleared: result.cleared,
      message: result.created > 0 
        ? `已生成${result.created}条总结，上下文已清空` 
        : '没有需要总结的消息'
    })
  } catch (error) {
    console.error('Group chat restart error:', error)
    return NextResponse.json({ error: '重启对话失败' }, { status: 500 })
  }
}
