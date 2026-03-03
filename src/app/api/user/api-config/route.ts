import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDb, saveDb } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { baseUrl, apiKey, model } = body

    // 验证
    if (!apiKey) {
      return NextResponse.json({ error: '请提供API Key' }, { status: 400 })
    }

    const configJson = JSON.stringify({
      baseUrl: baseUrl || 'https://api.openai.com/v1',
      apiKey,
      model: model || 'gpt-4'
    }).replace(/'/g, "''")

    const db = await getDb()
    
    // 更新用户API配置
    db.run(`
      UPDATE users 
      SET api_config = '${configJson}',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${session.userId}
    `)

    saveDb()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update API config error:', error)
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }
}