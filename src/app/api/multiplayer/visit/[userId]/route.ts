import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getRemoteBuilding, getRemoteCharacters, getRemoteCharacter } from '@/lib/services/multiplayer-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const hostUserId = parseInt(params.userId)
    if (isNaN(hostUserId)) {
      return NextResponse.json({ error: '无效的用户ID' }, { status: 400 })
    }
    
    // 获取建筑信息
    const building = await getRemoteBuilding(hostUserId, session.userId)
    if (!building) {
      return NextResponse.json({ error: '该用户不允许访问' }, { status: 403 })
    }
    
    // 获取角色信息
    const characters = await getRemoteCharacters(hostUserId)
    
    return NextResponse.json({ building, characters })
  } catch (error) {
    console.error('Get remote building error:', error)
    return NextResponse.json({ error: '获取建筑信息失败' }, { status: 500 })
  }
}
