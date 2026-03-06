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
import { 
  isRagMemoryEnabled, 
  getRagEmbeddingConfig, 
  searchRagMemories, 
  addRagMemory,
  buildRagContext,
  DEFAULT_RAG_CONFIG
} from '@/lib/services/rag-memory-service'
import { getWorldViewById } from '@/lib/services/worldview-service'
import { resolveWorldViewPlaceholders } from '@/types/worldview'
import { generateSticker } from '@/lib/ai/image-client'
import { updateTaskProgress } from '@/lib/services/task-service'

// 转义 SQL 字符串
function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

async function getCharacterData(characterName: string) {
  const db = await getDb()
  const result = db.exec(
    `SELECT template, favorability, obedience, corruption, mood, worldview_id, room_id,
            special_var_name, special_var_value, special_var_stages
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
    worldviewId: row[5] as number | undefined,
    roomId: row[6] as number | undefined,
    specialVarName: row[7] as string | undefined,
    specialVarValue: row[8] as number | undefined,
    specialVarStages: row[9] ? JSON.parse(row[9] as string) : undefined
  }
}

async function getRoomData(roomId: number | undefined) {
  if (!roomId) return null
  
  const db = await getDb()
  const result = db.exec(
    `SELECT name, description, room_type FROM rooms WHERE id = ${roomId}`
  )

  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return null
  }

  const row = result[0].values[0]
  return {
    name: row[0] as string | undefined,
    description: row[1] as string | undefined,
    roomType: row[2] as string
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
    
    // 获取房间信息
    const roomData = await getRoomData(characterData.roomId)
    const roomInfo = roomData ? `
【你的房间】
房间名称：${roomData.name || '未命名房间'}
房间类型：${roomData.roomType === 'bedroom' ? '卧室' : roomData.roomType === 'kitchen' ? '厨房' : roomData.roomType === 'bathroom' ? '浴室' : roomData.roomType === 'functional' ? '功能房' : '普通房间'}
房间描述：${roomData.description || '这是一个普通的出租房间，有你日常生活所需的基本设施。'}
` : ''

    // 构建特殊变量信息
    let specialVarInfo = ''
    let currentStageInfo = ''
    if (characterData.specialVarName && characterData.specialVarValue !== undefined && characterData.specialVarStages) {
      const currentStage = characterData.specialVarStages.find((stage: {阶段范围: string}) => {
        const [min, max] = stage.阶段范围.split('-').map(Number)
        return characterData.specialVarValue! >= min && characterData.specialVarValue! <= max
      })
      specialVarInfo = `\n- ${characterData.specialVarName}: ${characterData.specialVarValue}`
      if (currentStage) {
        currentStageInfo = `

【当前特殊状态】
阶段：${currentStage.阶段名称}（${currentStage.阶段范围}）
表现：${currentStage.人格表现}`
      }
    }

    // 构建增强的记忆内容
    let memoryContent = `好感度: ${characterData.favorability}, 顺从度: ${characterData.obedience}, 心情: ${characterData.mood}${specialVarInfo}

【关于自己的记忆】
${enhancedMemory.selfSummary}

【同租者信息】
${enhancedMemory.cohabitantsInfo}

【最近的日记】
${enhancedMemory.recentDiaries}

【与房东的关系】
${enhancedMemory.relationshipWithUser}${currentStageInfo}`

    // RAG 记忆检索 - 仅在用户启用时
    let ragContext = ''
    const ragEnabled = await isRagMemoryEnabled(session.userId)
    if (ragEnabled) {
      const ragConfig = await getRagEmbeddingConfig(session.userId)
      if (ragConfig) {
        try {
          const ragResults = await searchRagMemories(
            characterName,
            session.userId,
            userInput,
            ragConfig,
            DEFAULT_RAG_CONFIG
          )
          ragContext = buildRagContext(ragResults, { includeSimilarity: false })
          // 将 RAG 上下文添加到记忆内容
          memoryContent += ragContext
        } catch (error) {
          console.error('[Chat] RAG memory retrieval failed:', error)
          // RAG 失败不影响主流程
        }
      }
    }

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
- 选项数量建议2-4个

【表情包规则】（仅日常模式可用）
当你想要表达强烈的情感时，可以发送表情包。如果你认为当前对话适合发送表情包，请在回复末尾添加以下JSON格式：
{"sticker": "emotion_keyword"}

可选的emotion_keyword：
- happy: 开心、高兴
- sad: 伤心、难过
- angry: 生气、愤怒
- surprised: 惊讶、震惊
- shy: 害羞、腼腆
- excited: 兴奋、激动
- love: 喜欢、爱意
- sleepy: 困倦、想睡
- confused: 困惑、迷茫
- cool: 酷、自信

例如：
普通回复内容...
{"sticker": "happy"}

注意：
- 仅在情绪明显且适合用表情包表达时发送
- 不要每条消息都发送表情包
- 表情包应该符合当前对话情境`

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

    // 保存到 RAG 记忆（异步，不阻塞响应）
    if (ragEnabled) {
      const ragConfig = await getRagEmbeddingConfig(session.userId)
      if (ragConfig) {
        // 构建记忆内容
        const memoryContent = `用户说：${userInput}\n你回复：${reply}`
        addRagMemory(
          characterName,
          session.userId,
          memoryContent,
          'interaction',
          ragConfig
        ).catch(error => {
          console.error('[Chat] Failed to save RAG memory:', error)
        })
      }
    }

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

    // Parse sticker from reply (only in daily mode)
    let stickerUrl: string | undefined
    let stickerEmotion: string | undefined
    if (mode === 'daily') {
      const stickerMatch = reply.match(/\{"sticker":\s*"(.*?)"\}/)
      if (stickerMatch) {
        try {
          const parsed = JSON.parse(stickerMatch[0])
          stickerEmotion = parsed.sticker
          // Remove sticker JSON from reply
          reply = reply.replace(stickerMatch[0], '').trim()
          
          // Generate sticker
          if (stickerEmotion) {
            const siliconflowApiKey = process.env.SILICONFLOW_API_KEY || 'sk-lxyuvnsjzjjyscdydksumgivayqihstnscshsfxngfqggntf'
            const basicInfo = characterData.template?.角色档案?.基本信息 || {}
            
            const stickerResult = await generateSticker(
              siliconflowApiKey,
              {
                name: basicInfo.姓名 || characterName,
                age: basicInfo.年龄 || 20,
                gender: basicInfo.性别 || '女',
                personality: characterData.template?.角色档案?.性格 || '',
                appearance: basicInfo.外貌 || ''
              },
              stickerEmotion
            )
            
            stickerUrl = stickerResult.images[0]?.url
          }
        } catch (e) {
          console.error('Generate sticker error:', e)
        }
      }
    }

    // 更新互动任务进度（不阻塞主流程）
    updateTaskProgress(session.userId, 'interact', body.characterName).catch(() => {})

    return NextResponse.json({
      reply,
      choices: choices.length > 0 ? choices : undefined,
      stickerUrl,
      stickerEmotion,
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
