import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { 
  generateDiaryWithAI, 
  getDiaryByDate,
  deleteOldestDiaries 
} from '@/lib/services/diary-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const body = await request.json()
    const { type, characterName, date } = body
    
    if (!characterName) {
      return NextResponse.json({ error: '缺少角色名称' }, { status: 400 })
    }
    
    if (!type || (type !== 'ask' && type !== 'peek')) {
      return NextResponse.json({ error: '无效的类型，只能是 ask 或 peek' }, { status: 400 })
    }
    
    // 使用指定日期或当天日期
    const targetDate = date || new Date().toISOString().split('T')[0]
    
    // 检查当天是否已有日记
    const existingDiary = await getDiaryByDate(characterName, session.userId, targetDate)
    if (existingDiary) {
      return NextResponse.json({ 
        diary: existingDiary,
        message: type === 'ask' ? '角色今天已经写过日记了' : '发现了角色今天的日记',
        isExisting: true
      })
    }
    
    // 获取用户API配置
    const user = await getUserById(session.userId)
    if (!user?.api_config) {
      return NextResponse.json({ error: '请先配置AI API' }, { status: 400 })
    }
    
    const apiConfig = JSON.parse(user.api_config)
    const isPeeked = type === 'peek'
    
    // 生成日记
    const diary = await generateDiaryWithAI(
      characterName,
      session.userId,
      apiConfig,
      targetDate,
      isPeeked
    )
    
    if (!diary) {
      return NextResponse.json({ error: '生成日记失败' }, { status: 500 })
    }
    
    // 删除旧日记，只保留最近5篇
    await deleteOldestDiaries(characterName, session.userId, 5)
    
    return NextResponse.json({ 
      diary,
      message: type === 'ask' ? '角色写下了今天的日记' : '你偷偷看到了角色的日记',
      isExisting: false
    })
  } catch (error) {
    console.error('Generate diary error:', error)
    return NextResponse.json({ error: '生成日记失败' }, { status: 500 })
  }
}
