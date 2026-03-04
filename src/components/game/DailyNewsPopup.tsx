'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Newspaper, X, ChevronRight, Calendar, Info } from 'lucide-react'

interface DailyNews {
  id: number
  title: string
  content: string
  worldNews: string[]
  tenantEvents: string[]
  weather: string
  date: string
  isRead: boolean
}

// 获取今天的日期字符串
const getTodayString = () => {
  return new Date().toISOString().split('T')[0]
}

// 检查今天是否已经查看过新闻（使用本地存储）
const hasSeenNewsToday = (): boolean => {
  if (typeof window === 'undefined') return false
  const lastSeenDate = localStorage.getItem('lastSeenNewsDate')
  return lastSeenDate === getTodayString()
}

// 标记今天已查看新闻
const markNewsSeenToday = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem('lastSeenNewsDate', getTodayString())
}

export default function DailyNewsPopup() {
  const [news, setNews] = useState<DailyNews | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasNews, setHasNews] = useState(false)

  useEffect(() => {
    fetchTodayNews()
  }, [])

  const fetchTodayNews = async () => {
    try {
      const res = await fetch('/api/news')
      const data = await res.json()
      
      if (data.news) {
        setNews(data.news)
        setHasNews(true)
        // 只有当今天还没看过新闻时才自动打开
        if (!hasSeenNewsToday()) {
          setIsOpen(true)
        }
      } else {
        setHasNews(false)
        setNews(null)
      }
    } catch (error) {
      console.error('Fetch news error:', error)
      setHasNews(false)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = async () => {
    if (news) {
      // 标记为已读
      try {
        await fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newsId: news?.id })
        })
      } catch (error) {
        console.error('Mark as read error:', error)
      }
    }
    // 标记今天已查看
    markNewsSeenToday()
    setIsOpen(false)
  }

  // 如果没有新闻，显示一个提示按钮而不是什么都不显示
  if (loading) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={handleClose}
          />
          
          {/* 新闻弹窗 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                       md:w-full md:max-w-2xl md:max-h-[80vh] z-50"
          >
            <div className="glass-card h-full flex flex-col overflow-hidden">
              {/* 头部 */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 
                                  flex items-center justify-center">
                    <Newspaper className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">每日新闻</h2>
                    <p className="text-sm text-gray-400">{news?.date} · {news?.weather}</p>
                  </div>
                </div>
                
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              {/* 内容 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 标题 */}
                <h3 className="text-2xl font-bold text-amber-400 text-center leading-relaxed">
                  {news?.title}
                </h3>
                
                {/* 开场白 */}
                {news?.content?.split('📰')[0]?.trim() && (
                  <div className="text-gray-300 leading-relaxed text-center italic">
                    "{news?.content?.split('📰')[0].trim()}"
                  </div>
                )}
                
                {/* 世界大事 */}
                {(news?.worldNews?.length ?? 0) > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold">
                      <span className="text-lg">🌍</span>
                      <span>世界大事</span>
                    </div>
                    <div className="space-y-2">
                      {news?.worldNews?.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                        >
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 
                                           text-amber-400 text-sm flex items-center justify-center">
                            {index + 1}
                          </span>
                          <p className="text-gray-300 text-sm leading-relaxed">{item}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 租客动态 */}
                {(news?.tenantEvents?.length ?? 0) > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold">
                      <span className="text-lg">🏠</span>
                      <span>租客动态</span>
                    </div>
                    <div className="space-y-2">
                      {news?.tenantEvents?.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                        >
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 
                                           text-orange-400 text-sm flex items-center justify-center">
                            {index + 1}
                          </span>
                          <p className="text-gray-300 text-sm leading-relaxed">{item}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 底部 */}
              <div className="p-6 border-t border-white/10 flex items-center justify-between">
                <Link
                  href="/game/news"
                  className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors text-sm"
                >
                  <Calendar className="w-4 h-4" />
                  <span>查看历史新闻</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 
                             hover:from-amber-400 hover:to-orange-400
                             text-white font-medium rounded-xl transition-all"
                >
                  知道了
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}