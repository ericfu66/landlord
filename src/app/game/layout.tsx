'use client'

import { ReactNode, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/game/BottomNav'
import StatusBar from '@/components/game/StatusBar'
import Link from 'next/link'
import { LogOut, Save, Settings } from 'lucide-react'
import { GameStateProvider } from './GameStateContext'

interface GameState {
  currency: number
  energy: number
  debtDays: number
  totalFloors: number
  weather: string
  currentTime: string
  currentJob: {
    name: string
    salary: number
    daysWorked: number
  } | null
}

export default function GameLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState>({
    currency: 1000,
    energy: 3,
    debtDays: 0,
    totalFloors: 1,
    weather: '晴',
    currentTime: '08:00',
    currentJob: null
  })
  const [username, setUsername] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const fetchGameState = useCallback(async () => {
    try {
      const res = await fetch('/api/game/state')
      const data = await res.json()
      
      if (data.state) {
        setGameState({
          currency: data.state.currency ?? 1000,
          energy: data.state.energy ?? 3,
          debtDays: data.state.debtDays ?? 0,
          totalFloors: data.state.totalFloors ?? 1,
          weather: data.state.weather ?? '晴',
          currentTime: data.state.currentTime ?? '08:00',
          currentJob: data.state.currentJob || null
        })
        setUsername(data.username || '')
      }
    } catch (error) {
      console.error('Fetch game state error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGameState()
    
    // 定期刷新游戏状态（每 30 秒）
    const interval = setInterval(fetchGameState, 30000)
    return () => clearInterval(interval)
  }, [fetchGameState])

  const quickSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save' })
      })

      if (res.ok) {
        // 可以显示保存成功提示
      } else {
        const data = await res.json()
        alert(data.error || '保存失败')
      }
    } catch (error) {
      console.error('Quick save error:', error)
      alert('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    if (!confirm('确定要登出吗？')) return

    setIsLoggingOut(true)
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      
      if (res.ok) {
        router.push('/login')
      } else {
        alert('登出失败，请重试')
        setIsLoggingOut(false)
      }
    } catch (error) {
      console.error('Logout error:', error)
      alert('登出失败')
      setIsLoggingOut(false)
    }
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `url(${process.env.NEXT_PUBLIC_DEFAULT_BG_URL || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      <div className="relative z-10">
        {/* 顶部状态栏 */}
        <StatusBar
          currency={gameState.currency}
          energy={gameState.energy}
          time={gameState.currentTime}
          weather={gameState.weather}
        />

        {/* 右上角按钮组 */}
        <div className="fixed top-20 right-4 z-30 flex flex-col gap-2">
          {/* 用户名显示 */}
          {username && (
            <div className="glass-card px-3 py-1.5 text-xs text-purple-300 text-right">
              👤 {username}
            </div>
          )}
          
          {/* 快速保存按钮 */}
          <button
            onClick={quickSave}
            disabled={isSaving}
            className="glass-card px-3 py-2 text-sm hover:bg-green-500/20 transition-all duration-300 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save size={14} className={isSaving ? 'animate-pulse' : ''} />
            {isSaving ? '保存中...' : '保存'}
          </button>
          
          {/* 设置按钮 */}
          <Link
            href="/game/settings"
            className="glass-card px-3 py-2 text-sm hover:bg-amber-500/20 transition-all duration-300 flex items-center gap-1.5"
          >
            <Settings size={14} />
            设置
          </Link>
          
          {/* 登出按钮 */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="glass-card px-3 py-2 text-sm hover:bg-red-500/20 transition-all duration-300 flex items-center gap-1.5 text-red-300 disabled:opacity-50"
          >
            <LogOut size={14} />
            {isLoggingOut ? '登出中...' : '登出'}
          </button>
        </div>

        <main className="pt-24 pb-32 px-4 min-h-screen">
          <GameStateProvider onRefresh={fetchGameState}>
            {children}
          </GameStateProvider>
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
