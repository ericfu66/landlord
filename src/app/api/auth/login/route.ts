import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth/repo'
import { setSession } from '@/lib/auth/session'

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
    
    await setSession({
      userId: result.id,
      username: result.username,
      role: result.role
    })
    
    return NextResponse.json({ user: result })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: '登录失败，请重试' },
      { status: 500 }
    )
  }
}