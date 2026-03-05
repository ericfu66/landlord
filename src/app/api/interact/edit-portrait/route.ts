import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDb, safeInt, safeSqlString } from '@/lib/db'
import { generatePortraitVariation } from '@/lib/ai/image-client'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { characterName, emotion, pose, customPrompt } = body as {
      characterName: string
      emotion: string
      pose?: string
      customPrompt?: string
    }

    if (!characterName || !emotion) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // Get character data
    const db = await getDb()
    const safeUserId = safeInt(session.userId)
    const safeCharName = safeSqlString(characterName)

    const charResult = db.exec(`
      SELECT template, portrait_url 
      FROM characters 
      WHERE user_id = ${safeUserId} AND name = '${safeCharName}'
    `)

    if (!charResult || charResult.length === 0 || !charResult[0].values) {
      return NextResponse.json({ error: '角色不存在' }, { status: 404 })
    }

    const template = JSON.parse(charResult[0].values[0][0] as string)
    const portraitUrl = charResult[0].values[0][1] as string | undefined
    const basicInfo = template?.角色档案?.基本信息 || {}

    if (!portraitUrl) {
      return NextResponse.json({ error: '角色没有立绘，请先生成立绘' }, { status: 400 })
    }

    // Use SiliconFlow API for portrait editing
    const siliconflowApiKey = process.env.SILICONFLOW_API_KEY || 'sk-lxyuvnsjzjjyscdydksumgivayqihstnscshsfxngfqggntf'

    // Generate portrait variation with emotion
    const variationResult = await generatePortraitVariation(
      siliconflowApiKey,
      portraitUrl,
      {
        name: basicInfo.姓名 || characterName,
        age: basicInfo.年龄 || 20,
        gender: basicInfo.性别 || '女',
        identity: basicInfo.身份 || '租客',
        personality: template?.角色档案?.性格 || ''
      },
      customPrompt || emotion,
      pose
    )

    const imageUrl = variationResult.images[0]?.url
    if (!imageUrl) {
      return NextResponse.json({ error: '实时立绘生成失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      emotion,
      pose
    })
  } catch (error) {
    console.error('Edit portrait error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成实时立绘失败' },
      { status: 500 }
    )
  }
}
