import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { getDb, saveDb } from '@/lib/db'
import { createChatCompletion } from '@/lib/ai/client'
import { composeMessages, canUseFlirtMode } from '@/lib/services/preset-service'
import { DEFAULT_PERSONA_PROMPT, UPDATE_VARIABLES_TOOL } from '@/prompts/preset-defaults'
import { incrementApiCalls } from '@/lib/auth/repo'
import { InteractionMode } from '@/types/preset'

async function getCharacterData(characterName: string) {
  const db = await getDb()
  const result = db.exec(
    `SELECT template, favorability, obedience, corruption, mood 
     FROM characters WHERE name = ?`,
    [characterName]
  )

  if (result.length === 0 || result[0].values.length === 0) {
    return null
  }

  const row = result[0].values[0]
  return {
    template: JSON.parse(row[0] as string),
    favorability: row[1] as number,
    obedience: row[2] as number,
    corruption: row[3] as number,
    mood: row[3] as string
  }
}

async function getChatHistory(characterName: string, limit: number = 10): Promise<string> {
  const db = await getDb()
  const result = db.exec(
    `SELECT role, content FROM chat_messages 
     WHERE character_name = ? 
     ORDER BY created_at DESC LIMIT ?`,
    [characterName, limit]
  )

  if (result.length === 0) {
    return ''
  }

  return result[0].values
    .map((row: unknown[]) => `${row[0] === 'user' ? '用户' : '角色'}: ${row[1]}`)
    .reverse()
    .join('\n')
}

async function saveChatMessage(characterName: string, role: 'user' | 'assistant', content: string) {
  const db = await getDb()
  db.run(
    'INSERT INTO chat_messages (character_name, role, content) VALUES (?, ?, ?)',
    [characterName, role, content]
  )
  saveDb()
}

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
    const { characterName, mode, userInput } = body as {
      characterName: string
      mode: InteractionMode
      userInput: string
    }

    if (!characterName || !userInput) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const characterData = await getCharacterData(characterName)
    if (!characterData) {
      return NextResponse.json({ error: '角色不存在' }, { status: 404 })
    }

    if (mode === 'flirt' && !canUseFlirtMode(characterData.favorability)) {
      return NextResponse.json({ error: '好感度不足，无法使用调情模式' }, { status: 400 })
    }

    const config = JSON.parse(user.api_config as string)
    const history = await getChatHistory(characterName)

    const personaContent = `${DEFAULT_PERSONA_PROMPT}

角色设定：
${JSON.stringify(characterData.template, null, 2)}`

    const messages = composeMessages({
      fixed: {
        persona: personaContent,
        memory: `好感度: ${characterData.favorability}, 顺从度: ${characterData.obedience}, 心情: ${characterData.mood}`,
        history: history || '暂无聊天记录'
      },
      custom: [],
      userInput
    })

    const response = await createChatCompletion(config, {
      messages: messages.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      tools: [UPDATE_VARIABLES_TOOL]
    })

    await incrementApiCalls(session.userId)

    const assistantMessage = response.choices[0]?.message
    const reply = assistantMessage?.content || ''
    const toolCall = assistantMessage?.tool_calls?.[0]

    await saveChatMessage(characterName, 'user', userInput)
    await saveChatMessage(characterName, 'assistant', reply)

    return NextResponse.json({
      reply,
      toolCall: toolCall ? {
        name: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments)
      } : null
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '对话失败' },
      { status: 500 }
    )
  }
}