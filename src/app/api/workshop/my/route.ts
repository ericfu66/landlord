import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getMyUploads, deleteWorkshopItem } from '@/lib/services/workshop-service'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const items = await getMyUploads(session.userId)
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Get my uploads error:', error)
    return NextResponse.json({ error: '获取我的上传失败' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')
    
    if (!itemId) {
      return NextResponse.json({ error: '缺少项目ID' }, { status: 400 })
    }
    
    await deleteWorkshopItem(parseInt(itemId), session.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete workshop item error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
