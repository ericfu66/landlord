import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { testConnection } from '@/lib/ai/client'
import { getDb } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { baseUrl, apiKey } = body

    if (!baseUrl || !apiKey) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const normalizedUrl = baseUrl.replace(/\/$/, '')
    
    const result = await testConnection({
      baseUrl: normalizedUrl,
      apiKey,
      model: ''
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Test connection error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '连接测试失败' },
      { status: 500 }
    )
  }
}