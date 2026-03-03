import { NextRequest, NextResponse } from 'next/server'
import { getSession, createSession } from '@/lib/auth/session'
import { getDb, saveDb } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const db = await getDb()
    
    // 完成onboarding
    db.run(`
      UPDATE users 
      SET needs_onboarding = FALSE,
          onboarding_step = 'complete',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${session.userId}
    `)

    saveDb()

    // 创建新的 session token（不包含 onboarding）
    const newToken = await createSession(session.userId, false)
    
    // 创建响应并设置新的 session cookie
    const response = NextResponse.json({ success: true })
    response.cookies.set('session', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Complete onboarding error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}