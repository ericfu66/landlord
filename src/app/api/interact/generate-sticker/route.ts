import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDb, safeInt, safeSqlString } from '@/lib/db'
import { generateSticker } from '@/lib/ai/image-client'

// Built-in prompt templates for different emotions
const EMOTION_PROMPTS: Record<string, string> = {
  happy: 'happy, joyful, big smile, sparkling eyes, cheerful expression',
  sad: 'sad, teary eyes, pouting, melancholic, crying',
  angry: 'angry, frustrated, puffed cheeks, annoyed expression, steam coming out',
  surprised: 'surprised, shocked, wide eyes, open mouth, exclamation mark',
  shy: 'shy, blushing, looking away, embarrassed, covering face',
  excited: 'excited, energetic, sparkling eyes, bouncing, celebrating',
  love: 'in love, heart eyes, blushing, affectionate, romantic',
  sleepy: 'sleepy, yawning, droopy eyes, tired, needing rest',
  confused: 'confused, question marks, tilted head, puzzled expression',
  cool: 'cool, confident, sunglasses, smirk, stylish pose'
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { characterName, emotion } = body as {
      characterName: string
      emotion: string
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

    // Use SiliconFlow API for sticker generation
    const siliconflowApiKey = process.env.SILICONFLOW_API_KEY || 'sk-lxyuvnsjzjjyscdydksumgivayqihstnscshsfxngfqggntf'

    // Generate sticker with emotion
    const emotionPrompt = EMOTION_PROMPTS[emotion.toLowerCase()] || emotion

    const stickerResult = await generateSticker(
      siliconflowApiKey,
      {
        name: basicInfo.姓名 || characterName,
        age: basicInfo.年龄 || 20,
        gender: basicInfo.性别 || '女',
        personality: template?.角色档案?.性格 || '',
        appearance: basicInfo.外貌 || ''
      },
      emotionPrompt
    )

    const imageUrl = stickerResult.images[0]?.url
    if (!imageUrl) {
      return NextResponse.json({ error: '表情包生成失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      emotion
    })
  } catch (error) {
    console.error('Generate sticker error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成表情包失败' },
      { status: 500 }
    )
  }
}
