'use client'

import { useState, useEffect } from 'react'
import { useGameState } from '../GameStateContext'
import { Briefcase, AlertCircle } from 'lucide-react'

interface Job {
  name: string
  salary: number
  description: string
}

interface CurrentJob {
  name: string
  salary: number
  daysWorked: number
}

export default function WorkPage() {
  const { refreshGameState } = useGameState()
  const [jobs, setJobs] = useState<Job[]>([])
  const [currentJob, setCurrentJob] = useState<CurrentJob | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      setJobs(data.jobs || [])
      setCurrentJob(data.currentJob || null)
    } catch (error) {
      console.error('Fetch jobs error:', error)
    } finally {
      setLoading(false)
    }
  }

  const startJob = async (job: Job) => {
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', job })
      })

      const data = await res.json()

      if (res.ok) {
        setCurrentJob({ ...job, daysWorked: 0 })
        await refreshGameState()
        alert(`开始工作：${job.name}`)
      } else {
        alert(data.error || '操作失败')
      }
    } catch (error) {
      console.error('Start job error:', error)
    }
  }

  const quitJob = async () => {
    if (!confirm('确定要辞职吗？')) return

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quit' })
      })

      if (res.ok) {
        setCurrentJob(null)
        await refreshGameState()
        alert('已辞职')
      }
    } catch (error) {
      console.error('Quit job error:', error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-0">
      <div className="glass-card p-4 sm:p-6 mb-4 sm:mb-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center">
            <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">打工赚钱</h1>
        </div>

        {currentJob ? (
          <div className="mb-4 sm:mb-6">
            <div className="glass-card p-3 sm:p-4 border border-green-500/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-2">
                <h3 className="font-bold text-green-400 text-sm sm:text-base">当前工作：{currentJob.name}</h3>
                <button
                  onClick={quitJob}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-xs sm:text-sm touch-target-sm self-start sm:self-auto"
                >
                  辞职
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-400">日薪：</span>
                  <span className="text-yellow-400 font-medium">💰 {currentJob.salary}</span>
                </div>
                <div>
                  <span className="text-gray-400">已工作：</span>
                  <span>{currentJob.daysWorked} 天</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                每日结算时自动获得工资，消耗1体力
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/5 rounded-lg text-center text-gray-400 text-sm">
            暂无工作，选择一份工作开始赚钱吧
          </div>
        )}

        <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">工作机会</h2>

        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <div className="animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-2" />
            加载中...
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {jobs.map((job, index) => (
              <div
                key={index}
                className="glass-card p-3 sm:p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm sm:text-base">{job.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{job.description}</p>
                  </div>
                  <div className="flex items-center justify-between sm:text-right gap-3">
                    <div className="text-yellow-400 font-medium text-sm">💰 {job.salary}/天</div>
                    {!currentJob && (
                      <button
                        onClick={() => startJob(job)}
                        className="px-3 py-1.5 bg-purple-600 text-white text-xs sm:text-sm rounded-lg hover:bg-purple-500 transition-colors touch-target-sm"
                      >
                        开始工作
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={fetchJobs}
          disabled={loading}
          className="w-full mt-3 sm:mt-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 text-sm touch-target"
        >
          {loading ? '刷新中...' : '刷新工作机会'}
        </button>
      </div>

      <div className="glass-card p-3 sm:p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold mb-1.5 text-sm sm:text-base">💡 打工说明</h3>
            <ul className="text-xs sm:text-sm text-gray-400 space-y-1">
              <li>• 每日结算时自动获得工资</li>
              <li>• 每天工作消耗1体力</li>
              <li>• 体力不足时仍可工作，但体力会变为0</li>
              <li>• 可以随时辞职</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
