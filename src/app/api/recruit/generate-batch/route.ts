import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { createChatCompletion, extractJsonFromText, safeJsonParse } from '@/lib/ai/client'
import { CHARACTER_TEMPLATE_PROMPT, SPECIAL_VARIABLE_PROMPT, SpecialVariableData } from '@/prompts/character-template'
import { normalizeCharacter, CharacterTemplate } from '@/lib/services/recruit-service'
import { AIConfig } from '@/lib/ai/client'

// 注意: extractJsonFromText 和 safeJsonParse 现在从 '@/lib/ai/client' 导入

interface Candidate {
  id: string
  character: CharacterTemplate
  specialVar?: SpecialVariableData
}

interface GenerationResult {
  character: CharacterTemplate | null
  specialVar?: SpecialVariableData | null
  rawResponse?: string
  error?: string
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

async function generateCharacterWithSpecialVar(
  config: AIConfig,
  characterType: 'modern' | 'crossover',
  traits: string,
  sourceDescription: string | undefined,
  worldviewContent: string | undefined,
  seed: number
): Promise<GenerationResult> {
  let worldviewPrompt = ''
  if (worldviewContent) {
    worldviewPrompt = `

【世界观背景】
${worldviewContent}

请基于以上世界观背景生成角色，让角色融入这个世界观设定中。`
  }

  const userPrompt = `请生成一个${characterType === 'modern' ? '现代' : '跨时空'}角色，并为其设计特殊变量和分阶段人设。

期望特征：${traits}${seed > 0 ? `（尝试不同的具体表现方式，第${seed + 1}个角色）` : ''}
${sourceDescription ? `来源说明：${sourceDescription}` : ''}${worldviewPrompt}

请直接返回 JSON 格式，包含"角色档案"、"来源类型"、"穿越说明"（如适用）和"特殊变量"字段。不要包含任何其他说明文字。`

  const response = await createChatCompletion(config, {
    messages: [
      { role: 'system', content: COMBINED_PROMPT },
      { role: 'user', content: userPrompt }
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    return {
      character: null,
      error: 'AI未返回任何内容'
    }
  }

  try {
    const jsonStr = extractJsonFromText(content)
    const data = safeJsonParse(jsonStr) as Record<string, unknown>

    // 提取角色档案
    const normalized = normalizeCharacter(data)
    if (!normalized) {
      return {
        character: null,
        rawResponse: content,
        error: '角色数据格式不符合规范，缺少必要字段（角色档案）'
      }
    }

    // 提取特殊变量
    let specialVar: SpecialVariableData | null = null
    const specialVarData = data['特殊变量'] as Record<string, unknown> | undefined
    if (specialVarData && 
        specialVarData['变量名'] && 
        typeof specialVarData['初始值'] === 'number' &&
        Array.isArray(specialVarData['分阶段人设']) &&
        specialVarData['分阶段人设'].length === 5) {
      specialVar = specialVarData as unknown as SpecialVariableData
    }

    return { 
      character: normalized,
      specialVar
    }
  } catch (parseError) {
    return {
      character: null,
      rawResponse: content,
      error: `JSON解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`
    }
  }
}

// 计算招募费用：第一次500，每次+100
function calculateRecruitCost(recruitCount: number): number {
  return 500 + recruitCount * 100
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
    const { characterType, traits, sourceDescription, worldviewId, worldviewContent, seed = 0 } = body

    if (!characterType || !traits) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const config = JSON.parse(user.api_config as string)

    // 生成角色和特殊变量（一次 API 调用）
    const result = await generateCharacterWithSpecialVar(
      config,
      characterType,
      traits,
      sourceDescription,
      worldviewContent,
      seed
    )

    if (!result.character) {
      return NextResponse.json({ 
        error: '生成角色失败', 
        details: result.error || 'AI未能返回有效的角色数据',
        rawResponse: result.rawResponse
      }, { status: 500 })
    }

    const candidate: Candidate = {
      id: `candidate_${seed + 1}`,
      character: result.character,
      specialVar: result.specialVar || undefined
    }

    return NextResponse.json({ candidate })
  } catch (error) {
    console.error('Generate batch characters error:', error)
    const errorMessage = error instanceof Error ? error.message : '生成角色失败'
    return NextResponse.json(
      { 
        error: '生成角色失败',
        details: errorMessage 
      },
      { status: 500 }
    )
  }
}
