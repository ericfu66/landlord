import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { 
  isRagMemoryEnabled, 
  setRagMemoryEnabled,
  getRagEmbeddingConfig,
  saveRagEmbeddingConfig
} from '@/lib/services/rag-memory-service'
import { EmbeddingConfig, testEmbeddingConnection } from '@/lib/ai/embedding-client'

// GET - Get RAG settings
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const enabled = await isRagMemoryEnabled(session.userId)
    const config = await getRagEmbeddingConfig(session.userId)

    // Mask API key for security
    const maskedConfig = config ? {
      baseUrl: config.baseUrl,
      model: config.model,
      apiKey: config.apiKey ? `${config.apiKey.slice(0, 8)}...${config.apiKey.slice(-4)}` : undefined
    } : null

    return NextResponse.json({
      enabled,
      config: maskedConfig
    })
  } catch (error) {
    console.error('[RAG] Get settings error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取设置失败' },
      { status: 500 }
    )
  }
}

// POST - Update RAG settings
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { enabled, config } = body

    // Update enabled status if provided
    if (typeof enabled === 'boolean') {
      await setRagMemoryEnabled(session.userId, enabled)
    }

    // Update config if provided
    if (config && typeof config === 'object') {
      const embeddingConfig: EmbeddingConfig = {
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model || 'BAAI/bge-m3'
      }

      // Validate config
      if (!embeddingConfig.baseUrl || !embeddingConfig.apiKey) {
        return NextResponse.json(
          { error: '请提供完整的 Embedding 配置（baseUrl 和 apiKey）' },
          { status: 400 }
        )
      }

      // Test connection
      const testResult = await testEmbeddingConnection(embeddingConfig)
      if (!testResult.success) {
        return NextResponse.json(
          { error: `Embedding API 连接失败: ${testResult.error}` },
          { status: 400 }
        )
      }

      await saveRagEmbeddingConfig(session.userId, embeddingConfig)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[RAG] Update settings error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新设置失败' },
      { status: 500 }
    )
  }
}
