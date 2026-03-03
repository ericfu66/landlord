import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { uploadToWorkshop } from '@/lib/services/workshop-service'
import { WorkshopItemType } from '@/types/workshop'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const body = await request.json()
    const { type, originalId, name, description, isPublic } = body
    
    if (!type || !originalId || !name) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }
    
    if (!['character', 'worldview'].includes(type)) {
      return NextResponse.json({ error: '无效的类型' }, { status: 400 })
    }
    
    const item = await uploadToWorkshop(
      session.userId,
      type as WorkshopItemType,
      originalId,
      name,
      description || '',
      isPublic !== false
    )
    
    if (!item) {
      return NextResponse.json({ error: '上传失败，原始项目不存在' }, { status: 404 })
    }
    
    return NextResponse.json({ item })
  } catch (error) {
    console.error('Upload to workshop error:', error)
    return NextResponse.json({ error: '上传到工坊失败' }, { status: 500 })
  }
}
