import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createChatCompletion, parseToolCallArguments } from '@/lib/ai/client'
import { getUserById, incrementApiCalls } from '@/lib/auth/repo'
import { getCharactersByUser, Character } from '@/lib/services/recruit-service'
import { getGroupChatHistory, saveGroupChatMessage } from '@/lib/services/group-chat-service'
import { selectTriggeredCharacters, maybeAddRoastTrigger } from '@/lib/services/group-chat-orchestrator'
import { checkGroupChatCooldown } from '@/lib/services/group-chat-rate-limit'
import { transferCurrency } from '@/lib/services/transfer-service'
import { getSummaryContext } from '@/lib/services/group-chat-summary-service'
import { updateTaskProgress } from '@/lib/services/task-service'
import { generateSticker } from '@/lib/ai/image-client'
import { getDb } from '@/lib/db'

interface SendBody {
  content?: string
  mentionedCharacters?: string[]
}

const MAX_CONTENT_LENGTH = 500
const MAX_TRIGGERED_CHARACTERS = 5
const MAX_CHAIN_DEPTH = 3

function getRandomCount(): number {
  return Math.random() < 0.5 ? 1 : 2
}

function sanitizeMentioned(mentioned: unknown): string[] {
  if (!Array.isArray(mentioned)) {
    return []
  }

  return mentioned
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function logSendMetrics(payload: Record<string, unknown>) {
  console.info('[group-chat-send]', JSON.stringify(payload))
}

function buildGroupHistory(history: Array<{ senderName: string; content: string }>): string {
  if (history.length === 0) {
    return '暂无群聊历史'
  }

  const ordered = [...history].reverse()
  return ordered.map((item) => `${item.senderName}: ${item.content}`).join('\n')
}

function parseApiConfig(configText: string): { baseUrl: string; apiKey: string; model: string } | null {
  try {
    const parsed = JSON.parse(configText) as Record<string, unknown>
    const baseUrl = typeof parsed.baseUrl === 'string' ? parsed.baseUrl : ''
    const apiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey : ''
    const model = typeof parsed.model === 'string' ? parsed.model : ''

    if (!baseUrl || !apiKey || !model) {
      return null
    }

    return { baseUrl, apiKey, model }
  } catch {
    return null
  }
}

// 构建租客信息上下文 - 让每个人都知道其他租客
function buildCohabitantsContext(characters: Character[], currentName: string): string {
  const otherChars = characters.filter(c => c.name !== currentName)
  if (otherChars.length === 0) return ''

  const cohabitantsInfo = otherChars.map(char => {
    const template = char.template as unknown as Record<string, unknown> | undefined
    const 角色档案 = template?.角色档案 as Record<string, unknown> | undefined
    const 基本信息 = 角色档案?.基本信息 as Record<string, unknown> | undefined
    
    const name = (基本信息?.姓名 as string) || char.name
    const identity = (基本信息?.身份 as string) || '租客'
    const age = (基本信息?.年龄 as number) || '?'
    const tags = (基本信息?.标签 as string[]) || []
    
    return `- ${name}（${identity}，${age}岁）${tags.length > 0 ? `标签：${tags.join('、')}` : ''}`
  }).join('\n')

  return `\n【同租租客信息】\n${cohabitantsInfo}\n`
}

// 群聊工具定义
const GROUP_CHAT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'group_chat_transfer',
      description: '向房东转账游戏金币，用于表达感谢、赔偿或其他原因',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: '转账金额（正整数），范围 1-1000'
          },
          reason: {
            type: 'string',
            description: '转账原因'
          }
        },
        required: ['amount', 'reason']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_sticker',
      description: '发送表情包来表达情绪',
      parameters: {
        type: 'object',
        properties: {
          emotion: {
            type: 'string',
            description: '表情包表达的情绪，如：开心、生气、尴尬、无语、惊讶、害羞等'
          }
        },
        required: ['emotion']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'trigger_other_character',
      description: '请求让其他租客参与对话，吐槽或回应',
      parameters: {
        type: 'object',
        properties: {
          character_name: {
            type: 'string',
            description: '要触发的角色名称'
          },
          reason: {
            type: 'string',
            description: '触发原因'
          }
        },
        required: ['character_name', 'reason']
      }
    }
  }
]

async function getUserAvatarInfo(userId: number): Promise<string> {
  const db = await getDb()
  const result = db.exec(
    `SELECT avatar_name, avatar_age, avatar_appearance, avatar_personality, avatar_background
     FROM users WHERE id = ${userId}`
  )

  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return ''
  }

  const row = result[0].values[0]
  const name = row[0] as string | null
  if (!name) return ''

  const age = row[1] as number | null
  const appearance = row[2] as string | null
  const personality = row[3] as string | null
  const background = row[4] as string | null

  return `\n【房东信息】\n姓名：${name}${age ? `\n年龄：${age}岁` : ''}${appearance ? `\n外貌：${appearance}` : ''}${personality ? `\n性格：${personality}` : ''}${background ? `\n背景：${background}` : ''}\n`
}

// 生成角色回复
async function generateCharacterReply(
  character: Character,
  allCharacters: Character[],
  userAvatarInfo: string,
  content: string,
  history: Array<{ senderName: string; content: string }>,
  summaryContext: string | null,
  aiConfig: { baseUrl: string; apiKey: string; model: string },
  sessionUserId: number,
  context: {
    isMentioned: boolean
    mentionedNames: string[]
    isRoast: boolean
    previousReplies?: string[]
  }
): Promise<{ reply: string; toolCalls: Array<{ name: string; arguments: Record<string, unknown> }> }> {
  const characterName = character.name
  const roleProfile = character.template
    ? JSON.stringify(character.template)
    : `角色名：${characterName}`

  // 构建同租租客信息
  const cohabitantsInfo = buildCohabitantsContext(allCharacters, characterName)

  // 构建上下文提示
  let contextPrompt = ''
  if (context.isMentioned) {
    contextPrompt = `\n【重要】房东刚刚@了你（${characterName}），这是在直接对你说话，请优先回应房东。`
    if (context.mentionedNames.length > 1) {
      contextPrompt += `\n同时被@的还有：${context.mentionedNames.filter(n => n !== characterName).join('、')}`
    }
  } else if (context.isRoast) {
    contextPrompt = `\n【重要】房东在群里说话，同时@了：${context.mentionedNames.join('、')}。`
    contextPrompt += `\n你不是被@的对象，但你可以作为旁观者吐槽、评论或插话，用自己的风格幽默回应。`
    if (context.previousReplies && context.previousReplies.length > 0) {
      contextPrompt += `\n\n之前其他人的回复：\n${context.previousReplies.join('\n')}`
    }
  }

  type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你正在进行公寓群聊角色扮演。你必须始终以"${characterName}"的身份回复，不要代替其他角色发言。
${userAvatarInfo}
${cohabitantsInfo}
群聊规则：
1. 保持简短口语化，符合角色人设
2. 可以转账给房东（金额1-1000金币）表达感谢或赔偿
3. 可以发送表情包表达情绪
4. 如果觉得其他租客应该回应，可以触发他们
5. 回复要自然，像是真实群聊中的对话
6. 你认识群里的所有租客，了解他们的基本信息
${contextPrompt}`
    },
    {
      role: 'system',
      content: `角色档案：${roleProfile}`
    }
  ]

  // 注入已选总结上下文（如果有）
  if (summaryContext) {
    messages.push({
      role: 'system',
      content: summaryContext
    })
  }

  messages.push(
    {
      role: 'system',
      content: `最近群聊：\n${buildGroupHistory(history)}`
    },
    {
      role: 'user',
      content: context.isMentioned 
        ? `房东在群里说：${content}\n请以${characterName}身份直接回复房东。`
        : `房东在群里说：${content}\n请以${characterName}身份，作为旁观者吐槽或评论。`
    }
  )

  const aiResponse = await createChatCompletion(aiConfig, {
    messages,
    tools: GROUP_CHAT_TOOLS,
    tool_choice: 'auto'
  })

  const message = aiResponse.choices[0]?.message
  const reply = message?.content?.trim() || ''

  const toolCalls: Array<{ name: string; arguments: Record<string, unknown> }> = []
  if (message?.tool_calls && message.tool_calls.length > 0) {
    for (const toolCall of message.tool_calls) {
      if (toolCall.type === 'function') {
        toolCalls.push({
          name: toolCall.function.name,
          arguments: parseToolCallArguments(toolCall.function.arguments)
        })
      }
    }
  }

  await incrementApiCalls(sessionUserId)

  return { reply, toolCalls }
}

export async function POST(request: NextRequest) {
  const requestStartedAt = Date.now()
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = await getUserById(session.userId)
    if (!user?.api_config) {
      return NextResponse.json({ error: '请先在设置中配置AI API' }, { status: 400 })
    }

    const aiConfig = parseApiConfig(user.api_config)
    if (!aiConfig) {
      return NextResponse.json({ error: 'AI API配置不完整' }, { status: 400 })
    }

    const body = (await request.json()) as SendBody
    const content = body.content?.trim() ?? ''

    if (!content) {
      return NextResponse.json({ error: '消息不能为空' }, { status: 400 })
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: '消息长度不能超过500字' }, { status: 400 })
    }

    const cooldownRemaining = checkGroupChatCooldown(session.userId)
    if (cooldownRemaining > 0) {
      return NextResponse.json(
        { error: '发送过快，请稍后再试', retryAfterMs: cooldownRemaining },
        { status: 429 }
      )
    }

    const characters = await getCharactersByUser(session.userId)
    const characterMap = new Map(characters.map((item) => [item.name, item]))
    const allCharacterNames = characters.map((item) => item.name)
    const mentionedCharacters = sanitizeMentioned(body.mentionedCharacters)

    const userAvatarInfo = await getUserAvatarInfo(session.userId)

    // 基础触发角色选择（被@的角色）
    let selectedCharacters = selectTriggeredCharacters({
      allCharacters: allCharacterNames,
      mentionedCharacters,
      randomCount: getRandomCount()
    }).slice(0, MAX_TRIGGERED_CHARACTERS)

    // 吐槽机制：当使用@时，概率触发其他租客插话
    // 计算还能添加多少个吐槽角色（确保总数不超过限制）
    const remainingSlots = Math.max(0, MAX_TRIGGERED_CHARACTERS - selectedCharacters.length)
    const roastCount = Math.min(
      remainingSlots,
      Math.random() < 0.5 ? 1 : 2
    )
    
    const roastCharacters = maybeAddRoastTrigger({
      selectedCharacters,
      allCharacters: allCharacterNames,
      mentionedCharacters,
      probability: 0.35,
      roastCount
    }).filter(name => !selectedCharacters.includes(name)) // 只保留吐槽角色

    const chainDepth = Math.min(MAX_CHAIN_DEPTH, 1)
    const history = await getGroupChatHistory(session.userId, 20, 0)
    
    // 获取已选总结注入上下文
    const summaryContext = await getSummaryContext(session.userId)

    const playerMessage = await saveGroupChatMessage({
      saveId: session.userId,
      senderType: 'player',
      senderName: session.username,
      content,
      messageType: 'text',
      chainDepth: 0
    })

    // 更新群聊任务进度（不阻塞主流程）
    updateTaskProgress(session.userId, 'group_chat').catch(() => {})

    // SiliconFlow API Key for sticker generation
    const siliconflowApiKey = process.env.SILICONFLOW_API_KEY || ''

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const writeEvent = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        writeEvent('message', playerMessage)

        let toolSuccess = true
        const triggeredByTool: string[] = []
        const previousReplies: string[] = []

        // ===== 第一阶段：被@的角色先回复 =====
        for (const characterName of selectedCharacters) {
          const character = characterMap.get(characterName)
          if (!character) continue

          try {
            const { reply, toolCalls } = await generateCharacterReply(
              character,
              characters,
              userAvatarInfo,
              content,
              history,
              summaryContext,
              aiConfig,
              session.userId,
              {
                isMentioned: mentionedCharacters.includes(characterName),
                mentionedNames: mentionedCharacters,
                isRoast: false
              }
            )

            // 保存回复用于后续吐槽角色参考
            if (reply) {
              previousReplies.push(`${characterName}: ${reply}`)
            }

            // 不再使用硬编码回复，如果AI回复为空，跳过此角色
            if (!reply && toolCalls.length === 0) {
              continue
            }

            // 保存角色文本消息
            if (reply) {
              const generated = await saveGroupChatMessage({
                saveId: session.userId,
                senderType: 'character',
                senderName: characterName,
                content: reply,
                messageType: 'text',
                chainDepth
              })
              writeEvent('message', generated)
            }

            // 处理工具调用
            for (const toolCall of toolCalls) {
              try {
                if (toolCall.name === 'group_chat_transfer') {
                  const amount = Number(toolCall.arguments.amount)
                  const reason = String(toolCall.arguments.reason || '')

                  // 验证金额范围
                  if (amount >= 1 && amount <= 1000) {
                    // 执行转账（角色给房东转账）
                    const transferResult = await transferCurrency(
                      session.userId,
                      characterName,
                      'landlord',
                      amount,
                      reason
                    )

                    if (transferResult.success) {
                      const transferMsg = await saveGroupChatMessage({
                        saveId: session.userId,
                        senderType: 'character',
                        senderName: characterName,
                        content: `[转账] ${reason}`,
                        messageType: 'transfer',
                        transferAmount: amount,
                        chainDepth
                      })
                      writeEvent('message', transferMsg)
                    }
                  }
                } else if (toolCall.name === 'send_sticker') {
                  const emotion = String(toolCall.arguments.emotion || '开心')
                  let stickerUrl: string | undefined

                  // 尝试生成真实表情包图片
                  if (siliconflowApiKey && character) {
                    try {
                      // 安全地提取角色信息
                      const template = character.template as unknown as Record<string, unknown> | undefined
                      const 角色档案 = template?.角色档案 as Record<string, unknown> | undefined
                      const 基本信息 = 角色档案?.基本信息 as Record<string, unknown> | undefined
                      
                      const stickerResult = await generateSticker(
                        siliconflowApiKey,
                        {
                          name: (基本信息?.姓名 as string) || characterName,
                          age: (基本信息?.年龄 as number) || 20,
                          gender: (基本信息?.性别 as string) || '女',
                          personality: (角色档案?.性格 as string) || '',
                          appearance: (基本信息?.外貌 as string) || ''
                        },
                        emotion
                      )
                      stickerUrl = stickerResult.images[0]?.url
                    } catch (stickerError) {
                      console.error('Sticker generation error:', stickerError)
                      // 生成失败时使用占位符继续
                    }
                  }

                  const stickerMsg = await saveGroupChatMessage({
                    saveId: session.userId,
                    senderType: 'character',
                    senderName: characterName,
                    content: `[${emotion}表情包]`,
                    messageType: 'sticker',
                    stickerEmotion: emotion,
                    stickerUrl,
                    chainDepth
                  })
                  writeEvent('message', stickerMsg)
                } else if (toolCall.name === 'trigger_other_character') {
                  const targetName = String(toolCall.arguments.character_name || '')
                  const reason = String(toolCall.arguments.reason || '')

                  // 验证角色存在且未被触发
                  if (
                    targetName &&
                    allCharacterNames.includes(targetName) &&
                    !selectedCharacters.includes(targetName) &&
                    !roastCharacters.includes(targetName) &&
                    !triggeredByTool.includes(targetName) &&
                    triggeredByTool.length < 2 // 最多额外触发2个
                  ) {
                    triggeredByTool.push(targetName)
                    // 通知前端有额外角色被触发
                    writeEvent('trigger', {
                      characterName: targetName,
                      reason,
                      triggeredBy: characterName
                    })
                  }
                }
              } catch (toolError) {
                console.error('Tool call error:', toolError)
                toolSuccess = false
              }
            }
          } catch (error) {
            toolSuccess = false
            console.error('Group chat AI reply error:', error)
          }
        }

        // ===== 第二阶段：吐槽角色（旁观者）回复 =====
        // 这些角色看到之前的回复后再进行吐槽
        for (const roastCharacterName of roastCharacters.slice(0, MAX_TRIGGERED_CHARACTERS - selectedCharacters.length)) {
          const character = characterMap.get(roastCharacterName)
          if (!character) continue

          try {
            const { reply, toolCalls } = await generateCharacterReply(
              character,
              characters,
              userAvatarInfo,
              content,
              history,
              summaryContext,
              aiConfig,
              session.userId,
              {
                isMentioned: false,
                mentionedNames: mentionedCharacters,
                isRoast: true,
                previousReplies
              }
            )

            // 不再使用硬编码回复，如果AI回复为空，跳过此角色
            if (!reply && toolCalls.length === 0) {
              continue
            }

            // 保存角色文本消息
            if (reply) {
              const generated = await saveGroupChatMessage({
                saveId: session.userId,
                senderType: 'character',
                senderName: roastCharacterName,
                content: reply,
                messageType: 'text',
                chainDepth: chainDepth + 1 // 吐槽是链式深度+1
              })
              writeEvent('message', generated)
            }

            // 处理工具调用（吐槽角色也可以发送表情包等）
            for (const toolCall of toolCalls) {
              try {
                if (toolCall.name === 'send_sticker') {
                  const emotion = String(toolCall.arguments.emotion || '开心')
                  let stickerUrl: string | undefined

                  if (siliconflowApiKey && character) {
                    try {
                      const template = character.template as unknown as Record<string, unknown> | undefined
                      const 角色档案 = template?.角色档案 as Record<string, unknown> | undefined
                      const 基本信息 = 角色档案?.基本信息 as Record<string, unknown> | undefined
                      
                      const stickerResult = await generateSticker(
                        siliconflowApiKey,
                        {
                          name: (基本信息?.姓名 as string) || roastCharacterName,
                          age: (基本信息?.年龄 as number) || 20,
                          gender: (基本信息?.性别 as string) || '女',
                          personality: (角色档案?.性格 as string) || '',
                          appearance: (基本信息?.外貌 as string) || ''
                        },
                        emotion
                      )
                      stickerUrl = stickerResult.images[0]?.url
                    } catch (stickerError) {
                      console.error('Sticker generation error:', stickerError)
                    }
                  }

                  const stickerMsg = await saveGroupChatMessage({
                    saveId: session.userId,
                    senderType: 'character',
                    senderName: roastCharacterName,
                    content: `[${emotion}表情包]`,
                    messageType: 'sticker',
                    stickerEmotion: emotion,
                    stickerUrl,
                    chainDepth: chainDepth + 1
                  })
                  writeEvent('message', stickerMsg)
                }
              } catch (toolError) {
                console.error('Tool call error:', toolError)
              }
            }
          } catch (error) {
            console.error('Roast character reply error:', error)
          }
        }

        // 处理由工具触发的额外角色回复（对话链）
        for (const extraCharacter of triggeredByTool.slice(0, 2)) {
          const character = characterMap.get(extraCharacter)
          if (!character) continue

          const roleProfile = character.template
            ? JSON.stringify(character.template)
            : `角色名：${extraCharacter}`

          // 工具触发的角色也需要知道同租租客信息
          const cohabitantsInfo = buildCohabitantsContext(characters, extraCharacter)

          try {
            type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
            const messages: ChatMessage[] = [
              {
                role: 'system',
                content: `你正在进行公寓群聊角色扮演。你必须始终以"${extraCharacter}"的身份回复。
${userAvatarInfo}
${cohabitantsInfo}
群聊规则：
1. 保持简短口语化，符合角色人设
2. 这是被其他租客 cue 到的回应，可以吐槽或接话
3. 回复要自然幽默
4. 你认识群里的所有租客`
              },
              {
                role: 'system',
                content: `角色档案：${roleProfile}`
              }
            ]

            // 注入已选总结上下文（如果有）
            if (summaryContext) {
              messages.push({
                role: 'system',
                content: summaryContext
              })
            }

            messages.push(
              {
                role: 'system',
                content: `最近群聊：\n${buildGroupHistory(history)}`
              },
              {
                role: 'user',
                content: `房东说：${content}\n其他租客在讨论这个话题，你被cue到了，请简短回应。`
              }
            )

            const aiResponse = await createChatCompletion(aiConfig, {
              messages
            })

            const aiReply = aiResponse.choices[0]?.message?.content?.trim()
            if (aiReply) {
              const generated = await saveGroupChatMessage({
                saveId: session.userId,
                senderType: 'character',
                senderName: extraCharacter,
                content: aiReply,
                messageType: 'text',
                chainDepth: chainDepth + 1
              })
              writeEvent('message', generated)
              await incrementApiCalls(session.userId)
            }
          } catch (error) {
            console.error('Extra character reply error:', error)
          }
        }

        const latency = Date.now() - requestStartedAt
        logSendMetrics({
          userId: session.userId,
          trigger_count: selectedCharacters.length + roastCharacters.length,
          chain_depth: chainDepth,
          tool_success: toolSuccess,
          latency_ms: latency
        })

        writeEvent('done', {
          ok: true,
          triggerCount: selectedCharacters.length + roastCharacters.length,
          chainDepth,
          toolSuccess,
          latencyMs: latency
        })
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    })
  } catch (error) {
    console.error('Group chat send error:', error)
    return NextResponse.json({ error: '发送群聊消息失败' }, { status: 500 })
  }
}
