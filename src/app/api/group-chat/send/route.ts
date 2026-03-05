import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getCharactersByUser } from '@/lib/services/recruit-service'
import { saveGroupChatMessage } from '@/lib/services/group-chat-service'
import { selectTriggeredCharacters } from '@/lib/services/group-chat-orchestrator'

interface SendBody {
  content?: string
  mentionedCharacters?: string[]
}

const MAX_CONTENT_LENGTH = 500
const MAX_TRIGGERED_CHARACTERS = 5

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

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = (await request.json()) as SendBody
    const content = body.content?.trim() ?? ''

    if (!content) {
      return NextResponse.json({ error: '消息不能为空' }, { status: 400 })
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: '消息长度不能超过500字' }, { status: 400 })
    }

    const characters = await getCharactersByUser(session.userId)
    const allCharacterNames = characters.map((item) => item.name)
    const mentionedCharacters = sanitizeMentioned(body.mentionedCharacters)

    const selectedCharacters = selectTriggeredCharacters({
      allCharacters: allCharacterNames,
      mentionedCharacters,
      randomCount: getRandomCount()
    }).slice(0, MAX_TRIGGERED_CHARACTERS)

    const playerMessage = await saveGroupChatMessage({
      saveId: session.userId,
      senderType: 'player',
      senderName: session.username,
      content,
      messageType: 'text',
      chainDepth: 0
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const writeEvent = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        writeEvent('message', playerMessage)

        for (const characterName of selectedCharacters) {
          const generated = await saveGroupChatMessage({
            saveId: session.userId,
            senderType: 'character',
            senderName: characterName,
            content: `收到：${content}`,
            messageType: 'text',
            chainDepth: 1
          })

          writeEvent('message', generated)
        }

        writeEvent('done', { ok: true, triggerCount: selectedCharacters.length })
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
