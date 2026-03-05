import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getActiveTasks, getLevelInfo, getAllTasks } from '@/lib/services/task-service'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const [tasks, levelInfo, completedTasks] = await Promise.all([
    getActiveTasks(session.userId),
    getLevelInfo(session.userId),
    getAllTasks(session.userId)
  ])

  return NextResponse.json({ tasks, levelInfo, allTasks: completedTasks })
}
