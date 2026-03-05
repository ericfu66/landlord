import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { updateTaskProgress } from '@/lib/services/task-service'
import type { ConditionType } from '@/lib/services/task-service'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { condition_type, target, amount } = await request.json()

  if (!condition_type) {
    return NextResponse.json({ error: '缺少 condition_type' }, { status: 400 })
  }

  const completed = await updateTaskProgress(
    session.userId,
    condition_type as ConditionType,
    target,
    amount
  )

  return NextResponse.json({ completed })
}
