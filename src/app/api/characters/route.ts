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

    return NextResponse.json({ 
      characters: characters.map(char => ({
        name: char.name,
        template: char.template,
        portraitUrl: char.portraitUrl,
        favorability: char.favorability,
        obedience: char.obedience,
        corruption: char.corruption,
        rent: char.rent,
        mood: char.mood,
        roomId: char.roomId
      }))
    })
  } catch (error) {
    console.error('Get characters error:', error)
    return NextResponse.json({ error: '获取角色失败' }, { status: 500 })
  }
}
