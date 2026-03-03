import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { getDb } from '@/lib/db'
import { createChatCompletion } from '@/lib/ai/client'
import { CHARACTER_TEMPLATE_PROMPT, GENERATE_CHARACTER_TOOL } from '@/prompts/character-template'
import { normalizeCharacter } from '@/lib/services/recruit-service'
import { incrementApiCalls } from '@/lib/auth/repo'

/**
 * Extract valid JSON from a string that may contain extra content
 * Uses brace matching to find the complete JSON object
 */
function extractValidJson(str: string): string {
  // Find the first opening brace
  let start = str.indexOf('{')
  if (start === -1) throw new Error('No JSON object found')
  
  let braceCount = 0
  let inString = false
  let escapeNext = false
  
  for (let i = start; i < str.length; i++) {
    const char = str[i]
    
    if (escapeNext) {
      escapeNext = false
      continue
    }
    
    if (char === '\\') {
      escapeNext = true
      continue
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString
      continue
    }
    
    if (!inString) {
      if (char === '{') {
        braceCount++
      } else if (char === '}') {
        braceCount--
        if (braceCount === 0) {
          // Found the matching closing brace
          return str.substring(start, i + 1)
        }
      }
    }
  }
  
  throw new Error('Incomplete JSON: no matching closing brace found')
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
    const { characterType, traits, sourceDescription, worldviewId, worldviewContent } = body

    if (!characterType || !traits) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 构建世界观提示（如果提供了世界观）
    let worldviewPrompt = ''
    if (worldviewContent) {
      worldviewPrompt = `

【世界观背景】
${worldviewContent}

请基于以上世界观背景生成角色，让角色融入这个世界观设定中。`
    }

    const config = JSON.parse(user.api_config as string)

    const systemPrompt = CHARACTER_TEMPLATE_PROMPT
    const userPrompt = `请生成一个${characterType === 'modern' ? '现代' : '跨时空'}角色。

期望特征：${traits}
${sourceDescription ? `来源说明：${sourceDescription}` : ''}${worldviewPrompt}`

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

    // Fix: Extract valid JSON from response using brace matching
    const jsonStr = extractValidJson(toolCall.function.arguments)
    const characterData = JSON.parse(jsonStr)
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