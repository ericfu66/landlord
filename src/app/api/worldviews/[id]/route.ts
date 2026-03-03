import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getWorldViewById, updateWorldView, deleteWorldView } from '@/lib/services/worldview-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const worldview = await getWorldViewById(parseInt(params.id), session.userId)
    if (!worldview) {
      return NextResponse.json({ error: '世界观不存在' }, { status: 404 })
    }
    
    return NextResponse.json({ worldview })
  } catch (error) {
    console.error('Get worldview error:', error)
    return NextResponse.json({ error: '获取世界观失败' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const body = await request.json()
    const worldview = await updateWorldView(parseInt(params.id), session.userId, body)
    
    if (!worldview) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }
    
    return NextResponse.json({ worldview })
  } catch (error) {
    console.error('Update worldview error:', error)
    return NextResponse.json({ error: '更新世界观失败' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const success = await deleteWorldView(parseInt(params.id), session.userId)
    
    if (!success) {
      return NextResponse.json({ error: '删除失败，可能正被角色使用' }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete worldview error:', error)
    return NextResponse.json({ error: '删除世界观失败' }, { status: 500 })
  }
}
