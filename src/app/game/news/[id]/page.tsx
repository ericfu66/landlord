'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Newspaper, ArrowLeft, Calendar } from 'lucide-react'

interface DailyNews {
  id: number
  title: string
  content: string
  worldNews: string[]
  tenantEvents: string[]
  weather: string
  date: string
  isRead: boolean
  createdAt: string
}

export default function NewsDetailPage() {
  const params = useParams()
  const [news, setNews] = useState<DailyNews | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchNewsDetail()
    }
  }, [params.id])

  const fetchNewsDetail = async () => {
    try {
      const res = await fetch(`/api/news/${params.id}`)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || '获取失败')
      }
      
      setNews(data.news)
      
      // 如果未读，标记为已读
      if (data.news && !data.news.isRead) {
        await fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newsId: data.news.id })
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  if (error || !news) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto glass-card p-12 text-center">
          <Newspaper className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">{error || '新闻不存在'}</p>
          <Link
            href="/game/news"
            className="inline-flex items-center gap-2 mt-4 text-amber-400 hover:text-amber-300"
          >
            <ArrowLeft className="w-4 h-4" />
            返回新闻列表
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/game/news"
            className="flex items-center gap-2 px-4 py-2 glass-card hover:bg-white/10 transition-colors rounded-xl"
          >
            <ArrowLeft className="w-5 h-5 text-amber-400" />
            <span className="text-gray-300">返回</span>
          </Link>
          
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{news.date}</span>
            <span>·</span>
            <span>{news.weather}</span>
          </div>
        </div>

        {/* 新闻内容 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden"
        >
          {/* 标题 */}
          <div className="p-8 text-center border-b border-white/10">
            <h1 className="text-3xl font-bold text-amber-400 leading-relaxed">
              {news.title}
            </h1>
          </div>
          
          {/* 正文 */}
          <div className="p-8 space-y-8">
            {/* 开场白 */}
            {news.content.split('📰')[0]?.trim() && (
              <div className="text-center">
                <p className="text-lg text-gray-300 italic leading-relaxed">
                  "{news.content.split('📰')[0].trim()}"
                </p>
              </div>
            )}
            
            {/* 世界大事 */}
            {news.worldNews.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-amber-400">
                  <span className="text-2xl">🌍</span>
                  <h2 className="text-xl font-bold">世界大事</h2>
                </div>
                
                <div className="space-y-3">
                  {news.worldNews.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 
                                       text-amber-400 font-bold flex items-center justify-center"
                      >
                        {index + 1}
                      </span>
                      <p className="text-gray-300 leading-relaxed pt-1">{item}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 租客动态 */}
            {news.tenantEvents.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-orange-400">
                  <span className="text-2xl">🏠</span>
                  <h2 className="text-xl font-bold">租客动态</h2>
                </div>
                
                <div className="space-y-3">
                  {news.tenantEvents.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 
                                       text-orange-400 font-bold flex items-center justify-center"
                      >
                        {index + 1}
                      </span>
                      <p className="text-gray-300 leading-relaxed pt-1">{item}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* 底部 */}
          <div className="p-6 border-t border-white/10 text-center text-sm text-gray-500">
            发布于 {new Date(news.createdAt).toLocaleString('zh-CN')}
          </div>
        </motion.div>
      </div>
    </div>
  )
}