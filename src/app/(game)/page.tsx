'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Stats {
  currency: number
  energy: number
  tenantCount: number
  floors: number
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
  { id: 'saves', icon: '💾', label: '存档管理', subtitle: '保存进度', href: '/game/saves', emoji: '📦' },
]

const tasks: Task[] = [
  { id: '1', title: '配置AI API设置', href: '/game/settings' },
  { id: '2', title: '招募第一位租客', href: '/game/recruit' },
  { id: '3', title: '建造或装修房间', href: '/game/building' },
]

export default function GamePage() {
  const [stats, setStats] = useState<Stats>({
    currency: 1000,
    energy: 3,
    tenantCount: 0,
    floors: 1
  })

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className={`glass-card p-10 text-center relative overflow-hidden transition-all duration-700 ${mounted ? 'fade-in-up' : 'opacity-0'}`}>
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-amber-600/10 to-transparent rounded-full blur-3xl" />

          <div className="relative z-10">
            {/* Decorative line */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-500/50" />
              <span className="text-amber-500/60 text-lg">◆</span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-500/50" />
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-wide" style={{ fontFamily: 'Playfair Display, serif' }}>
              <span className="gradient-text">房东模拟器</span>
            </h1>

            <p className="text-lg text-gray-300/80 mb-8 max-w-md mx-auto leading-relaxed">
              欢迎来到房东模拟器，开始你的房东生涯！
            </p>

            {/* Decorative line */}
            <div className="flex items-center justify-center gap-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-500/50" />
              <span className="text-amber-500/60 text-lg">◆</span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-500/50" />
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {menuItems.map((item, index) => (
            <Link
              key={item.id}
              href={item.href}
              className={`glass-card p-5 flex flex-col items-center justify-center text-center group glow-border transition-all duration-500 ${mounted ? 'fade-in-up' : 'opacity-0'}`}
              style={{ animationDelay: `${(index + 1) * 100}ms` }}
            >
              {/* Icon container with floating animation */}
              <div className="relative mb-3">
                <span className="text-4xl block float" style={{ animationDelay: `${index * 0.5}s` }}>
                  {item.emoji}
                </span>
                {/* Subtle glow behind icon */}
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              <div className="font-semibold text-gray-100 group-hover:text-amber-400 transition-colors duration-300">
                {item.label}
              </div>
              <div className="text-xs text-gray-400 mt-1 group-hover:text-amber-300/70 transition-colors duration-300">
                {item.subtitle}
              </div>
            </Link>
          ))}
        </div>

        {/* Stats & Tasks Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Stats Panel */}
          <div className={`glass-card p-6 transition-all duration-700 delay-200 ${mounted ? 'fade-in-up' : 'opacity-0'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                <span className="gradient-text">当前状态</span>
              </h2>
            </div>

            <div className="space-y-3">
              <div className="stat-bar flex justify-between items-center group">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors">货币</span>
                <span className="font-semibold text-amber-400 flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  <span>{stats.currency.toLocaleString()}</span>
                </span>
              </div>

              <div className="stat-bar flex justify-between items-center group">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors">体力</span>
                <span className="font-semibold text-amber-400 flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <span>{stats.energy}/3</span>
                </span>
              </div>

              <div className="stat-bar flex justify-between items-center group">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors">租客</span>
                <span className="font-semibold text-amber-400 flex items-center gap-2">
                  <span className="text-lg">👥</span>
                  <span>{stats.tenantCount}</span>
                </span>
              </div>

              <div className="stat-bar flex justify-between items-center group">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors">楼层</span>
                <span className="font-semibold text-amber-400 flex items-center gap-2">
                  <span className="text-lg">🏢</span>
                  <span>{stats.floors}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Tasks Panel */}
          <div className={`glass-card p-6 transition-all duration-700 delay-300 ${mounted ? 'fade-in-up' : 'opacity-0'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                <span className="gradient-text">待办事项</span>
              </h2>
            </div>

            <div className="space-y-3">
              {tasks.map((task, index) => (
                <Link
                  key={task.id}
                  href={task.href}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-amber-500/10 transition-all duration-300 group border border-transparent hover:border-amber-500/20"
                >
                  {/* Task number indicator */}
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600/30 to-amber-700/20 flex items-center justify-center text-sm font-semibold text-amber-400 group-hover:from-amber-500/40 group-hover:to-amber-600/30 transition-all">
                    {index + 1}
                  </div>

                  <span className="text-gray-300 group-hover:text-amber-100 transition-colors flex-1">
                    {task.title}
                  </span>

                  <span className="text-amber-500/50 group-hover:text-amber-400 transition-colors transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative footer */}
        <div className={`text-center py-6 transition-all duration-700 delay-500 ${mounted ? 'fade-in-up' : 'opacity-0'}`}>
          <p className="text-gray-500 text-sm">
            <span className="text-amber-500/40">◆</span>
            <span className="mx-3">做一个有情怀的房东</span>
            <span className="text-amber-500/40">◆</span>
          </p>
        </div>
      </div>
    </>
  )
}
