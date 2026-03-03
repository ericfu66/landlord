import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { generateJobs, startJob, quitJob, getCurrentJob } from '@/lib/services/job-service'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const jobs = await generateJobs(session.userId)
    const currentJob = await getCurrentJob(session.userId)

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

    switch (action) {
      case 'start':
        if (!job) {
          return NextResponse.json({ error: '缺少工作信息' }, { status: 400 })
        }
        await startJob(session.userId, job)
        return NextResponse.json({ success: true })

      case 'quit':
        await quitJob(session.userId)
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 })
    }
  } catch (error) {
    console.error('Job action error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
