import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { getDb, safeInt, safeSqlString } from '@/lib/db'
import { generateImage, generateGalgamePrompt } from '@/lib/ai/image-client'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { characterName } = await request.json()
    if (!characterName) {
      return NextResponse.json({ error: '缺少角色名称' }, { status: 400 })
    }

    // Get user's AI config
    const db = await getDb()
    const safeUserId = safeInt(session.userId)
    const result = db.exec(`SELECT api_config FROM users WHERE id = ${safeUserId}`)

    if (!result || result.length === 0 || !result[0].values || !result[0].values[0][0]) {
      return NextResponse.json({ error: '请先配置AI API' }, { status: 400 })
    }

    const config = JSON.parse(result[0].values[0][0] as string)
    if (!config.baseUrl || !config.apiKey || !config.model) {
      return NextResponse.json({ error: 'AI配置不完整' }, { status: 400 })
    }

    // Get character data
    const safeCharName = safeSqlString(characterName)
    const charResult = db.exec(`
      SELECT c.name, c.template, c.favorability, c.obedience, c.corruption, c.mood
      FROM characters c
      WHERE c.user_id = ${safeUserId} AND c.name = '${safeCharName}'
    `)

    if (!charResult || charResult.length === 0 || !charResult[0].values) {
      return NextResponse.json({ error: '角色不存在' }, { status: 404 })
    }

    const charData = charResult[0].values[0]
    const template = JSON.parse(charData[1] as string)
    const basicInfo = template?.角色档案?.基本信息 || {}

    // Generate prompt using LLM
    const imagePrompt = await generateGalgamePrompt(
      config.baseUrl,
      config.apiKey,
      config.model,
      {
        name: basicInfo.姓名 || characterName,
        age: basicInfo.年龄 || 20,
        gender: basicInfo.性别 || '女',
        identity: basicInfo.身份 || '租客',
        tags: basicInfo.标签 || [],
        personality: template?.角色档案?.性格 || ''
      }
    )

    // Use SiliconFlow API for image generation
    const siliconflowApiKey = process.env.SILICONFLOW_API_KEY || 'sk-lxyuvnsjzjjyscdydksumgivayqihstnscshsfxngfqggntf'

    // Generate image
    const imageResult = await generateImage(siliconflowApiKey, {
      model: 'Kwai-Kolors/Kolors',
      prompt: imagePrompt,
      size: '768x1024',
      n: 1,
      num_inference_steps: 25,
      guidance_scale: 7.5
    })

    const imageUrl = imageResult.images[0]?.url
    if (!imageUrl) {
      return NextResponse.json({ error: '图像生成失败' }, { status: 500 })
    }

    // Save portrait URL to character
    db.run(`
      UPDATE characters 
      SET portrait_url = '${safeSqlString(imageUrl)}'
      WHERE user_id = ${safeUserId} AND name = '${safeCharName}'
    `)

    // Save to file system for persistence
    const { saveDb } = await import('@/lib/db')
    saveDb()

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      prompt: imagePrompt
    })
  } catch (error) {
    console.error('Generate portrait error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成立绘失败' },
      { status: 500 }
    )
  }
}
