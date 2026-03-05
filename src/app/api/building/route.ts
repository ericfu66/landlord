import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { getRoomsByUser, createRoom, updateRoomType, deleteRoom, addNewFloor } from '@/lib/services/building-service'
import { calculateBuildCost, BUILD_COSTS } from '@/lib/services/building-service'
import { deductCurrency, getGameState, updateGameState } from '@/lib/services/economy-service'
import { getTalentModifiers } from '@/lib/services/talent-service'
import { updateTaskProgress } from '@/lib/services/task-service'

// 确保游戏状态存在，如果不存在则创建
async function ensureGameState(userId: number): Promise<boolean> {
  const gameState = await getGameState(userId)
  if (!gameState) {
    await updateGameState(userId, {
      currency: 1000,
      energy: 3,
      debtDays: 0,
      totalFloors: 1
    })
  }
  return true
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const rooms = await getRoomsByUser(session.userId)
    const gameState = await getGameState(session.userId)
    const roomMaxFloor = rooms.length > 0 ? Math.max(...rooms.map((r) => r.floor)) : 1
    const floors = Math.max(roomMaxFloor, gameState?.totalFloors ?? 1)

    return NextResponse.json({ rooms, floors })
  } catch (error) {
    console.error('Get rooms error:', error)
    return NextResponse.json({ error: '获取房间失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { action, floor, positionStart, positionEnd, roomType, description, name, roomId, isNewFloor } = body

    // 确保游戏状态存在
    await ensureGameState(session.userId)

    switch (action) {
      case 'create': {
        const cellCount = positionEnd - positionStart
        const cost = calculateBuildCost(roomType, cellCount, isNewFloor || false)

        // 应用天赋建造折扣
        const talentMods = await getTalentModifiers(session.userId)
        const discountedCurrency = Math.round(cost.currency * talentMods.buildCostDiscount)
        const discountedFloorCost = isNewFloor
          ? Math.round(5000 * (talentMods.floorCostDiscount - 1)) // 差额（负数，即减少的金额）
          : 0
        const finalCurrency = discountedCurrency + discountedFloorCost

        // 检查并扣除费用
        let gameState = await getGameState(session.userId)
        // 确保游戏状态存在（处理并发情况）
        if (!gameState) {
          await ensureGameState(session.userId)
          gameState = await getGameState(session.userId)
        }
        // 如果仍然没有游戏状态，返回错误
        if (!gameState) {
          return NextResponse.json({ error: '初始化游戏状态失败' }, { status: 500 })
        }

        if (gameState.currency < finalCurrency) {
          return NextResponse.json({ error: `货币不足，需要 ${finalCurrency} 货币` }, { status: 400 })
        }

        if (gameState.energy < cost.energy) {
          return NextResponse.json({ error: `体力不足，需要 ${cost.energy} 点体力` }, { status: 400 })
        }

        // 扣除货币和体力
        const deducted = await deductCurrency(session.userId, finalCurrency)
        if (!deducted) {
          return NextResponse.json({ error: `货币不足，需要 ${finalCurrency} 货币` }, { status: 400 })
        }

        await updateGameState(session.userId, { energy: gameState.energy - cost.energy })

        const room = await createRoom(session.userId, floor, positionStart, positionEnd, roomType, description, name)

        if (!room) {
          // 如果创建失败，退还费用
          await updateGameState(session.userId, { currency: gameState.currency, energy: gameState.energy })
          return NextResponse.json({ error: '房间位置无效或重叠' }, { status: 400 })
        }

        // 更新建造任务进度（匹配任意房间或指定类型）
        updateTaskProgress(session.userId, 'build_room', roomType).catch(() => {})
        // 更新消费任务进度
        if (finalCurrency > 0) {
          updateTaskProgress(session.userId, 'spend_currency', null, finalCurrency).catch(() => {})
        }

        return NextResponse.json({ room, cost })
      }

      case 'update': {
        await updateRoomType(roomId, roomType, description, name)
        return NextResponse.json({ success: true })
      }

      case 'delete': {
        const refund = await deleteRoom(roomId)
        return NextResponse.json({ success: true, refund })
      }

      case 'addFloor': {
        const floorCost = BUILD_COSTS.newFloor
        let gameState = await getGameState(session.userId)
        // 确保游戏状态存在
        if (!gameState) {
          await ensureGameState(session.userId)
          gameState = await getGameState(session.userId)
        }
        // 如果仍然没有游戏状态，返回错误
        if (!gameState) {
          return NextResponse.json({ error: '初始化游戏状态失败' }, { status: 500 })
        }

        if (gameState.currency < floorCost.currency) {
          return NextResponse.json({ error: `货币不足，需要 ${floorCost.currency} 货币来建造新楼层` }, { status: 400 })
        }

        if (gameState.energy < floorCost.energy) {
          return NextResponse.json({ error: `体力不足，需要 ${floorCost.energy} 点体力` }, { status: 400 })
        }

        // 扣除费用
        const deducted = await deductCurrency(session.userId, floorCost.currency)
        if (!deducted) {
          return NextResponse.json({ error: `货币不足，需要 ${floorCost.currency} 货币来建造新楼层` }, { status: 400 })
        }

        await updateGameState(session.userId, { energy: gameState.energy - floorCost.energy })

        const newFloorNum = await addNewFloor(session.userId)
        await updateGameState(session.userId, { totalFloors: newFloorNum })
        const cost = { currency: floorCost.currency, energy: floorCost.energy }

        // 更新消费任务进度
        updateTaskProgress(session.userId, 'spend_currency', null, floorCost.currency).catch(() => {})

        return NextResponse.json({ floor: newFloorNum, cost })
      }
      
      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 })
    }
  } catch (error) {
    console.error('Building action error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
