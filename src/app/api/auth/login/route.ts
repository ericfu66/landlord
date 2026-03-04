import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth/repo'
import { setSession } from '@/lib/auth/session'
import { getDb, safeInt } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body
    
    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      )
    }
    
    const result = await authenticateUser(username, password)
    
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }
    
    // 查询用户的 onboarding 状态
    const db = await getDb()
    const safeUserId = safeInt(result.id)
    const userData = db.exec(`
      SELECT needs_onboarding, role 
      FROM users 
      WHERE id = ${safeUserId}
    `)
    
    let needsOnboarding = false
    if (userData && userData[0]?.values?.length > 0) {
      needsOnboarding = userData[0].values[0][0] === 1
      const role = userData[0].values[0][1] as string
      // 管理员不需要 onboarding
      if (role === 'admin') {
        needsOnboarding = false
      }
    }
    
    await setSession({
      userId: result.id,
      username: result.username,
      role: result.role,
      needsOnboarding
    })
    
    return NextResponse.json({ user: result, needsOnboarding })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: '登录失败，请重试' },
      { status: 500 }
    )
  }
}