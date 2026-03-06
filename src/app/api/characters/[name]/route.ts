import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDb } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { name } = await params
    const characterName = decodeURIComponent(name)

    const db = await getDb()
    const result = db.exec(
      `SELECT name, template, portrait_url, favorability, obedience, corruption, rent, mood
       FROM characters WHERE name = ?`,
      [characterName]
    )

    if (result.length === 0 || result[0].values.length === 0) {
      return NextResponse.json({ error: '角色不存在' }, { status: 404 })
    }

    const row = result[0].values[0]
    const character = {
      name: row[0] as string,
      template: JSON.parse(row[1] as string),
      portraitUrl: row[2] as string | undefined,
      favorability: row[3] as number,
      obedience: row[4] as number,
      corruption: row[5] as number,
      rent: row[6] as number,
      mood: row[7] as string
    }

    return NextResponse.json({ character })
  } catch (error) {
    console.error('Get character error:', error)
    return NextResponse.json({ error: '获取角色失败' }, { status: 500 })
  }
}
