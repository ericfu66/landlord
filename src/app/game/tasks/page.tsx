'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle, Clock } from 'lucide-react'

interface Task {
  id: number
  title: string
  description: string
  condition_type: string
  condition_target: string | null
  condition_count: number
  condition_progress: number
  gold_reward: number
  xp_reward: number
  status: 'active' | 'completed' | 'expired'
  created_date: string
}

interface LevelInfo {
  level: number
  xp: number
  xpToNext: number
  talentPoints: number
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      if (data.tasks) setTasks(data.tasks)
      if (data.levelInfo) setLevelInfo(data.levelInfo)
      if (data.allTasks) setAllTasks(data.allTasks)
    } catch (e) {
      console.error('Failed to fetch tasks:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTasks()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const interval = setInterval(fetchTasks, 15000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const completedTasks = allTasks.filter(t => t.status === 'completed')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/game" className="text-gray-400 hover:text-gray-200 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold">每日任务</h1>
        </div>

        {/* Level & XP Bar */}
        {levelInfo && (
          <div className="bg-gray-900 rounded-xl p-4 mb-6 border border-gray-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">等级 {levelInfo.level}</span>
              <span className="text-sm text-gray-400">{levelInfo.xp} / {levelInfo.xpToNext} XP</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (levelInfo.xp / levelInfo.xpToNext) * 100)}%` }}
              />
            </div>
            {levelInfo.talentPoints > 0 && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-amber-400">✨ 有 {levelInfo.talentPoints} 个天赋点可分配</span>
                <Link href="/game/talents" className="text-xs text-amber-400 hover:text-amber-300 underline">
                  去分配
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Active Tasks */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">进行中</h2>
          {tasks.length === 0 ? (
            <div className="bg-gray-900 rounded-xl p-6 text-center text-gray-500 border border-gray-800">
              <Clock size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">今日任务将在推进到新的一天后生成</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">已完成</h2>
            <div className="space-y-3">
              {completedTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TaskCard({ task }: { task: Task }) {
  const isCompleted = task.status === 'completed'
  const progress = Math.min(task.condition_progress, task.condition_count)
  const pct = task.condition_count > 0 ? (progress / task.condition_count) * 100 : 0

  return (
    <div className={`bg-gray-900 rounded-xl p-4 border transition-all ${
      isCompleted ? 'border-emerald-800 opacity-70' : 'border-gray-800'
    }`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {isCompleted
            ? <CheckCircle2 size={18} className="text-emerald-500" />
            : <Circle size={18} className="text-gray-600" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`font-medium text-sm ${isCompleted ? 'line-through text-gray-500' : 'text-gray-100'}`}>
              {task.title}
            </p>
            <div className="flex gap-2 shrink-0 text-xs">
              <span className="text-amber-400">+{task.gold_reward}金</span>
              <span className="text-violet-400">+{task.xp_reward}XP</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>

          {/* Progress bar */}
          {!isCompleted && task.condition_count > 1 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{progress} / {task.condition_count}</span>
                <span>{Math.round(pct)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
