import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAllUsers, banUser, unbanUser } from '@/lib/services/admin-service'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const users = await getAllUsers()
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ error: '获取用户失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const { action, userId } = body

    switch (action) {
      case 'ban': {
        const success = await banUser(userId)
        if (!success) {
          return NextResponse.json({ error: '无法封禁此用户' }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      case 'unban': {
        const success = await unbanUser(userId)
        if (!success) {
          return NextResponse.json({ error: '解封失败' }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 })
    }
  } catch (error) {
    console.error('Admin action error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}