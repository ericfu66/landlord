import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getVisitableUsers } from '@/lib/services/multiplayer-service'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const users = await getVisitableUsers()
    // 过滤掉自己
    const filteredUsers = users.filter(u => u.userId !== session.userId)
    
    return NextResponse.json({ users: filteredUsers })
  } catch (error) {
    console.error('Get visitable users error:', error)
    return NextResponse.json({ error: '获取可访问用户失败' }, { status: 500 })
  }
}
