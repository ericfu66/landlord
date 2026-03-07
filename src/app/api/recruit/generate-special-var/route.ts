import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { createChatCompletion, extractJsonFromText, safeJsonParse } from '@/lib/ai/client'
import { SPECIAL_VARIABLE_PROMPT, SpecialVariableData } from '@/prompts/character-template'
import { incrementApiCalls } from '@/lib/auth/repo'

// 注意: extractJsonFromText 和 safeJsonParse 现在从 '@/lib/ai/client' 导入

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
