export interface AIConfig {
  baseUrl: string
  apiKey: string
  model: string
  temperature?: number
  top_p?: number
  top_k?: number
  max_tokens?: number
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
  tools?: Array<{
    type: 'function'
    function: {
      name: string
      description: string
      parameters: Record<string, unknown>
    }
  }>
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string | null
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: {
          name: string
          arguments: string
        }
      }>
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function createChatCompletion(
  config: AIConfig,
  request: ChatCompletionRequest,
  timeoutMs: number = 120000  // 默认2分钟超时
): Promise<ChatCompletionResponse> {
  // 创建 AbortController 用于超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: request.model || config.model,
        messages: request.messages,
        temperature: request.temperature ?? config.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? config.max_tokens,
        ...(config.top_p !== undefined && { top_p: config.top_p }),
        ...(config.top_k !== undefined && { top_k: config.top_k }),
        tools: request.tools,
        tool_choice: request.tool_choice
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorMessage: string
      const errorText = await response.text()
      try {
        // 尝试解析JSON错误
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error?.message || errorJson.message || errorJson.error || errorText
      } catch {
        // 如果不是JSON，使用原文本
        errorMessage = errorText
      }
      throw new Error(`AI API错误 (${response.status}): ${errorMessage || '未知错误'}`)
    }

    return response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`AI 请求超时 (${timeoutMs/1000}秒)，请检查网络连接或稍后重试`)
    }
    throw error
  }
}

export async function testConnection(config: AIConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${config.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    })

    if (!response.ok) {
      return { success: false, error: `连接失败: ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '未知错误' }
  }
}

export function parseToolCallArguments(argumentsText: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(argumentsText)
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>
    }
    return {}
  } catch {
    return {}
  }
}

/**
 * 检测并修复 JSON 字符串中未转义的内部引号
 * 
 * 问题场景: AI 生成的 JSON 可能包含 {"说": "他说"你好""} 这种未转义的内部引号
 * 修复策略: 使用状态机遍历，识别字符串边界，将字符串内部的英文双引号替换为单引号
 */
function fixUnescapedQuotes(jsonStr: string): string {
  let result = ''
  let inString = false
  let escapeNext = false
  let stringContent = ''

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]

    if (escapeNext) {
      if (inString) {
        stringContent += char
      } else {
        result += char
      }
      escapeNext = false
      continue
    }

    if (char === '\\') {
      if (inString) {
        stringContent += char
      } else {
        result += char
      }
      escapeNext = true
      continue
    }

    if (char === '"') {
      if (!inString) {
        // 字符串开始 - 这是 JSON 结构的引号，暂存开始
        inString = true
        stringContent = ''
      } else {
        // 可能是字符串结束，也可能是内部未转义的引号
        // 检查下一个非空白字符
        const nextNonSpace = findNextNonSpaceChar(jsonStr, i + 1)
        
        // 如果下一个非空白字符是结构字符，则这是字符串结束
        if (nextNonSpace === ',' || nextNonSpace === ':' || nextNonSpace === '}' || 
            nextNonSpace === ']' || nextNonSpace === '' || nextNonSpace === '\n' ||
            nextNonSpace === ' ' || nextNonSpace === '\t' || nextNonSpace === '\r') {
          inString = false
          result += '"' + stringContent + '"'
          stringContent = ''
        } else {
          // 这是内部未转义的引号，替换为单引号
          stringContent += "'"
        }
      }
    } else {
      if (inString) {
        stringContent += char
      } else {
        result += char
      }
    }
  }

  // 处理未闭合的字符串
  if (inString) {
    result += '"' + stringContent
  }

  return result
}

/**
 * 查找从指定位置开始的下一个非空白字符
 */
function findNextNonSpaceChar(str: string, start: number): string {
  for (let i = start; i < str.length; i++) {
    const char = str[i]
    if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
      return char
    }
  }
  return ''
}

/**
 * 清理 JSON 字符串中的常见格式问题
 * - 修复未转义的内部引号
 * - 将中文引号（如果存在）替换为单引号
 * - 清理其他可能导致 JSON 解析失败的字符
 */
function cleanJsonString(text: string): string {
  let cleaned = text

  // 首先修复未转义的内部引号
  cleaned = fixUnescapedQuotes(cleaned)

  // 将中文引号（U+201C 和 U+201D）替换为单引号
  cleaned = cleaned.replace(/[\u201C\u201D]/g, "'")

  return cleaned
}

/**
 * 从 AI 返回的文本中提取 JSON
 * 支持处理：markdown 代码块、think 标签、HTML 错误页面等
 * 不需要 JSON 被 ``` 包裹
 */
export function extractJsonFromText(text: string): string {
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
        // 清理并返回
        return cleanJsonString(content)
      }
    }
  }

  // 查找 JSON 对象/数组的开始位置（支持没有代码块包裹的纯 JSON）
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
          return cleanJsonString(cleaned.substring(startIndex, i + 1))
        }
      } else if (char === '[') {
        bracketCount++
      } else if (char === ']') {
        bracketCount--
        if (isArray && bracketCount === 0) {
          return cleanJsonString(cleaned.substring(startIndex, i + 1))
        }
      }
    }
  }

  // 尝试返回从开始到末尾的内容
  const candidate = cleaned.substring(startIndex)
  try {
    JSON.parse(candidate)
    return cleanJsonString(candidate)
  } catch {
    // 尝试找最长可解析的子串
    for (let i = candidate.length; i > 0; i--) {
      try {
        const substring = candidate.substring(0, i)
        JSON.parse(substring)
        return cleanJsonString(substring)
      } catch {
        // 继续尝试更短的
      }
    }
  }

  throw new Error('无法提取有效的 JSON 数据')
}

/**
 * 安全地解析 JSON
 * 会自动修复常见的 JSON 格式问题
 */
export function safeJsonParse(jsonStr: string): unknown {
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
