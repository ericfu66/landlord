import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { fetchModels } from '@/lib/ai/models'
import { getUserById } from '@/lib/auth/repo'
import { getDb, saveDb, safeInt, safeSqlString } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = await getUserById(session.userId)
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const db = await getDb()
    const safeUserId = safeInt(session.userId)
    const result = db.exec(`SELECT api_config FROM users WHERE id = ${safeUserId}`)

    if (!result || result.length === 0 || !result[0].values || !result[0].values[0][0]) {
      return NextResponse.json({ error: '请先配置API' }, { status: 400 })
    }

    const config = JSON.parse(result[0].values[0][0] as string)

    const models = await fetchModels(config.baseUrl, config.apiKey)

    return NextResponse.json({ models })
  } catch (error) {
    console.error('Fetch models error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取模型列表失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      console.error('Save config error: 未登录')
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    console.log('Save config: session.userId =', session.userId)

    const body = await request.json()
    const { baseUrl, apiKey, model, fetchOnly, temperature, top_p, top_k, max_tokens } = body

    console.log('Save config: body =', { baseUrl: baseUrl?.slice(0, 20) + '...', apiKey: apiKey?.slice(0, 10) + '...', model, fetchOnly })

    if (!baseUrl || !apiKey) {
      console.error('Save config error: 缺少必要参数', { baseUrl: !!baseUrl, apiKey: !!apiKey })
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const normalizedUrl = baseUrl.replace(/\/$/, '')

    if (fetchOnly) {
      const models = await fetchModels(normalizedUrl, apiKey)
      return NextResponse.json({ models })
    }

    const db = await getDb()
    const safeUserId = safeInt(session.userId)
    
    // 先检查用户是否存在
    const userCheck = db.exec(`SELECT id, username FROM users WHERE id = ${safeUserId}`)
    console.log('Save config: userCheck =', userCheck)
    
    if (!userCheck || userCheck.length === 0 || !userCheck[0].values || userCheck[0].values.length === 0) {
      console.error('Save config error: 用户不存在', safeUserId)
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const configObj = {
      baseUrl: normalizedUrl,
      apiKey,
      model: model || 'gpt-4o',
      ...(temperature !== undefined && temperature !== null && { temperature: Number(temperature) }),
      ...(top_p !== undefined && top_p !== null && { top_p: Number(top_p) }),
      ...(top_k !== undefined && top_k !== null && { top_k: Number(top_k) }),
      ...(max_tokens !== undefined && max_tokens !== null && { max_tokens: Number(max_tokens) }),
    }
    const configJson = JSON.stringify(configObj)
    const escapedConfig = safeSqlString(configJson)
    
    console.log('Save config: configObj =', { ...configObj, apiKey: configObj.apiKey.slice(0, 10) + '...' })
    console.log('Save config: executing SQL with userId =', safeUserId)

    const sql = `UPDATE users SET api_config = '${escapedConfig}', updated_at = CURRENT_TIMESTAMP WHERE id = ${safeUserId}`
    console.log('Save config: SQL =', sql.slice(0, 100) + '...')
    
    db.run(sql)
    
    // 验证更新是否成功
    const verifyResult = db.exec(`SELECT api_config FROM users WHERE id = ${safeUserId}`)
    console.log('Save config: verifyResult =', verifyResult)
    
    if (!verifyResult || verifyResult.length === 0 || !verifyResult[0].values || !verifyResult[0].values[0][0]) {
      console.error('Save config error: 更新后验证失败')
      return NextResponse.json({ error: '保存失败，无法验证' }, { status: 500 })
    }
    
    const savedConfig = verifyResult[0].values[0][0] as string
    console.log('Save config: savedConfig exists =', !!savedConfig)
    
    saveDb()
    console.log('Save config: saveDb() called successfully')

    return NextResponse.json({ success: true, message: '配置已保存' })
  } catch (error) {
    console.error('Save config error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存配置失败' },
      { status: 500 }
    )
  }
}
