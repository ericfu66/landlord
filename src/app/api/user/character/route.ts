import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDb, saveDb } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { name, age, appearance, personality, background } = body

    // 验证必填字段
    if (!name || !age || !appearance || !personality) {
      return NextResponse.json({ error: '请填写所有必填字段' }, { status: 400 })
    }

    const db = await getDb()
    
    // 更新用户角色信息
    db.run(`
      UPDATE users 
      SET avatar_name = '${name.replace(/'/g, "''")}',
          avatar_age = ${parseInt(age)},
          avatar_appearance = '${appearance.replace(/'/g, "''")}',
          avatar_personality = '${personality.replace(/'/g, "''")}',
          avatar_background = '${(background || '').replace(/'/g, "''")}',
          onboarding_step = 'apikey',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${session.userId}
    `)

    saveDb()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update character error:', error)
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }
}