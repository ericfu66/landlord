import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { getDb } from '@/lib/db'
import { createChatCompletion } from '@/lib/ai/client'
import { CHARACTER_TEMPLATE_PROMPT, GENERATE_CHARACTER_TOOL, SPECIAL_VARIABLE_PROMPT, GENERATE_SPECIAL_VAR_TOOL, SpecialVariableData } from '@/prompts/character-template'
import { normalizeCharacter, CharacterTemplate } from '@/lib/services/recruit-service'
import { AIConfig } from '@/lib/ai/client'
import { incrementApiCalls } from '@/lib/auth/repo'

/**
 * Extract valid JSON from a string that may contain extra content
 */
function extractValidJson(str: string): string {
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
          return str.substring(start, i + 1)
        }
      }
    }
  }
  
  throw new Error('Incomplete JSON: no matching closing brace found')
}

interface Candidate {
  id: string
  character: CharacterTemplate
  specialVar?: SpecialVariableData
}

async function generateSingleCharacter(
  config: AIConfig,
  characterType: 'modern' | 'crossover',
  traits: string,
  sourceDescription: string | undefined,
  worldviewContent: string | undefined,
  seed: number
): Promise<CharacterTemplate | null> {
  let worldviewPrompt = ''
  if (worldviewContent) {
    worldviewPrompt = `

【世界观背景】
${worldviewContent}

请基于以上世界观背景生成角色，让角色融入这个世界观设定中。`
  }

  const systemPrompt = CHARACTER_TEMPLATE_PROMPT
  const userPrompt = `请生成一个${characterType === 'modern' ? '现代' : '跨时空'}角色。

期望特征：${traits}${seed > 0 ? `（尝试不同的具体表现方式，第${seed + 1}个角色）` : ''}
${sourceDescription ? `来源说明：${sourceDescription}` : ''}${worldviewPrompt}`

  const response = await createChatCompletion(config, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    tools: [GENERATE_CHARACTER_TOOL],
    tool_choice: { type: 'function', function: { name: 'generate_character' } }
  })

  const toolCall = response.choices[0]?.message?.tool_calls?.[0]
  if (!toolCall) {
    return null
  }

  const jsonStr = extractValidJson(toolCall.function.arguments)
  const characterData = JSON.parse(jsonStr)
  const normalized = normalizeCharacter(characterData)

  return normalized
}

async function generateSpecialVariable(
  config: AIConfig,
  characterTemplate: CharacterTemplate
): Promise<SpecialVariableData | null> {
  const systemPrompt = SPECIAL_VARIABLE_PROMPT
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
并根据变量值的不同范围（0-20、20-40、40-60、60-80、80-100）生成对应的分阶段人设。`

  const response = await createChatCompletion(config, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    tools: [GENERATE_SPECIAL_VAR_TOOL],
    tool_choice: { type: 'function', function: { name: 'generate_special_variable' } }
  })

  const toolCall = response.choices[0]?.message?.tool_calls?.[0]
  if (!toolCall) {
    return null
  }

  const jsonStr = extractValidJson(toolCall.function.arguments)
  const specialVarData = JSON.parse(jsonStr) as SpecialVariableData

  if (!specialVarData.变量名 || typeof specialVarData.初始值 !== 'number' || !Array.isArray(specialVarData.分阶段人设)) {
    return null
  }

  if (specialVarData.分阶段人设.length !== 5) {
    return null
  }

  return specialVarData
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
    const { characterType, traits, sourceDescription, worldviewId, worldviewContent, count = 3 } = body

    if (!characterType || !traits) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const config = JSON.parse(user.api_config as string)
    const candidates: Candidate[] = []
    const generatedNames: string[] = []

    // 生成多个角色
    for (let i = 0; i < count; i++) {
      try {
        const character = await generateSingleCharacter(
          config,
          characterType,
          traits,
          sourceDescription,
          worldviewContent,
          i
        )

        if (character && !generatedNames.includes(character.角色档案.基本信息.姓名)) {
          generatedNames.push(character.角色档案.基本信息.姓名)
          
          // 为每个角色生成特殊变量
          const specialVar = await generateSpecialVariable(config, character)
          
          candidates.push({
            id: `candidate_${i + 1}`,
            character,
            specialVar: specialVar || undefined
          })

          // 每次生成后增加API调用计数
          await incrementApiCalls(session.userId)
          // 再增加一次用于特殊变量生成
          if (specialVar) {
            await incrementApiCalls(session.userId)
          }
        }
      } catch (err) {
        console.error(`Failed to generate candidate ${i + 1}:`, err)
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({ error: '生成角色失败，请重试' }, { status: 500 })
    }

    return NextResponse.json({ candidates })
  } catch (error) {
    console.error('Generate batch characters error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '批量生成角色失败' },
      { status: 500 }
    )
  }
}
