import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { testEmbeddingConnection } from '@/lib/ai/embedding-client'
import { EmbeddingConfig } from '@/lib/ai/embedding-client'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { baseUrl, apiKey, model } = body

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { error: '请提供 baseUrl 和 apiKey' },
        { status: 400 }
      )
    }

    const config: EmbeddingConfig = {
      baseUrl,
      apiKey,
      model: model || 'BAAI/bge-m3'
    }

    const result = await testEmbeddingConnection(config)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[RAG] Test connection error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '测试连接失败' },
      { status: 500 }
    )
  }
}
