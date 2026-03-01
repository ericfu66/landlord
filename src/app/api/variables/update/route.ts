import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/session'
import { getDb, saveDb } from '@/lib/db'
import { createChatCompletion } from '@/lib/ai/client'
import { pickLastThreeRounds, updateCharacterVariables, getChatMessagesForUpdate } from '@/lib/services/variables-service'
import { UPDATE_VARIABLES_TOOL } from '@/prompts/preset-defaults'
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
    const { characterName } = body

    if (!characterName) {
      return NextResponse.json({ error: '缺少角色名' }, { status: 400 })
    }

    const messages = await getChatMessagesForUpdate(characterName)
    if (messages.length === 0) {
      return NextResponse.json({ success: true, message: '无聊天记录需要更新' })
    }

    const lastMessages = pickLastThreeRounds(messages)
    
    const config = JSON.parse(user.api_config as string)
    
    const response = await createChatCompletion(config, {
      messages: [
        {
          role: 'system',
          content: '请根据最近的对话内容，分析角色的情感变化并更新变量。返回一个JSON格式的更新请求。'
        },
        {
          role: 'user',
          content: `最近对话：\n${lastMessages.map((m) => `${m.role}: ${m.content}`).join('\n')}\n\n请分析角色"${characterName}"的情感变化。`
        }
      ],
      tools: [UPDATE_VARIABLES_TOOL],
      tool_choice: { type: 'function', function: { name: 'update_variables' } }
    })

    await incrementApiCalls(session.userId)

    const toolCall = response.choices[0]?.message?.tool_calls?.[0]
    if (!toolCall) {
      return NextResponse.json({ success: true, message: '无需更新' })
    }

    const updates = JSON.parse(toolCall.function.arguments)
    
    await updateCharacterVariables(characterName, {
      characterName: updates.character_name || characterName,
      favorabilityDelta: updates.favorability_delta || 0,
      obedienceDelta: updates.obedience_delta || 0,
      corruptionDelta: updates.corruption_delta || 0,
      mood: updates.mood || '平静'
    })

    return NextResponse.json({
      success: true,
      updates: {
        favorability: updates.favorability_delta || 0,
        obedience: updates.obedience_delta || 0,
        corruption: updates.corruption_delta || 0,
        mood: updates.mood || '平静'
      }
    })
  } catch (error) {
    console.error('Variable update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '变量更新失败' },
      { status: 500 }
    )
  }
}