import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { createChatCompletion } from '@/lib/ai/client'
import { SPECIAL_VARIABLE_PROMPT, SpecialVariableData } from '@/prompts/character-template'
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
    // 尝试找最长可解析的子串
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
    // 尝试修复常见的 JSON 问题
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
    const { characterTemplate } = body

    if (!characterTemplate) {
      return NextResponse.json({ error: '缺少角色模板' }, { status: 400 })
    }

    const config = JSON.parse(user.api_config as string)

    // 纯提示词方式，不使用 tool calling
    const systemPrompt = `${SPECIAL_VARIABLE_PROMPT}

【重要】你必须直接返回 JSON 格式的特殊变量数据，不要添加任何解释说明或 markdown 格式标记。返回的 JSON 必须可以被直接解析。`

    const userPrompt = `请为以下角色生成特殊变量和分阶段人设：

【角色基本信息】
姓名：${characterTemplate.角色档案.基本信息.姓名}
年龄：${characterTemplate.角色档案.基本信息.年龄}岁
性别：${characterTemplate.角色档案.基本信息.性别}
身份：${characterTemplate.角色档案.基本信息.身份}
标签：${characterTemplate.角色档案.基本信息.标签.join('、')}

【性格特点】
核心特质：${characterTemplate.角色档案.性格特点.核心特质}
表现形式：${characterTemplate.角色档案.性格特点.表现形式}
对用户的表现：${characterTemplate.角色档案.性格特点.对用户的表现}

【背景设定】
家庭背景：${characterTemplate.角色档案.背景设定.家庭背景}
成长经历：${characterTemplate.角色档案.背景设定.成长经历}

请分析这个角色，为其设计一个最能代表其特殊状态的变量（如黑化值、干劲值、软化度等），
并根据变量值的不同范围（0-20、20-40、40-60、60-80、80-100）生成对应的分阶段人设。

请直接返回 JSON 格式，不要包含任何其他说明文字。`

    const response = await createChatCompletion(config, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      // 不传递 tools 和 tool_choice，使用纯文本模式
    })

    await incrementApiCalls(session.userId)

    // 从 AI 响应中获取内容
    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'AI 未返回内容' }, { status: 500 })
    }

    // 提取并解析 JSON
    const jsonStr = extractJsonFromText(content)
    const specialVarData = safeJsonParse(jsonStr) as SpecialVariableData

    // 验证数据结构
    if (!specialVarData.变量名 || typeof specialVarData.初始值 !== 'number' || !Array.isArray(specialVarData.分阶段人设)) {
      return NextResponse.json({ error: '特殊变量数据格式错误' }, { status: 500 })
    }

    // 确保有5个阶段
    if (specialVarData.分阶段人设.length !== 5) {
      return NextResponse.json({ error: '分阶段人设数量不正确，需要5个阶段' }, { status: 500 })
    }

    return NextResponse.json({ specialVar: specialVarData })
  } catch (error) {
    console.error('Generate special variable error:', error)
    const errorMessage = error instanceof Error ? error.message : '生成特殊变量失败'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
