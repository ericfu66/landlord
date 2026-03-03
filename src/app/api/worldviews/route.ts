import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { 
  getUserWorldViews, 
  createWorldView, 
  generateWorldViewWithAI 
} from '@/lib/services/worldview-service'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const worldviews = await getUserWorldViews(session.userId)
    return NextResponse.json({ worldviews })
  } catch (error) {
    console.error('Get worldviews error:', error)
    return NextResponse.json({ error: '获取世界观失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const body = await request.json()
    const { name, description, content, generateAI, theme } = body
    
    if (generateAI) {
      const user = await getUserById(session.userId)
      if (!user?.api_config) {
        return NextResponse.json({ error: '请先配置AI API' }, { status: 400 })
      }
      
      const apiConfig = JSON.parse(user.api_config)
      const worldview = await generateWorldViewWithAI(session.userId, theme, apiConfig)
      
      if (!worldview) {
        return NextResponse.json({ error: 'AI生成失败' }, { status: 500 })
      }
      
      return NextResponse.json({ worldview })
    }
    
    if (!name || !content) {
      return NextResponse.json({ error: '名称和内容不能为空' }, { status: 400 })
    }
    
    const worldview = await createWorldView(session.userId, {
      name,
      description: description || '',
      content
    })
    
    return NextResponse.json({ worldview })
  } catch (error) {
    console.error('Create worldview error:', error)
    return NextResponse.json({ error: '创建世界观失败' }, { status: 500 })
  }
}
