import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDb } from '@/lib/db'

async function getCurrentSaveId(userId: number): Promise<number | null> {
  const db = await getDb()
  const result = db.exec(
    'SELECT id FROM saves WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
    [userId]
  )
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null
  }
  
  return result[0].values[0][0] as number
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const saveId = await getCurrentSaveId(session.userId)
    if (!saveId) {
      return NextResponse.json({ characters: [] })
    }

    const db = await getDb()
    const result = db.exec(
      `SELECT name, template, portrait_url, favorability, obedience, corruption, rent, mood, room_id
       FROM characters WHERE save_id = ?`,
      [saveId]
    )

    if (result.length === 0) {
      return NextResponse.json({ characters: [] })
    }

    const characters = result[0].values.map((row: unknown[]) => ({
      name: row[0] as string,
      template: JSON.parse(row[1] as string),
      portraitUrl: row[2] as string | undefined,
      favorability: row[3] as number,
      obedience: row[4] as number,
      corruption: row[5] as number,
      rent: row[6] as number,
      mood: row[7] as string,
      roomId: row[8] as number | undefined
    }))

    return NextResponse.json({ characters })
  } catch (error) {
    console.error('Get characters error:', error)
    return NextResponse.json({ error: '获取角色失败' }, { status: 500 })
  }
}