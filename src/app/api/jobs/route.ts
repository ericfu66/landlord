import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { generateJobs, startJob, quitJob, getCurrentJob } from '@/lib/services/job-service'

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
    
    const jobs = await generateJobs(session.userId)
    const currentJob = saveId ? await getCurrentJob(saveId) : null

    return NextResponse.json({ jobs, currentJob })
  } catch (error) {
    console.error('Get jobs error:', error)
    return NextResponse.json({ error: '获取工作失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { action, job } = body

    const saveId = await getCurrentSaveId(session.userId)
    if (!saveId) {
      return NextResponse.json({ error: '无存档' }, { status: 400 })
    }

    switch (action) {
      case 'start':
        if (!job) {
          return NextResponse.json({ error: '缺少工作信息' }, { status: 400 })
        }
        await startJob(saveId, job)
        return NextResponse.json({ success: true })

      case 'quit':
        await quitJob(saveId)
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 })
    }
  } catch (error) {
    console.error('Job action error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}