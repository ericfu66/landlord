'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
      <div className="max-w-4xl mx-auto p-6">
        <div className="glass-card p-6">
          <p className="text-center text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">世界观管理</h1>
          {!isEditing && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              + 新建世界观
            </button>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="世界观的名称"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">描述</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="简短描述这个世界观"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">内容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-48"
                placeholder="详细的世界观内容，可以使用{{location}}、{{faction}}等占位符"
              />
              <p className="text-xs text-gray-400 mt-1">
                提示：使用 {'{{key}}'} 格式的占位符，在生成角色时会自动替换
              </p>
            </div>

            {!editingId && (
              <div className="border-t border-white/10 pt-4">
                <label className="block text-sm font-medium mb-2">或使用AI生成</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="输入主题，如：赛博朋克、仙侠世界..."
                  />
                  <button
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isGenerating ? '生成中...' : 'AI生成'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleCancel}
                className="flex-1 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? '保存中...' : (editingId ? '更新' : '创建')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {worldviews.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>还没有世界观</p>
                <p className="text-sm mt-2">点击上方按钮创建你的第一个世界观</p>
              </div>
            ) : (
              worldviews.map((worldview) => (
                <div key={worldview.id} className="glass-card p-4 hover:bg-white/5 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold">{worldview.name}</h3>
                        {worldview.isAiGenerated && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                            AI生成
                          </span>
                        )}
                      </div>
                      {worldview.description && (
                        <p className="text-gray-400 text-sm mt-1">{worldview.description}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-2">
                        创建于 {new Date(worldview.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(worldview)}
                        className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(worldview.id)}
                        className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors text-sm"
                      >
                        删除
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
