import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserTalents, getTalentInfos, TALENTS } from '@/lib/services/talent-service'
import { getLevelInfo } from '@/lib/services/task-service'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const [talentInfos, levelInfo] = await Promise.all([
    getTalentInfos(session.userId),
    getLevelInfo(session.userId)
  ])

  return NextResponse.json({
    talents: talentInfos,
    talentDefs: TALENTS,
    talentPoints: levelInfo.talentPoints
  })
}
