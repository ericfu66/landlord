import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getCharacterDiaries, getDiaryByDate } from '@/lib/services/diary-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const characterName = searchParams.get('character')
    const date = searchParams.get('date')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    if (!characterName) {
      return NextResponse.json({ error: '缺少角色名称' }, { status: 400 })
    }
    
    // 如果指定了日期，返回该日期的日记
    if (date) {
      const diary = await getDiaryByDate(characterName, session.userId, date)
      return NextResponse.json({ diary })
    }
    
    // 否则返回日记列表
    const diaries = await getCharacterDiaries(characterName, session.userId, limit)
    return NextResponse.json({ diaries })
  } catch (error) {
    console.error('Get diaries error:', error)
    return NextResponse.json({ error: '获取日记失败' }, { status: 500 })
  }
}
