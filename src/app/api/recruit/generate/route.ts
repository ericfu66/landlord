import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { getDb } from '@/lib/db'
import { createChatCompletion } from '@/lib/ai/client'
import { CHARACTER_TEMPLATE_PROMPT, GENERATE_CHARACTER_TOOL } from '@/prompts/character-template'
import { normalizeCharacter } from '@/lib/services/recruit-service'
import { incrementApiCalls } from '@/lib/auth/repo'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = await getUserById(session.userId)
    if (!user || !user.api_config) {
      return NextResponse.json({ error: '请先配置AI API' }, { status: 400 })
    }

    const body = await request.json()
    const { characterType, traits, sourceDescription } = body

    if (!characterType || !traits) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const config = JSON.parse(user.api_config as string)

    const systemPrompt = CHARACTER_TEMPLATE_PROMPT
    const userPrompt = `请生成一个${characterType === 'modern' ? '现代' : '跨时空'}角色。

期望特征：${traits}
${sourceDescription ? `来源说明：${sourceDescription}` : ''}`

    const response = await createChatCompletion(config, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: [GENERATE_CHARACTER_TOOL],
      tool_choice: { type: 'function', function: { name: 'generate_character' } }
    })

    await incrementApiCalls(session.userId)

    const toolCall = response.choices[0]?.message?.tool_calls?.[0]
    if (!toolCall) {
      return NextResponse.json({ error: 'AI未返回角色数据' }, { status: 500 })
    }

    const characterData = JSON.parse(toolCall.function.arguments)
    const normalized = normalizeCharacter(characterData)

    if (!normalized) {
      return NextResponse.json({ error: '角色数据格式错误' }, { status: 500 })
    }

    return NextResponse.json({ character: normalized })
  } catch (error) {
    console.error('Generate character error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成角色失败' },
      { status: 500 }
    )
  }
}