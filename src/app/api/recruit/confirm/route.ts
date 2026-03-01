import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDb, saveDb } from '@/lib/db'
import { createCharacter } from '@/lib/services/recruit-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { character, roomId, portraitUrl } = body

    if (!character) {
      return NextResponse.json({ error: '缺少角色数据' }, { status: 400 })
    }

    const db = await getDb()
    
    let saveResult = db.exec('SELECT id FROM saves WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1', [session.userId])
    
    let saveId: number
    
    if (saveResult.length === 0 || saveResult[0].values.length === 0) {
      db.run(
        'INSERT INTO saves (user_id, save_name, game_data) VALUES (?, ?, ?)',
        [session.userId, '自动存档', JSON.stringify({})]
      )
      saveDb()
      
      saveResult = db.exec('SELECT id FROM saves WHERE user_id = ? ORDER BY id DESC LIMIT 1', [session.userId])
      saveId = saveResult[0].values[0][0] as number
    } else {
      saveId = saveResult[0].values[0][0] as number
    }

    const newCharacter = await createCharacter(saveId, character, roomId)

    if (!newCharacter) {
      return NextResponse.json({ error: '角色已存在或创建失败' }, { status: 400 })
    }

    if (portraitUrl) {
      const { updateCharacterPortrait } = await import('@/lib/services/recruit-service')
      await updateCharacterPortrait(newCharacter.name, portraitUrl)
    }

    return NextResponse.json({ success: true, character: newCharacter })
  } catch (error) {
    console.error('Confirm recruit error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '招募失败' },
      { status: 500 }
    )
  }
}