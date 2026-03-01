import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { 
  getSavesByUser, 
  createSave, 
  updateSave, 
  deleteSave, 
  loadSave,
  canCreateSave 
} from '@/lib/services/save-service'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const saves = await getSavesByUser(session.userId)
    const canCreate = await canCreateSave(session.userId)

    return NextResponse.json({ saves, canCreate })
  } catch (error) {
    console.error('Get saves error:', error)
    return NextResponse.json({ error: '获取存档失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { action, saveId, saveName, gameData } = body

    switch (action) {
      case 'create': {
        if (!saveName || !gameData) {
          return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
        }

        const canCreate = await canCreateSave(session.userId)
        if (!canCreate) {
          return NextResponse.json({ error: '存档槽已满（最多5个）' }, { status: 400 })
        }

        const save = await createSave(session.userId, saveName, gameData)
        if (!save) {
          return NextResponse.json({ error: '创建存档失败' }, { status: 500 })
        }

        return NextResponse.json({ save })
      }

      case 'update': {
        if (!saveId || !gameData) {
          return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
        }

        const success = await updateSave(saveId, session.userId, gameData)
        if (!success) {
          return NextResponse.json({ error: '更新存档失败' }, { status: 400 })
        }

        return NextResponse.json({ success: true })
      }

      case 'load': {
        if (!saveId) {
          return NextResponse.json({ error: '缺少存档ID' }, { status: 400 })
        }

        const data = await loadSave(saveId, session.userId)
        if (!data) {
          return NextResponse.json({ error: '加载存档失败' }, { status: 400 })
        }

        return NextResponse.json({ gameData: data })
      }

      case 'delete': {
        if (!saveId) {
          return NextResponse.json({ error: '缺少存档ID' }, { status: 400 })
        }

        const success = await deleteSave(saveId, session.userId)
        if (!success) {
          return NextResponse.json({ error: '删除存档失败' }, { status: 400 })
        }

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 })
    }
  } catch (error) {
    console.error('Save action error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}