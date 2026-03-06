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
 * Supports both objects {} and arrays []
 */
function extractValidJson(str: string): string {
  const trimmed = str.trim()
  
  // Try to find JSON object starting with {
  let braceStart = trimmed.indexOf('{')
  // Try to find JSON array starting with [
  let bracketStart = trimmed.indexOf('[')
  
  // Determine which comes first (if both exist)
  let start = -1
  let isArray = false
  
  if (braceStart !== -1 && bracketStart !== -1) {
    // Both found, use the one that comes first
    if (braceStart < bracketStart) {
      start = braceStart
      isArray = false
    } else {
      start = bracketStart
      isArray = true
    }
  } else if (braceStart !== -1) {
    start = braceStart
    isArray = false
  } else if (bracketStart !== -1) {
    start = bracketStart
    isArray = true
  }
  
  if (start === -1) {
    // No JSON structure found, try to parse the whole string as JSON
    try {
      JSON.parse(trimmed)
      return trimmed
    } catch {
      throw new Error('No JSON object or array found')
    }
  }
  
  let braceCount = 0
  let bracketCount = 0
  let inString = false
  let escapeNext = false
  
  for (let i = start; i < trimmed.length; i++) {
    const char = trimmed[i]
    
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
        if (!isArray && braceCount === 0) {
          return trimmed.substring(start, i + 1)
        }
      } else if (char === '[') {
        bracketCount++
      } else if (char === ']') {
        bracketCount--
        if (isArray && bracketCount === 0) {
          return trimmed.substring(start, i + 1)
        }
      }
    }
  }
  
  // If we couldn't find a complete structure, try parsing from start
  // This handles cases where the JSON might be cut off or malformed
  try {
    // Try to find the longest valid JSON substring
    for (let i = trimmed.length; i > start; i--) {
      const substring = trimmed.substring(start, i)
      try {
        JSON.parse(substring)
        return substring
      } catch {
        // Continue trying shorter substrings
      }
    }
  } catch {
    // Fall through to error
  }
  
  throw new Error('Incomplete JSON: no matching closing brace/bracket found')
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