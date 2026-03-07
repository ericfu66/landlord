import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { composeMessages } from '@/lib/services/preset-service'
import { InteractionMode } from '@/types/preset'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { characterName, mode, userInput } = body as {
      characterName: string
      mode: InteractionMode
      userInput: string
    }

    if (!characterName || !mode || !userInput) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 })
    }

    const db = await getDb()

    // 获取角色数据
    const charResult = db.exec(
      `SELECT c.name, c.template, c.favorability, c.obedience, c.corruption, c.mood, c.worldview_id, c.room_id, c.special_var_name, c.special_var_value, c.special_var_stages
       FROM characters c 
       WHERE c.name = '${characterName.replace(/'/g, "''")}' AND c.user_id = ${session.userId}`
    )

    if (!charResult || !charResult[0]?.values?.length) {
      return NextResponse.json({ error: '角色不存在' }, { status: 404 })
    }

    const row = charResult[0].values[0]
    const characterData = {
      name: row[0] as string,
      template: JSON.parse(row[1] as string),
      favorability: row[2] as number,
      obedience: row[3] as number,
      corruption: row[4] as number,
      mood: row[5] as string,
      worldviewId: row[6] as number | null,
      roomId: row[7] as number | null,
      specialVarName: row[8] as string | null,
      specialVarValue: row[9] as number | null,
      specialVarStages: row[10] ? JSON.parse(row[10] as string) : null
    }

    // 获取世界观内容
    let worldviewContent: string | undefined
    if (characterData.worldviewId) {
      const worldviewResult = db.exec(
        `SELECT content FROM worldviews WHERE id = ${characterData.worldviewId} AND (user_id = ${session.userId} OR is_public = 1)`
      )
      if (worldviewResult && worldviewResult[0]?.values?.length) {
        worldviewContent = worldviewResult[0].values[0][0] as string
      }
    }

    // 构建人设内容
    const template = characterData.template
    const basicInfo = template?.角色档案?.基本信息
    const personality = template?.角色档案?.性格特点
    const background = template?.角色档案?.背景设定
    const language = template?.角色档案?.语言特征
    const relationship = template?.角色档案?.关系设定
    const appearance = template?.角色档案?.外貌特征

    let personaContent = `【角色设定】
你是${basicInfo?.姓名 || characterName}，${basicInfo?.年龄 || '未知'}岁，${basicInfo?.性别 || '未知'}。
身份：${basicInfo?.身份 || '未知身份'}
标签：${basicInfo?.标签?.join('、') || '无'}

【外貌特征】
整体印象：${appearance?.整体印象 || '未描述'}
发型：${appearance?.发型 || '未描述'}
面部：${appearance?.面部 || '未描述'}
身材：${appearance?.身材 || '未描述'}
穿着：${appearance?.穿着打扮 || '未描述'}

【性格特点】
核心特质：${personality?.核心特质 || '未描述'}
表现形式：${personality?.表现形式 || '未描述'}
对房东的表现：${personality?.对用户的表现 || '未描述'}

【背景设定】
家庭背景：${background?.家庭背景 || '未描述'}
经济状况：${background?.经济状况 || '未描述'}
成长经历：${background?.成长经历 || '未描述'}
社交关系：${background?.社交关系 || '未描述'}

【语言特征】
音色：${language?.音色 || '未描述'}
说话习惯：${language?.说话习惯 || '未描述'}
口头禅：${language?.口头禅 || '无'}

【关系设定】
与用户的关系：${relationship?.与用户的关系 || '房东与房客'}
相识过程：${relationship?.相识过程 || '未描述'}
互动方式：${relationship?.互动方式 || '未描述'}`

    // 特殊变量阶段信息
    let specialVarInfo = ''
    if (characterData.specialVarName && characterData.specialVarValue !== undefined && characterData.specialVarStages) {
      const currentStage = characterData.specialVarStages.find((stage: {阶段范围: string}) => {
        const [min, max] = stage.阶段范围.split('-').map(Number)
        return characterData.specialVarValue! >= min && characterData.specialVarValue! <= max
      })
      
      if (currentStage) {
        specialVarInfo = `
【特殊状态：${characterData.specialVarName}】
当前值：${characterData.specialVarValue}
阶段：${currentStage.阶段名称}
人格表现：${currentStage.人格表现}`
      }
    }

    // 构建记忆内容
    const memoryContent = `【角色当前状态】
好感度：${characterData.favorability}
顺从度：${characterData.obedience}
堕落度：${characterData.corruption}
心情：${characterData.mood}${specialVarInfo}`

    // 获取历史记录
    const historyResult = db.exec(
      `SELECT role, content FROM chat_history 
       WHERE character_name = '${characterName.replace(/'/g, "''")}' AND user_id = ${session.userId}
       ORDER BY id DESC LIMIT 10`
    )
    
    const historyMessages = historyResult && historyResult[0]?.values 
      ? historyResult[0].values.reverse().map((v: unknown[]) => `${v[0]}: ${v[1]}`).join('\n')
      : '暂无聊天记录'

    // 获取预设
    const presetResult = db.exec(
      `SELECT preset_data FROM presets WHERE user_id = ${session.userId} AND preset_type = '${mode}'`
    )
    
    let presetEntries: unknown[] = []
    let personaPosition: string = 'after_worldview'
    if (presetResult && presetResult[0]?.values?.length) {
      const presetData = JSON.parse(presetResult[0].values[0][0] as string)
      presetEntries = presetData.entries || []
      personaPosition = presetData.personaPosition || 'after_worldview'
    }

    // 构建消息
    const messages = composeMessages(
      {
        fixed: {
          persona: personaContent,
          memory: memoryContent,
          history: historyMessages
        },
        custom: presetEntries as [],
        userInput,
        personaPosition: personaPosition as any
      },
      worldviewContent
    )

    // 按 role 统计
    const stats = {
      system: messages.filter(m => m.role === 'system').length,
      user: messages.filter(m => m.role === 'user').length,
      assistant: messages.filter(m => m.role === 'assistant').length,
      total: messages.length
    }

    return NextResponse.json({
      messages,
      stats,
      personaPosition
    })
  } catch (error) {
    console.error('Debug prompt error:', error)
    return NextResponse.json({ error: '获取提示词失败' }, { status: 500 })
  }
}
