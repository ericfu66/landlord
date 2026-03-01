import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAdminStats } from '@/lib/services/admin-service'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const stats = await getAdminStats()
    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 })
  }
}