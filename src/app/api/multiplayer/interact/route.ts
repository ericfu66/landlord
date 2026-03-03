import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { getRemoteCharacter, getMultiplayerSettings } from '@/lib/services/multiplayer-service'
import { createChatCompletion } from '@/lib/ai/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const body = await request.json()
    const { hostUserId, characterName, message } = body
    
    if (!hostUserId || !characterName || !message) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }
    
    // 检查目标用户是否允许互动
    const settings = await getMultiplayerSettings(hostUserId)
    if (!settings.allowCharacterInteractions) {
      return NextResponse.json({ error: '该用户不允许角色互动' }, { status: 403 })
    }
    
    // 获取角色信息（访客视角，不包含敏感信息）
    const character = await getRemoteCharacter(hostUserId, characterName)
    if (!character) {
      return NextResponse.json({ error: '角色不存在或不允许互动' }, { status: 404 })
    }
    
    // 获取访客的API配置
    const user = await getUserById(session.userId)
    if (!user?.api_config) {
      return NextResponse.json({ error: '请先配置AI API' }, { status: 400 })
    }
    
    const apiConfig = JSON.parse(user.api_config)
    
    // 构建提示词 - 访客互动使用独立变量系统
    const prompt = `你是${character.template.角色档案.基本信息.姓名}，正在与一位访客对话。

【角色设定】
${JSON.stringify(character.template, null, 2)}

【当前状态】
- 心情: ${character.mood}
- 对房东的好感度: ${character.favorability}

【访客身份】
这是一位来自其他地方的访客，正在参观这里。

【重要规则】
1. 你正在与访客对话，不是房东
2. 保持角色设定和性格
3. 对访客保持礼貌但保持一定距离
4. 可以聊日常生活、兴趣爱好等轻松话题
5. 不要提及顺从度、堕落度等敏感属性
6. 不要向访客收取租金或提出金钱要求
7. 所有变量从0开始，对话结束后不保存

访客说：${message}

请回复访客的对话：`;

    const response = await createChatCompletion(apiConfig, {
      messages: [{ role: 'user', content: prompt }]
    })
    
    const reply = response.choices[0]?.message?.content || '...'
    
    return NextResponse.json({ 
      reply,
      mood: character.mood
    })
  } catch (error) {
    console.error('Visitor interaction error:', error)
    return NextResponse.json({ error: '互动失败' }, { status: 500 })
  }
}
