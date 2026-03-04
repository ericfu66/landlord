'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('两次密码不一致')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '注册失败')
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
            注册
          </h1>

          <p className="text-gray-400 text-sm mt-2">开始你的房东生涯</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl 
                         focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/30 
                         transition-all text-gray-100 placeholder-gray-500 text-sm sm:text-base"
              placeholder="2-20个字符"
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
              placeholder="至少6个字符"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl 
                         focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/30 
                         transition-all text-gray-100 placeholder-gray-500 text-sm sm:text-base"
              placeholder="再次输入密码"
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
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-center mt-4 sm:mt-6 text-gray-400 text-sm">
          已有账号？{' '}
          <a href="/login" className="text-amber-400 hover:text-amber-300 transition-colors">
            登录
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
