'use client'

import { useState, useEffect } from 'react'
import { DiaryEntry } from '@/types/diary'
import { BookHeart, Eye, X, Sparkles, Calendar, Heart, Lock, Unlock } from 'lucide-react'

interface DiaryPanelProps {
  characterName: string
}

// 水彩心情标签
function MoodBadge({ mood }: { mood: string }) {
  const moodColors: Record<string, string> = {
    '开心': 'bg-pink-300/80 text-pink-800',
    '平静': 'bg-blue-300/80 text-blue-800',
    '难过': 'bg-gray-300/80 text-gray-800',
    '生气': 'bg-red-300/80 text-red-800',
    '兴奋': 'bg-yellow-300/80 text-yellow-800',
    '疲惫': 'bg-purple-300/80 text-purple-800',
    'default': 'bg-green-300/80 text-green-800'
  }

  const moodEmojis: Record<string, string> = {
    '开心': '🌸',
    '平静': '🌿',
    '难过': '🌧️',
    '生气': '🔥',
    '兴奋': '✨',
    '疲惫': '😴',
    'default': '😊'
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${moodColors[mood] || moodColors.default}`}>
      <span className="mr-1">{moodEmojis[mood] || moodEmojis.default}</span>
      {mood}
    </span>
  )
}

// 日记卡片 - 水彩纸张效果
function DiaryCard({ entry, onClick }: { entry: DiaryEntry; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="group cursor-pointer bg-[#fefefe] rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-[#e8ddd4] hover:border-[#d4c4b0] relative overflow-hidden"
    >
      {/* 水彩晕染背景 */}
      <div className={`absolute inset-0 opacity-10 ${
        entry.isPeeked 
          ? 'bg-gradient-to-br from-purple-300 via-pink-200 to-yellow-200' 
          : 'bg-gradient-to-br from-blue-200 via-green-100 to-yellow-100'
      }`} />
      
      {/* 偷看标记 */}
      {entry.isPeeked && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 rounded-full bg-purple-400/20 flex items-center justify-center">
            <Eye size={14} className="text-purple-600" />
          </div>
        </div>
      )}

      <div className="relative">
        {/* 日期 */}
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-[#a0826d]" />
          <span className="text-sm text-[#8b7355] font-medium">
            {new Date(entry.date).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short'
            })}
          </span>
        </div>

        {/* 心情 */}
        <div className="mb-3">
          <MoodBadge mood={entry.mood} />
        </div>

        {/* 内容预览 */}
        <p className="text-[#654321] text-sm line-clamp-3 leading-relaxed">
          {entry.content.substring(0, 80)}
          {entry.content.length > 80 && '...'}
        </p>

        {/* 查看提示 */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-[#a0826d] group-hover:text-[#8b4513] transition-colors">
            点击查看全文
          </span>
          <BookHeart size={16} className="text-[#d4c4b0] group-hover:text-[#c4a574] transition-colors" />
        </div>
      </div>
    </div>
  )
}

// 日记详情弹窗
function DiaryDetailModal({ 
  entry, 
  onClose 
}: { 
  entry: DiaryEntry; 
  onClose: () => void 
}) {
  return (
    <div className="fixed inset-0 bg-[#3d2914]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg bg-[#faf8f5] rounded-2xl shadow-[0_20px_60px_rgba(61,41,20,0.3)] overflow-hidden border border-[#e8ddd4]">
        {/* 头部装饰 */}
        <div className="relative h-24 bg-gradient-to-br from-pink-100 via-purple-50 to-blue-50">
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c4b0' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
          >
            <X size={18} className="text-[#8b7355]" />
          </button>

          <div className="absolute -bottom-6 left-6">
            <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl">
              📖
            </div>
          </div>
        </div>

        {/* 内容区 */}
        <div className="pt-10 pb-8 px-8">
          {/* 日期和心情 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-[#8b7355]">
              <Calendar size={16} />
              <span className="font-medium">
                {new Date(entry.date).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <MoodBadge mood={entry.mood} />
          </div>

          {/* 偷看标记 */}
          {entry.isPeeked && (
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2">
              <Eye size={16} className="text-purple-500" />
              <span className="text-sm text-purple-700">这是偷看的日记，角色并不知道</span>
            </div>
          )}

          {/* 日记正文 */}
          <div className="prose prose-stone max-w-none">
            <p className="text-[#3d2914] leading-loose whitespace-pre-wrap font-serif text-lg">
              {entry.content}
            </p>
          </div>

          {/* 底部装饰 */}
          <div className="mt-8 pt-6 border-t border-[#e8ddd4] flex items-center justify-center gap-2 text-[#c4b498]">
            <Heart size={16} className="text-pink-400" />
            <span className="text-sm">日记已保存到记忆</span>
            <Heart size={16} className="text-pink-400" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DiaryPanel({ characterName }: DiaryPanelProps) {
  const [diaries, setDiaries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntry | null>(null)
  const [showGenerateOptions, setShowGenerateOptions] = useState(false)

  useEffect(() => {
    if (characterName) {
      fetchDiaries()
    }
  }, [characterName])

  const fetchDiaries = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/diary?characterName=${encodeURIComponent(characterName)}`)
      if (res.ok) {
        const data = await res.json()
        setDiaries(data.diaries || [])
      }
    } catch (error) {
      console.error('Fetch diaries error:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateDiary = async (type: 'ask' | 'peek') => {
    setGenerating(true)
    setShowGenerateOptions(false)
    try {
      const res = await fetch('/api/diary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName,
          type
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.diary) {
          setDiaries(prev => [data.diary, ...prev])
          setSelectedDiary(data.diary)
        }
      } else {
        const data = await res.json()
        alert(data.error || '生成日记失败')
      }
    } catch (error) {
      console.error('Generate diary error:', error)
      alert('生成日记失败')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-[#faf8f5] to-[#f5f0e8] rounded-2xl border border-[#e8ddd4] overflow-hidden">
      {/* 标题栏 */}
      <div className="p-5 border-b border-[#e8ddd4] bg-white/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center text-xl">
              📔
            </div>
            <div>
              <h3 className="font-bold text-[#3d2914] text-lg">角色日记</h3>
              <p className="text-sm text-[#8b7355]">
                共 {diaries.length} 篇日记 · 最近5篇已存入记忆
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowGenerateOptions(!showGenerateOptions)}
            disabled={generating}
            className="px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white rounded-full font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles size={16} />
            {generating ? '生成中...' : '新日记'}
          </button>
        </div>

        {/* 生成选项 */}
        {showGenerateOptions && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => generateDiary('ask')}
              className="flex-1 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Unlock size={18} />
              <div className="text-left">
                <div className="font-medium">索要日记</div>
                <div className="text-xs opacity-80">角色主动给房东看</div>
              </div>
            </button>
            <button
              onClick={() => generateDiary('peek')}
              className="flex-1 py-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Lock size={18} />
              <div className="text-left">
                <div className="font-medium">偷看日记</div>
                <div className="text-xs opacity-80">角色不知道房东在看</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* 日记列表 */}
      <div className="p-5 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin text-3xl">🌸</div>
            <p className="mt-2 text-[#8b7355]">正在翻阅日记...</p>
          </div>
        ) : diaries.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">📝</div>
            <p className="text-[#8b7355] mb-2">还没有日记</p>
            <p className="text-sm text-[#a0826d]">点击"新日记"来生成第一篇日记</p>
          </div>
        ) : (
          <div className="space-y-3">
            {diaries.map((diary) => (
              <DiaryCard
                key={diary.id}
                entry={diary}
                onClick={() => setSelectedDiary(diary)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {selectedDiary && (
        <DiaryDetailModal
          entry={selectedDiary}
          onClose={() => setSelectedDiary(null)}
        />
      )}
    </div>
  )
}
