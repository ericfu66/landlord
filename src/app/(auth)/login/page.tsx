'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '登录失败')
        return
      }

      router.push('/game')
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-950/30 via-gray-900 to-amber-950/20" />
      <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-amber-600/10 rounded-full blur-3xl" />

      <div className="noise-overlay" />

      <div className="glass-card p-6 sm:p-8 md:p-10 w-full max-w-md relative z-10">
        {/* Back button */}
        <a 
          href="/" 
          className="absolute top-4 left-4 text-gray-400 hover:text-amber-400 transition-colors text-sm flex items-center gap-1"
        >
          ← 返回
        </a>

        {/* Decorative header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4">
            <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-amber-500/50" />
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500/60" />
            <div className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-amber-500/50" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold gradient-text" style={{ fontFamily: 'Playfair Display, serif' }}>
            登录
          </h1>

          <p className="text-gray-400 text-sm mt-2">欢迎回来，房东大人</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl 
                         focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/30 
                         transition-all text-gray-100 placeholder-gray-500 text-sm sm:text-base"
              placeholder="请输入用户名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl 
                         focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/30 
                         transition-all text-gray-100 placeholder-gray-500 text-sm sm:text-base"
              placeholder="请输入密码"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 sm:py-3 btn-gold rounded-xl font-medium disabled:opacity-50 text-sm sm:text-base touch-target"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        {/* Discord 登录 */}
        <div className="mt-4 sm:mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-2 bg-[#1a1a2e] text-gray-400">或使用</span>
            </div>
          </div>

          <a
            href="/api/auth/discord"
            className="mt-3 sm:mt-4 w-full flex items-center justify-center gap-2 sm:gap-3 px-4 py-2.5 sm:py-3 
                       bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/50 
                       rounded-xl transition-all duration-300 group touch-target"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span className="text-white/90 font-medium text-sm sm:text-base">使用 Discord 登录</span>
          </a>
        </div>

        <p className="text-center mt-4 sm:mt-6 text-gray-400 text-sm">
          还没有账号？{' '}
          <a href="/register" className="text-amber-400 hover:text-amber-300 transition-colors">
            注册
          </a>
        </p>

        {/* Decorative footer */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
          <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-amber-500/30" />
          <span className="text-amber-500/40 text-xs sm:text-sm">做个有情怀的房东</span>
          <div className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-amber-500/30" />
        </div>
      </div>
    </main>
  )
}
