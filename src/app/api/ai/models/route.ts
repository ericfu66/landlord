import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { fetchModels } from '@/lib/ai/models'
import { getUserById } from '@/lib/auth/repo'
import { getDb, saveDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = await getUserById(session.userId)
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const db = await getDb()
    const result = db.exec(`SELECT api_config FROM users WHERE id = ${session.userId}`)

    if (!result || result.length === 0 || !result[0].values || !result[0].values[0][0]) {
      return NextResponse.json({ error: '请先配置API' }, { status: 400 })
    }

    const config = JSON.parse(result[0].values[0][0] as string)

    const models = await fetchModels(config.baseUrl, config.apiKey)

    return NextResponse.json({ models })
  } catch (error) {
    console.error('Fetch models error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取模型列表失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { baseUrl, apiKey, model, fetchOnly } = body

    if (!baseUrl || !apiKey) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const normalizedUrl = baseUrl.replace(/\/$/, '')

    if (fetchOnly) {
      const models = await fetchModels(normalizedUrl, apiKey)
      return NextResponse.json({ models })
    }

    const db = await getDb()
    db.run(
      'UPDATE users SET api_config = ? WHERE id = ?',
      [JSON.stringify({ baseUrl: normalizedUrl, apiKey, model }), session.userId]
    )
    saveDb()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save config error:', error)
    return NextResponse.json(
      { error: '保存配置失败' },
      { status: 500 }
    )
  }
}
