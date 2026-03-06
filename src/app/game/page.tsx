'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import Link from 'next/link'
import { Clock, RefreshCw } from 'lucide-react'
import { useGameState } from './GameStateContext'

// 动态导入弹窗组件，减少首屏加载
const DailyNewsPopup = lazy(() => import('@/components/game/DailyNewsPopup'))

interface Stats {
  currency: number
  energy: number
  tenantCount: number
  floors: number
  weather?: string
}

interface Task {
  id: string
  title: string
  href: string
}

const menuItems = [
  { id: 'characters', icon: '👥', label: '我的租客', subtitle: '查看互动', href: '/game/characters', emoji: '🏠' },
  { id: 'recruit', icon: '✨', label: '招募租客', subtitle: 'AI生成角色', href: '/game/recruit', emoji: '🌟' },
  { id: 'building', icon: '🏢', label: '基建管理', subtitle: '建造房间', href: '/game/building', emoji: '🔨' },
  { id: 'work', icon: '💼', label: '打工赚钱', subtitle: '获取收入', href: '/game/work', emoji: '💰' },
  { id: 'presets', icon: '🧩', label: '互动预设', subtitle: '编辑对话规则', href: '/game/presets', emoji: '📝' },
  { id: 'news', icon: '📰', label: '每日新闻', subtitle: '查看新闻', href: '/game/news', emoji: '📰' },
  { id: 'tasks', icon: '📋', label: '每日任务', subtitle: '完成获取奖励', href: '/game/tasks', emoji: '🎯' },
  { id: 'talents', icon: '⭐', label: '天赋树', subtitle: '分配天赋点', href: '/game/talents', emoji: '✨' },
  { id: 'saves', icon: '💾', label: '存档管理', subtitle: '保存进度', href: '/game/saves', emoji: '📦' },
]

const tasks: Task[] = [
  { id: '1', title: '配置AI API设置', href: '/game/settings' },
  { id: '2', title: '招募第一位租客', href: '/game/recruit' },
  { id: '3', title: '设置互动预设模板', href: '/game/presets' },
  { id: '4', title: '建造或装修房间', href: '/game/building' },
]

export default function GamePage() {
  const { refreshGameState } = useGameState()
  const [stats, setStats] = useState<Stats>({
    currency: 1000,
    energy: 3,
    tenantCount: 0,
    floors: 1
  })

  const [mounted, setMounted] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchGameState()
  }, [])

  const handleAdvanceTime = async () => {
    if (advancing) return

    setAdvancing(true)
    try {
      const res = await fetch('/api/game/advance', { method: 'POST' })
      const data = await res.json()

        if (res.ok) {
        // Use state from advance response directly if available
        if (data.state) {
          setStats({
            currency: data.state.currency,
            energy: data.state.energy,
            tenantCount: 0,
            floors: data.state.totalFloors,
            weather: data.state.weather
          })
        }
        await refreshGameState()
        
        // 如果有新新闻，显示提示
        if (data.hasNews) {
          setHasNewNews(true)
          alert(`时间推进成功！\n今日新闻：${data.newsTitle || '已生成'}`)
        } else {
          alert(data.message || '时间推进成功！体力已恢复')
        }
      } else {
        if (data.error?.includes('存档')) {
          alert('请先在存档管理中创建或加载存档')
        } else {
          alert(data.error || '时间推进失败')
        }
      }
    } catch (error) {
      console.error('Advance time error:', error)
      alert('时间推进失败')
    } finally {
      setAdvancing(false)
    }
  }

  const fetchGameState = async () => {
    try {
      const res = await fetch('/api/game/state')
      const data = await res.json()
      if (data.state) {
        setStats({
          currency: data.state.currency,
          energy: data.state.energy,
          tenantCount: 0,
          floors: data.state.totalFloors,
          weather: data.state.weather
        })
      } else if (data.message === '暂无活跃存档') {
        // 没有存档时显示提示
        setStats({
          currency: 0,
          energy: 0,
          tenantCount: 0,
          floors: 1,
          weather: '晴'
        })
      }
    } catch (error) {
      console.error('Fetch game state error:', error)
    }
  }

  const [hasNewNews, setHasNewNews] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchGameState()
    checkForNewNews()
  }, [])

  const checkForNewNews = async () => {
    try {
      const res = await fetch('/api/news')
      const data = await res.json()
      if (data.news && !data.news.isRead) {
        setHasNewNews(true)
      }
    } catch (error) {
      console.error('Check news error:', error)
    }
  }

  return (
    <>
      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      {/* Daily News Popup - 懒加载 */}
      <Suspense fallback={null}>
        <DailyNewsPopup />
      </Suspense>

      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8 px-2 sm:px-0">
        {/* Hero Section */}
        <div className={`glass-card p-4 sm:p-6 md:p-10 text-center relative overflow-hidden transition-all duration-700 ${mounted ? 'fade-in-up' : 'opacity-0'}`}>
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-20 sm:w-32 h-20 sm:h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-gradient-to-tl from-amber-600/10 to-transparent rounded-full blur-3xl" />

          <div className="relative z-10">
            {/* Decorative line */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-amber-500/50" />
              <span className="text-amber-500/60 text-sm sm:text-lg">◆</span>
              <div className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-amber-500/50" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 tracking-wide" style={{ fontFamily: 'Playfair Display, serif' }}>
              <span className="gradient-text">房东模拟器</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-gray-300/80 mb-4 sm:mb-8 max-w-md mx-auto leading-relaxed px-2">
              欢迎来到房东模拟器，开始你的房东生涯！
            </p>

            {/* Decorative line */}
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-amber-500/50" />
              <span className="text-amber-500/60 text-sm sm:text-lg">◆</span>
              <div className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-amber-500/50" />
            </div>
          </div>
        </div>

        {/* Menu Grid - Responsive: 2 cols on mobile, 3 on tablet, 5 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          {menuItems.map((item, index) => (
            <Link
              key={item.id}
              href={item.href}
              className={`glass-card p-3 sm:p-5 flex flex-col items-center justify-center text-center group glow-border transition-all duration-500 ${mounted ? 'fade-in-up' : 'opacity-0'}`}
              style={{ animationDelay: `${(index + 1) * 100}ms` }}
            >
              {/* Icon container with floating animation */}
              <div className="relative mb-2 sm:mb-3">
                <span className="text-2xl sm:text-4xl block float" style={{ animationDelay: `${index * 0.5}s` }}>
                  {item.emoji}
                </span>
                {/* Subtle glow behind icon */}
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {/* News notification badge */}
                {item.id === 'news' && hasNewNews && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>

              <div className="font-semibold text-gray-100 group-hover:text-amber-400 transition-colors duration-300 text-sm sm:text-base">
                {item.label}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 group-hover:text-amber-300/70 transition-colors duration-300">
                {item.subtitle}
              </div>
            </Link>
          ))}
        </div>

        {/* Stats & Tasks Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
          {/* Stats Panel */}
          <div className={`glass-card p-4 sm:p-6 transition-all duration-700 delay-200 ${mounted ? 'fade-in-up' : 'opacity-0'}`}>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                <span className="text-lg sm:text-xl">📊</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                <span className="gradient-text">当前状态</span>
              </h2>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="stat-bar flex justify-between items-center group py-2 sm:py-3">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors text-sm sm:text-base">货币</span>
                <span className="font-semibold text-amber-400 flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                  <span className="text-base sm:text-lg">💰</span>
                  <span>{stats.currency.toLocaleString()}</span>
                </span>
              </div>

              <div className="stat-bar flex justify-between items-center group py-2 sm:py-3">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors text-sm sm:text-base">体力</span>
                <span className="font-semibold text-amber-400 flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                  <span className="text-base sm:text-lg">⚡</span>
                  <span>{stats.energy}/3</span>
                </span>
              </div>

              <div className="stat-bar flex justify-between items-center group py-2 sm:py-3">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors text-sm sm:text-base">租客</span>
                <span className="font-semibold text-amber-400 flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                  <span className="text-base sm:text-lg">👥</span>
                  <span>{stats.tenantCount}</span>
                </span>
              </div>

              <div className="stat-bar flex justify-between items-center group py-2 sm:py-3">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors text-sm sm:text-base">楼层</span>
                <span className="font-semibold text-amber-400 flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                  <span className="text-base sm:text-lg">🏢</span>
                  <span>{stats.floors}</span>
                </span>
              </div>

              {stats.weather && (
                <div className="stat-bar flex justify-between items-center group py-2 sm:py-3">
                  <span className="text-gray-400 group-hover:text-gray-300 transition-colors text-sm sm:text-base">天气</span>
                  <span className="font-semibold text-amber-400 flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                    <span className="text-base sm:text-lg">🌤️</span>
                    <span>{stats.weather}</span>
                  </span>
                </div>
              )}

              {/* 推进时间按钮 */}
              <button
                onClick={handleAdvanceTime}
                disabled={advancing}
                className="w-full mt-3 sm:mt-4 py-2 sm:py-2.5 px-3 sm:px-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base touch-target"
              >
                {advancing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>推进中...</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span className="hidden sm:inline">推进到下一天（恢复体力）</span>
                    <span className="sm:hidden">推进到下一天</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tasks Panel */}
          <div className={`glass-card p-4 sm:p-6 transition-all duration-700 delay-300 ${mounted ? 'fade-in-up' : 'opacity-0'}`}>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                <span className="text-lg sm:text-xl">📋</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                <span className="gradient-text">待办事项</span>
              </h2>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {tasks.map((task, index) => (
                <Link
                  key={task.id}
                  href={task.href}
                  className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-xl hover:bg-amber-500/10 transition-all duration-300 group border border-transparent hover:border-amber-500/20"
                >
                  {/* Task number indicator */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-600/30 to-amber-700/20 flex items-center justify-center text-sm font-semibold text-amber-400 group-hover:from-amber-500/40 group-hover:to-amber-600/30 transition-all flex-shrink-0">
                    {index + 1}
                  </div>

                  <span className="text-gray-300 group-hover:text-amber-100 transition-colors flex-1 text-sm sm:text-base">
                    {task.title}
                  </span>

                  <span className="text-amber-500/50 group-hover:text-amber-400 transition-colors transform group-hover:translate-x-1 text-lg">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative footer */}
        <div className={`text-center py-4 sm:py-6 transition-all duration-700 delay-500 ${mounted ? 'fade-in-up' : 'opacity-0'}`}>
          <p className="text-gray-500 text-xs sm:text-sm">
            <span className="text-amber-500/40">◆</span>
            <span className="mx-2 sm:mx-3">做一个有情怀的房东</span>
            <span className="text-amber-500/40">◆</span>
          </p>
        </div>
      </div>
    </>
  )
}
