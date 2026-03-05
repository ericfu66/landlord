'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Wand2, ImageIcon, Sparkles } from 'lucide-react'

const navItems = [
  { href: '/game', label: '首页', icon: '🏠', shortLabel: '首页' },
  { href: '/game/characters', label: '租客', icon: '👥', shortLabel: '租客' },
  { href: '/game/recruit', label: '招募', icon: '✨', shortLabel: '招募' },
  { href: '/game/building', label: '基建', icon: '🏢', shortLabel: '基建' },
  { href: '/game/work', label: '打工', icon: '💼', shortLabel: '打工' },
  { href: '/game/multiplayer', label: '联机', icon: '🌐', shortLabel: '联机' },
  { href: '/game/group-chat', label: '群聊', icon: '💬', shortLabel: '群聊' },
  { href: '/game/workshop', label: '工坊', icon: '🏪', shortLabel: '工坊' },
  { href: '/game/presets', label: '预设', icon: '🧩', shortLabel: '预设' },
  { href: '/game/saves', label: '存档', icon: '💾', shortLabel: '存档' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [showAIGenModal, setShowAIGenModal] = useState(false)
  const [characters, setCharacters] = useState<{name: string, hasPortrait: boolean}[]>([])
  const [generating, setGenerating] = useState<string | null>(null)

  // Auto-hide on scroll down, show on scroll up (mobile optimization)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const viewportHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      const isNearBottom = currentScrollY + viewportHeight >= documentHeight - 100
      
      if (window.innerWidth < 768) {
        if (currentScrollY > lastScrollY && currentScrollY > 100 && !isNearBottom) {
          setIsVisible(false)
        } else {
          setIsVisible(true)
        }
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Fetch characters when modal opens
  useEffect(() => {
    if (showAIGenModal) {
      fetch('/api/characters')
        .then(res => res.json())
        .then(data => {
          if (data.characters) {
            setCharacters(data.characters.map((c: any) => ({
              name: c.name,
              hasPortrait: !!c.portraitUrl
            })))
          }
        })
    }
  }, [showAIGenModal])

  const handleGeneratePortrait = async (characterName: string) => {
    setGenerating(characterName)
    
    try {
      const res = await fetch('/api/characters/generate-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName })
      })

      const data = await res.json()
      
      if (res.ok) {
        setCharacters(prev => prev.map(c => 
          c.name === characterName ? { ...c, hasPortrait: true } : c
        ))
        alert('立绘生成成功！')
      } else {
        alert(data.error || '生成失败')
      }
    } catch (error) {
      console.error('Generate portrait error:', error)
      alert('生成立绘失败')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <>
      <nav 
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 md:bottom-6
          ${isVisible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}
      >
        {/* Mobile: Full width bottom bar with safe area */}
        <div className="md:hidden bg-gradient-to-t from-black/90 via-black/80 to-transparent pt-4 pb-safe">
          <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border-t border-amber-500/20 px-2 py-2">
            <div className="flex items-center justify-around overflow-x-auto scrollbar-hide">
              {navItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/game' && pathname.startsWith(item.href + '/'))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center justify-center min-w-[3rem] px-2 py-1.5 rounded-xl transition-all duration-200 touch-target-sm
                      ${isActive
                        ? 'text-amber-400'
                        : 'text-gray-400 hover:text-amber-200'
                      }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[10px] mt-0.5 font-medium">{item.shortLabel}</span>
                    {isActive && (
                      <div className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Desktop: Floating glass card with AI Gen button */}
        <div className="hidden md:block">
          <div className="flex items-center justify-center gap-3">
            {/* AI Generate Button */}
            <button
              onClick={() => setShowAIGenModal(true)}
              className="glass-card px-4 py-2 flex items-center gap-2 text-pink-300 hover:bg-pink-500/20 transition-all duration-300 group"
              style={{
                borderRadius: '1rem',
                border: '1px solid rgba(255,182,193,0.3)'
              }}
            >
              <Wand2 className="w-5 h-5 group-hover:animate-pulse" />
              <span className="text-sm font-medium">AI生图</span>
            </button>

            <div className="glass-card flex items-center gap-1 px-2 py-2 mx-auto w-fit max-w-[90vw] overflow-x-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/game' && pathname.startsWith(item.href + '/'))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all duration-300 whitespace-nowrap
                      ${isActive
                        ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/20 text-amber-300 shadow-lg shadow-amber-500/20'
                        : 'text-gray-400 hover:text-amber-100 hover:bg-white/10'
                      }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-xs mt-1">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mobile: AI Generate FAB */}
        <div className="md:hidden fixed bottom-20 right-4">
          <button
            onClick={() => setShowAIGenModal(true)}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #ffb6c1 0%, #ff69b4 100%)',
              boxShadow: '0 4px 15px #ff69b450'
            }}
          >
            <Wand2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </nav>

      {/* AI Generation Modal */}
      {showAIGenModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAIGenModal(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          <div 
            className="relative max-w-md w-full max-h-[80vh] overflow-auto rounded-2xl"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
              border: '1px solid rgba(255,182,193,0.3)',
              boxShadow: '0 0 60px rgba(255,182,193,0.2)'
            }}
          >
            {/* Header */}
            <div className="p-6 border-b border-pink-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #ffb6c1 0%, #ff69b4 100%)'
                    }}
                  >
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">AI 生图</h3>
                    <p className="text-xs text-gray-400">为角色生成立绘</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIGenModal(false)}
                  className="text-gray-400 hover:text-white p-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Character list */}
            <div className="p-4 space-y-2">
              {characters.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>暂无角色，请先招募</p>
                </div>
              ) : (
                characters.map((char) => (
                  <div
                    key={char.name}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                          ${char.hasPortrait ? 'bg-gradient-to-br from-pink-500 to-rose-500' : 'bg-white/10'}`}
                      >
                        {char.hasPortrait ? '✨' : '👤'}
                      </div>
                      <div>
                        <p className="font-medium text-white">{char.name}</p>
                        <p className="text-xs text-gray-400">
                          {char.hasPortrait ? '已有立绘' : '未生成立绘'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleGeneratePortrait(char.name)}
                      disabled={generating === char.name}
                      className="px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50"
                      style={{
                        background: char.hasPortrait 
                          ? 'rgba(255,255,255,0.1)' 
                          : 'linear-gradient(135deg, #ffb6c1 0%, #ff69b4 100%)',
                        color: '#fff'
                      }}
                    >
                      {generating === char.name ? (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          生成中...
                        </span>
                      ) : char.hasPortrait ? (
                        '重新生成'
                      ) : (
                        '生成立绘'
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Info */}
            <div className="p-4 border-t border-pink-500/20">
              <p className="text-xs text-gray-400 text-center">
                使用 SiliconFlow AI 生成立绘，风格为二次元 Galgame
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
