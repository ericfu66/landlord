'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Plus, Edit2, Trash2, Sparkles, X, Check } from 'lucide-react'

interface WorldView {
  id: number
  userId: number
  name: string
  description: string
  content: string
  isAiGenerated: boolean
  createdAt: string
  updatedAt: string
}

export default function WorldViewsPage() {
  const router = useRouter()
  const [worldviews, setWorldviews] = useState<WorldView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // 创建/编辑状态
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  
  // AI生成状态
  const [isGenerating, setIsGenerating] = useState(false)
  const [theme, setTheme] = useState('')

  useEffect(() => {
    fetchWorldViews()
  }, [])

  const fetchWorldViews = async () => {
    try {
      const res = await fetch('/api/worldviews')
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || '获取失败')
        return
      }
      
      setWorldviews(data.worldviews)
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setIsEditing(true)
    setEditingId(null)
    setName('')
    setDescription('')
    setContent('')
    setTheme('')
  }

  const handleEdit = (worldview: WorldView) => {
    setIsEditing(true)
    setEditingId(worldview.id)
    setName(worldview.name)
    setDescription(worldview.description)
    setContent(worldview.content)
    setTheme('')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditingId(null)
    setName('')
    setDescription('')
    setContent('')
    setTheme('')
    setError('')
  }

  const handleSubmit = async () => {
    if (!name.trim() || !content.trim()) {
      setError('名称和内容不能为空')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (editingId) {
        // 更新
        const res = await fetch(`/api/worldviews/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, content })
        })
        
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || '更新失败')
          return
        }
      } else {
        // 创建
        const res = await fetch('/api/worldviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, content })
        })
        
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || '创建失败')
          return
        }
      }
      
      await fetchWorldViews()
      handleCancel()
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateAI = async () => {
    if (!theme.trim()) {
      setError('请输入主题')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const res = await fetch('/api/worldviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateAI: true, theme })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'AI生成失败')
        return
      }
      
      await fetchWorldViews()
      handleCancel()
    } catch {
      setError('网络错误')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个世界观吗？如果已有角色使用，将无法删除。')) {
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/worldviews/${id}`, {
        method: 'DELETE'
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || '删除失败')
        return
      }
      
      await fetchWorldViews()
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  if (loading && worldviews.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-3 sm:p-6">
        <div className="glass-card p-6 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-gray-400 text-sm">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      <div className="glass-card p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 flex items-center justify-center">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">世界观管理</h1>
          </div>
          
          {!isEditing && (
            <button
              onClick={handleCreate}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm touch-target"
            >
              <Plus className="w-4 h-4" />
              <span>新建世界观</span>
            </button>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-xs sm:text-sm mb-3 sm:mb-4">{error}</p>
        )}

        {isEditing ? (
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                placeholder="世界观的名称"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">描述</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                placeholder="简短描述这个世界观"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">内容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-32 sm:min-h-48 text-sm resize-none"
                placeholder="详细的世界观内容，可以使用{{location}}、{{faction}}等占位符"
              />
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                提示：使用 {'{{key}}'} 格式的占位符，在生成角色时会自动替换
              </p>
            </div>

            {!editingId && (
              <div className="border-t border-white/10 pt-3 sm:pt-4">
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">或使用AI生成</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    placeholder="输入主题，如：赛博朋克、仙侠世界..."
                  />
                  <button
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm touch-target"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isGenerating ? '生成中...' : 'AI生成'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-2 sm:pt-4">
              <button
                onClick={handleCancel}
                className="flex-1 py-2 sm:py-2.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm touch-target flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2 sm:py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 text-sm touch-target flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {loading ? '保存中...' : (editingId ? '更新' : '创建')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-4">
            {worldviews.length === 0 ? (
              <div className="text-center py-10 sm:py-12 text-gray-400">
                <Globe className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 text-gray-600" />
                <p className="text-sm sm:text-base">还没有世界观</p>
                <p className="text-xs sm:text-sm mt-1">点击上方按钮创建你的第一个世界观</p>
              </div>
            ) : (
              worldviews.map((worldview) => (
                <div key={worldview.id} className="glass-card p-3 sm:p-4 hover:bg-white/5 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold truncate">{worldview.name}</h3>
                        {worldview.isAiGenerated && (
                          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] sm:text-xs rounded-full">
                            AI生成
                          </span>
                        )}
                      </div>
                      {worldview.description && (
                        <p className="text-gray-400 text-xs sm:text-sm mt-1 line-clamp-2">{worldview.description}</p>
                      )}
                      <p className="text-gray-500 text-[10px] sm:text-xs mt-1.5 sm:mt-2">
                        创建于 {new Date(worldview.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => handleEdit(worldview)}
                        className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors touch-target-sm"
                        aria-label="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(worldview.id)}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors touch-target-sm"
                        aria-label="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
