import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/auth/repo'
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
    
    if (username.length < 2 || username.length > 20) {
      return NextResponse.json(
        { error: '用户名长度需要在2-20个字符之间' },
        { status: 400 }
      )
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少6个字符' },
        { status: 400 }
      )
    }
    
    const user = await createUser(username, password)
    
    if (!user) {
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 400 }
      )
    }
    
    await setSession({
      userId: user.id,
      username: user.username,
      role: user.role
    })
    
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: '注册失败，请重试' },
      { status: 500 }
    )
  }
}