import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getPublicWorkshopItems } from '@/lib/services/workshop-service'
import { WorkshopItemType } from '@/types/workshop'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as WorkshopItemType | undefined
    
    const items = await getPublicWorkshopItems(type)
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Get workshop items error:', error)
    return NextResponse.json({ error: '获取工坊项目失败' }, { status: 500 })
  }
}
