import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getCharactersByUser } from '@/lib/services/recruit-service'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const characters = await getCharactersByUser(session.userId)
    const participants = characters.map((item) => item.name)

    return NextResponse.json({ participants })
  } catch (error) {
    console.error('Group chat participants error:', error)
    return NextResponse.json({ error: '获取参与者失败' }, { status: 500 })
  }
}
