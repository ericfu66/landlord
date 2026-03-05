import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { allocateTalentPoint } from '@/lib/services/talent-service'
import type { TalentId } from '@/lib/services/talent-service'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { talent_id } = await request.json()

  if (!talent_id) {
    return NextResponse.json({ error: '缺少 talent_id' }, { status: 400 })
  }

  const result = await allocateTalentPoint(session.userId, talent_id as TalentId)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
