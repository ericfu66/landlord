import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { getDb, saveDb } from '@/lib/db'
import { createChatCompletion } from '@/lib/ai/client'
import { composeMessages, canUseFlirtMode, canUseDateMode, getPreset } from '@/lib/services/preset-service'
import { DEFAULT_PERSONA_PROMPT, UPDATE_VARIABLES_TOOL } from '@/prompts/preset-defaults'
import { incrementApiCalls } from '@/lib/auth/repo'
import { InteractionMode } from '@/types/preset'
import { deductEnergy } from '@/lib/services/economy-service'
import { getEnhancedMemoryContext, autoSummarizeInteraction } from '@/lib/services/memory-service'
import { getWorldViewById } from '@/lib/services/worldview-service'
import { resolveWorldViewPlaceholders } from '@/types/worldview'

// 转义 SQL 字符串
function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

async function getCharacterData(characterName: string) {
  const db = await getDb()
  const result = db.exec(
    `SELECT template, favorability, obedience, corruption, mood, worldview_id 
     FROM characters WHERE name = '${escapeSql(characterName)}'`
  )

  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return null
  }

  const row = result[0].values[0]
  return {
    template: JSON.parse(row[0] as string),
    favorability: row[1] as number,
    obedience: row[2] as number,
    corruption: row[3] as number,
    mood: row[4] as string,
    worldviewId: row[5] as number | undefined
  }
}

// 获取用户角色信息（房东角色）
async function getUserAvatarData(userId: number) {
  const db = await getDb()
  const result = db.exec(
    `SELECT avatar_name, avatar_age, avatar_appearance, avatar_personality, avatar_background 
     FROM users WHERE id = ${userId}`
  )

  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return null
  }

  const row = result[0].values[0]
  return {
    name: row[0] as string | null,
    age: row[1] as number | null,
    appearance: row[2] as string | null,
    personality: row[3] as string | null,
    background: row[4] as string | null
  }
}

async function getChatHistory(characterName: string, limit: number = 10): Promise<string> {
  const db = await getDb()
  const result = db.exec(
    `SELECT role, content FROM chat_messages 
     WHERE character_name = '${escapeSql(characterName)}' 
     ORDER BY created_at DESC LIMIT ${limit}`
  )

  if (!result || result.length === 0 || !result[0].values) {
    return ''
  }

  return result[0].values
    .map((row: unknown[]) => `${row[0] === 'user' ? '房东' : characterName}: ${row[1]}`)
    .reverse()
    .join('\n')
}

async function saveChatMessage(characterName: string, role: 'user' | 'assistant', content: string) {
  const db = await getDb()
  const contentJson = escapeSql(content)
  db.run(
    `INSERT INTO chat_messages (character_name, role, content) VALUES ('${escapeSql(characterName)}', '${role}', '${contentJson}')`
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

    if (mode === 'date' && !canUseDateMode(characterData.favorability)) {
      return NextResponse.json({ error: '好感度不足，无法使用约会模式（需要≥30）' }, { status: 400 })
    }

    if (mode === 'flirt' && !canUseFlirtMode(characterData.favorability)) {
      return NextResponse.json({ error: '好感度不足，无法使用调情模式（需要≥50）' }, { status: 400 })
    }

    // 检查并扣除体力
    const hasEnoughEnergy = await deductEnergy(session.userId, 1)
    if (!hasEnoughEnergy) {
      return NextResponse.json({ error: '体力不足！请等待体力恢复或推进到下一天' }, { status: 400 })
    }

    const config = JSON.parse(user.api_config as string)
    const history = await getChatHistory(characterName)
    const userPreset = await getPreset(session.userId, mode)

    // 获取增强记忆上下文（在composeMessages之前调用）
    const enhancedMemory = await getEnhancedMemoryContext(characterName, session.userId)

    // 如果角色有worldview_id，获取世界观内容
    let worldviewContent: string | undefined
    if (characterData.worldviewId) {
      const worldview = await getWorldViewById(characterData.worldviewId, session.userId)
      if (worldview) {
        // 占位符处理：使用角色模板中的值替换{{key}}
        const placeholders: Record<string, string> = {
          name: characterData.template.角色档案.基本信息.姓名,
          age: String(characterData.template.角色档案.基本信息.年龄),
          gender: characterData.template.角色档案.基本信息.性别,
          identity: characterData.template.角色档案.基本信息.身份
        }
        worldviewContent = resolveWorldViewPlaceholders(worldview.content, placeholders)
      }
    }

    // 获取用户角色信息并构建用户角色描述
    const userAvatar = await getUserAvatarData(session.userId)
    let userAvatarContent = ''
    if (userAvatar && userAvatar.name) {
      userAvatarContent = `
【你的房东信息】
你是房客${characterData.template.角色档案.基本信息.姓名}的房东。

房东基本信息：
- 姓名：${userAvatar.name}
- 年龄：${userAvatar.age || '未知'}岁
- 外貌：${userAvatar.appearance || '普通的外貌'}
- 性格：${userAvatar.personality || '普通的性格'}
${userAvatar.background ? `- 背景：${userAvatar.background}` : ''}

在与房客互动时，你应该根据这些信息来塑造自己作为房东的形象。`}
    
    // 构建增强的记忆内容
    const memoryContent = `好感度: ${characterData.favorability}, 顺从度: ${characterData.obedience}, 心情: ${characterData.mood}

【关于自己的记忆】
${enhancedMemory.selfSummary}

【同租者信息】
${enhancedMemory.cohabitantsInfo}

【最近的日记】
${enhancedMemory.recentDiaries}

【与房东的关系】
${enhancedMemory.relationshipWithUser}`

    const personaContent = `${DEFAULT_PERSONA_PROMPT}

【你的名字】
${characterData.template.角色档案.基本信息.姓名}

【你的身份】
${characterData.template.角色档案.基本信息.身份}

【你当前的状态】
- 好感度: ${characterData.favorability}
- 顺从度: ${characterData.obedience}  
- 心情: ${characterData.mood}

${userAvatarContent}

【完整角色设定】
${JSON.stringify(characterData.template, null, 2)}

【分支选项规则】
你需要根据对话上下文决定是否提供分支选项。
当对话处于关键节点或需要玩家做出选择时，请在回复末尾添加以下JSON格式的分支选项：
{"choices": ["选项1", "选项2", "选项3"]}

例如：
普通回复内容...
{"choices": ["继续深入了解她的过去", "换一个话题", "结束对话"]}

注意：
- 仅在关键时刻提供分支选项，不要每次都提供
- 选项应该是符合角色和情境的合理选择
- 选项数量建议2-4个`

    // 在composeMessages时传入worldviewContent
    const messages = composeMessages(
      {
        fixed: {
          persona: personaContent,
          memory: memoryContent,
          history: history || '暂无聊天记录'
        },
        custom: userPreset?.presetData?.entries || [],
        userInput
      },
      worldviewContent
    )

    const response = await createChatCompletion(config, {
      messages: messages.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      tools: [UPDATE_VARIABLES_TOOL]
    })

    await incrementApiCalls(session.userId)

    const assistantMessage = response.choices[0]?.message
    let reply = assistantMessage?.content || ''
    const toolCall = assistantMessage?.tool_calls?.[0]

    await saveChatMessage(characterName, 'user', userInput)
    await saveChatMessage(characterName, 'assistant', reply)

    // 在保存聊天消息后，自动总结本次互动
    await autoSummarizeInteraction(
      characterName,
      session.userId,
      userInput,
      reply,
      config
    )

    // Parse choices from reply
    let choices: string[] = []
    const choicesMatch = reply.match(/\{"choices":\s*\[(.*?)\]\}/)
    if (choicesMatch) {
      try {
        const parsed = JSON.parse(choicesMatch[0])
        choices = parsed.choices || []
        // Remove choices JSON from reply
        reply = reply.replace(choicesMatch[0], '').trim()
      } catch (e) {
        console.error('Parse choices error:', e)
      }
    }

    return NextResponse.json({
      reply,
      choices: choices.length > 0 ? choices : undefined,
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
