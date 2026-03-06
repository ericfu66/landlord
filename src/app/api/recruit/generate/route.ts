import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { createChatCompletion } from '@/lib/ai/client'
import { CHARACTER_TEMPLATE_PROMPT, SPECIAL_VARIABLE_PROMPT, SpecialVariableData } from '@/prompts/character-template'
import { normalizeCharacter, CharacterTemplate } from '@/lib/services/recruit-service'
import { incrementApiCalls } from '@/lib/auth/repo'

/**
 * 从 AI 返回的文本中提取 JSON
 * 支持处理：markdown 代码块、think 标签、HTML 错误页面等
 */
function extractJsonFromText(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('返回内容为空或格式错误')
  }

  const trimmed = text.trim()

  // 检测 HTML 错误页面
  if (trimmed.startsWith('<') && (trimmed.includes('<html') || trimmed.includes('<!DOCTYPE'))) {
    throw new Error('API 返回了 HTML 错误页面，请检查 API 配置')
  }

  // 移除 think 标签及其内容 (DeepSeek 等模型的思考内容)
  let cleaned = trimmed
  const thinkPatterns = [
    /<think>[\s\S]*?<\/think>/gi,
    /<thinking>[\s\S]*?<\/thinking>/gi,
    /<reasoning>[\s\S]*?<\/reasoning>/gi,
    /<thought>[\s\S]*?<\/thought>/gi,
  ]
  for (const pattern of thinkPatterns) {
    cleaned = cleaned.replace(pattern, '')
  }

  // 尝试从 markdown 代码块中提取 JSON
  const codeBlockPatterns = [
    /```json\s*([\s\S]*?)```/i,
    /```\s*([\s\S]*?)```/i,
  ]
  for (const pattern of codeBlockPatterns) {
    const match = cleaned.match(pattern)
    if (match && match[1]) {
      const content = match[1].trim()
      if (content.startsWith('{') || content.startsWith('[')) {
        return content
      }
    }
  }

  // 查找 JSON 对象的开始位置
  const braceIndex = cleaned.indexOf('{')
  const bracketIndex = cleaned.indexOf('[')

  let startIndex = -1
  let isArray = false

  if (braceIndex !== -1 && bracketIndex !== -1) {
    if (braceIndex < bracketIndex) {
      startIndex = braceIndex
    } else {
      startIndex = bracketIndex
      isArray = true
    }
  } else if (braceIndex !== -1) {
    startIndex = braceIndex
  } else if (bracketIndex !== -1) {
    startIndex = bracketIndex
    isArray = true
  }

  if (startIndex === -1) {
    throw new Error('未在返回内容中找到 JSON 数据')
  }

  // 使用括号匹配找到 JSON 的结束位置
  let braceCount = 0
  let bracketCount = 0
  let inString = false
  let escapeNext = false

  for (let i = startIndex; i < cleaned.length; i++) {
    const char = cleaned[i]

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
          return cleaned.substring(startIndex, i + 1)
        }
      } else if (char === '[') {
        bracketCount++
      } else if (char === ']') {
        bracketCount--
        if (isArray && bracketCount === 0) {
          return cleaned.substring(startIndex, i + 1)
        }
      }
    }
  }

  // 尝试返回从开始到末尾的内容
  const candidate = cleaned.substring(startIndex)
  try {
    JSON.parse(candidate)
    return candidate
  } catch {
    for (let i = candidate.length; i > 0; i--) {
      try {
        const substring = candidate.substring(0, i)
        JSON.parse(substring)
        return substring
      } catch {
        // 继续尝试更短的
      }
    }
  }

  throw new Error('无法提取有效的 JSON 数据')
}

/**
 * 安全地解析 JSON
 */
function safeJsonParse(jsonStr: string): unknown {
  try {
    return JSON.parse(jsonStr)
  } catch (parseError) {
    let fixed = jsonStr

    // 移除尾部逗号
    fixed = fixed.replace(/,\s*([}\]])/g, '$1')

    // 尝试补全缺失的闭合括号
    while ((fixed.match(/\{/g) || []).length > (fixed.match(/\}/g) || []).length) {
      fixed += '}'
    }
    while ((fixed.match(/\[/g) || []).length > (fixed.match(/\]/g) || []).length) {
      fixed += ']'
    }

    try {
      return JSON.parse(fixed)
    } catch {
      throw parseError
    }
  }
}

/**
 * 合并的系统提示词：同时生成角色和特殊变量
 */
const COMBINED_PROMPT = `${CHARACTER_TEMPLATE_PROMPT}

${SPECIAL_VARIABLE_PROMPT}

【重要】你必须在一次回复中同时完成以下两个任务：
1. 生成完整的角色档案（包含角色档案的所有字段）
2. 为这个角色生成特殊变量和分阶段人设

请以 JSON 格式返回，结构如下：
{
  "角色档案": { ... },
  "来源类型": "modern" | "crossover",
  "穿越说明": "string (if crossover)",
  "特殊变量": {
    "变量名": "string",
    "变量说明": "string",
    "初始值": number,
    "最小值": 0,
    "最大值": 100,
    "分阶段人设": [
      { "阶段范围": "0-20", "阶段名称": "string", "人格表现": "string" },
      { "阶段范围": "20-40", "阶段名称": "string", "人格表现": "string" },
      { "阶段范围": "40-60", "阶段名称": "string", "人格表现": "string" },
      { "阶段范围": "60-80", "阶段名称": "string", "人格表现": "string" },
      { "阶段范围": "80-100", "阶段名称": "string", "人格表现": "string" }
    ]
  }
}

【重要】你必须直接返回 JSON 格式，不要添加任何解释说明或 markdown 格式标记。返回的 JSON 必须可以被直接解析。`

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

    // 构建世界观提示
    let worldviewPrompt = ''
    if (worldviewContent) {
      worldviewPrompt = `

【世界观背景】
${worldviewContent}

请基于以上世界观背景生成角色，让角色融入这个世界观设定中。`
    }

    const config = JSON.parse(user.api_config as string)

    const userPrompt = `请生成一个${characterType === 'modern' ? '现代' : '跨时空'}角色，并为其设计特殊变量和分阶段人设。

期望特征：${traits}
${sourceDescription ? `来源说明：${sourceDescription}` : ''}${worldviewPrompt}

请直接返回 JSON 格式，包含"角色档案"、"来源类型"、"穿越说明"（如适用）和"特殊变量"字段。不要包含任何其他说明文字。`

    // 一次 API 调用同时获取角色和特殊变量
    const response = await createChatCompletion(config, {
      messages: [
        { role: 'system', content: COMBINED_PROMPT },
        { role: 'user', content: userPrompt }
      ],
    })

    await incrementApiCalls(session.userId)

    // 从 AI 响应中获取内容
    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'AI 未返回内容' }, { status: 500 })
    }

    // 提取并解析 JSON
    const jsonStr = extractJsonFromText(content)
    const data = safeJsonParse(jsonStr) as Record<string, unknown>

    // 提取角色档案
    const normalized = normalizeCharacter(data)
    if (!normalized) {
      return NextResponse.json({ error: '角色数据格式错误' }, { status: 500 })
    }

    // 提取特殊变量
    let specialVar: SpecialVariableData | undefined
    const specialVarData = data['特殊变量'] as Record<string, unknown> | undefined
    if (specialVarData && 
        specialVarData['变量名'] && 
        typeof specialVarData['初始值'] === 'number' &&
        Array.isArray(specialVarData['分阶段人设']) &&
        specialVarData['分阶段人设'].length === 5) {
      specialVar = specialVarData as unknown as SpecialVariableData
    }

    return NextResponse.json({ 
      character: normalized,
      specialVar
    })
  } catch (error) {
    console.error('Generate character error:', error)
    const errorMessage = error instanceof Error ? error.message : '生成角色失败'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
