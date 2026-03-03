import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { 
  collectGameData, 
  saveGameData, 
  exportGameData, 
  importGameData, 
  resetGameData,
  getCurrentGameState 
} from '@/lib/services/save-service'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const currentState = await getCurrentGameState(session.userId)

    return NextResponse.json({ 
      currentState,
      message: '游戏数据已存储在用户账户中，无需单独存档'
    })
  } catch (error) {
    console.error('Get saves error:', error)
    return NextResponse.json({ error: '获取游戏数据失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'save': {
        // 保存当前游戏数据
        const gameData = await collectGameData(session.userId)
        const success = await saveGameData(session.userId, gameData)
        
        if (!success) {
          return NextResponse.json({ error: '保存失败' }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true,
          message: '游戏已保存'
        })
      }

      case 'export': {
        // 导出游戏数据为 JSON
        const data = await exportGameData(session.userId)
        if (!data) {
          return NextResponse.json({ error: '导出失败' }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true,
          data,
          message: '游戏数据导出成功'
        })
      }

      case 'import': {
        // 导入游戏数据
        const { data } = body
        if (!data) {
          return NextResponse.json({ error: '缺少导入数据' }, { status: 400 })
        }

        const success = await importGameData(session.userId, data)
        if (!success) {
          return NextResponse.json({ error: '导入失败' }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true,
          message: '游戏数据导入成功'
        })
      }

      case 'reset': {
        // 重置游戏数据
        const success = await resetGameData(session.userId)
        if (!success) {
          return NextResponse.json({ error: '重置失败' }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true,
          message: '游戏数据已重置'
        })
      }

      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 })
    }
  } catch (error) {
    console.error('Save action error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
