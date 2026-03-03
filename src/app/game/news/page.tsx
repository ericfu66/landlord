'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Newspaper, ArrowLeft, Calendar, Eye, EyeOff } from 'lucide-react'

interface DailyNews {
  id: number
  title: string
  date: string
  weather: string
  isRead: boolean
  worldNewsCount: number
  tenantEventsCount: number
}

export default function NewsListPage() {
  const [newsList, setNewsList] = useState<DailyNews[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNewsList()
  }, [])

  const fetchNewsList = async () => {
    try {
      const res = await fetch('/api/news?list=true')
      const data = await res.json()
      if (data.news) {
        setNewsList(data.news.map((news: any) => ({
          ...news,
          worldNewsCount: news.worldNews?.length || 0,
          tenantEventsCount: news.tenantEvents?.length || 0
        })))
      }
    } catch (error) {
      console.error('Fetch news list error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/game"
            className="flex items-center gap-2 px-4 py-2 glass-card hover:bg-white/10 transition-colors rounded-xl"
          >
            <ArrowLeft className="w-5 h-5 text-amber-400" />
            <span className="text-gray-300">返回</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 
                            flex items-center justify-center">
              <Newspaper className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">每日新闻</h1>
              <p className="text-sm text-gray-400">历史新闻归档</p>
            </div>
          </div>
        </div>

        {/* 新闻列表 */}
        {loading ? (
          <div className="glass-card p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">加载中...</p>
          </div>
        ) : newsList.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Newspaper className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">暂无新闻</p>
            <p className="text-sm text-gray-500">推进到下一天时会自动生成每日新闻</p>
          </div>
        ) : (
          <div className="space-y-4">
            {newsList.map((news, index) => (
              <motion.div
                key={news.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/game/news/${news.id}`}
                  className="glass-card p-6 flex items-center gap-4 hover:bg-white/10 transition-all group"
                >
                  {/* 日期 */}
                  <div className="flex-shrink-0 w-16 text-center">
                    <div className="text-2xl font-bold text-amber-400">
                      {new Date(news.date).getDate()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(news.date).toLocaleDateString('zh-CN', { month: 'short' })}
                    </div>
                  </div>
                  
                  {/* 分隔线 */}
                  <div className="w-px h-12 bg-white/10" />
                  
                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold truncate group-hover:text-amber-400 transition-colors ${
                      news.isRead ? 'text-gray-400' : 'text-white'
                    }`}>
                      {news.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500"
                    >
                      <span className="flex items-center gap-1">
                        <span>🌍</span>
                        <span>{news.worldNewsCount} 条世界新闻</span>
                      </span>
                      
                      <span className="flex items-center gap-1">
                        <span>🏠</span>
                        <span>{news.tenantEventsCount} 条租客动态</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* 已读状态 */}
                  <div className="flex-shrink-0">
                    {news.isRead ? (
                      <Eye className="w-5 h-5 text-gray-600" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  
                  {/* 箭头 */}
                  <div className="flex-shrink-0 text-gray-500 group-hover:text-amber-400 
                                  group-hover:translate-x-1 transition-all"
                  >
                    →
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}