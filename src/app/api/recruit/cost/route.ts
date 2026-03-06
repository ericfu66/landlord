import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserRecruitCount, incrementRecruitCountAndDeductCost } from '@/lib/auth/repo'

// 计算招募费用：第一次500，每次+100
function calculateRecruitCost(recruitCount: number): number {
  return 500 + recruitCount * 100
}

// GET: 获取当前招募费用
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const recruitCount = await getUserRecruitCount(session.userId)
    const currentCost = calculateRecruitCost(recruitCount)

    return NextResponse.json({ 
      recruitCount,
      currentCost,
      nextCost: calculateRecruitCost(recruitCount + 1)
    })
  } catch (error) {
    console.error('Get recruit cost error:', error)
    return NextResponse.json({ error: '获取招募费用失败' }, { status: 500 })
  }
}

// POST: 扣除招募费用
export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const recruitCount = await getUserRecruitCount(session.userId)
    const cost = calculateRecruitCost(recruitCount)

    const result = await incrementRecruitCountAndDeductCost(session.userId, cost)
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error, 
        code: 'INSUFFICIENT_FUNDS',
        required: cost,
        currentCount: recruitCount
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      cost,
      newRecruitCount: result.newCount,
      nextCost: calculateRecruitCost(result.newCount)
    })
  } catch (error) {
    console.error('Deduct recruit cost error:', error)
    return NextResponse.json({ error: '扣除招募费用失败' }, { status: 500 })
  }
}
