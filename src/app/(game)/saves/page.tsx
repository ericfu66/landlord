'use client'

import { useState, useEffect } from 'react'

interface SaveSlot {
  id: number
  saveName: string
  createdAt: string
  updatedAt: string
}

export default function SavesPage() {
  const [saves, setSaves] = useState<SaveSlot[]>([])
  const [canCreate, setCanCreate] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')

  useEffect(() => {
    fetchSaves()
  }, [])

  const fetchSaves = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/saves')
      const data = await res.json()
      setSaves(data.saves || [])
      setCanCreate(data.canCreate ?? true)
    } catch (error) {
      console.error('Fetch saves error:', error)
    } finally {
      setLoading(false)
    }
  }

  const createSave = async () => {
    if (!saveName.trim()) {
      alert('请输入存档名称')
      return
    }

    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          saveName: saveName.trim(),
          gameData: { timestamp: Date.now() }
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSaves([...saves, data.save])
        setShowSaveModal(false)
        setSaveName('')
        alert('存档创建成功')
      } else {
        alert(data.error || '创建失败')
      }
    } catch (error) {
      console.error('Create save error:', error)
    }
  }

  const loadSave = async (saveId: number) => {
    if (!confirm('确定要加载此存档吗？当前进度将被覆盖。')) return

    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load', saveId })
      })

      const data = await res.json()

      if (res.ok) {
        alert('存档加载成功')
      } else {
        alert(data.error || '加载失败')
      }
    } catch (error) {
      console.error('Load save error:', error)
    }
  }

  const deleteSave = async (saveId: number) => {
    if (!confirm('确定要删除此存档吗？此操作不可撤销。')) return

    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', saveId })
      })

      const data = await res.json()

      if (res.ok) {
        setSaves(saves.filter((s) => s.id !== saveId))
        setCanCreate(true)
        alert('存档已删除')
      } else {
        alert(data.error || '删除失败')
      }
    } catch (error) {
      console.error('Delete save error:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('zh-CN')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">存档管理</h1>
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={!canCreate}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {canCreate ? '新建存档' : '存档已满'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : saves.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="mb-2">暂无存档</p>
            <p className="text-sm">点击"新建存档"创建你的第一个存档</p>
          </div>
        ) : (
          <div className="space-y-3">
            {saves.map((save) => (
              <div
                key={save.id}
                className="glass-card p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{save.saveName}</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      创建于 {formatDate(save.createdAt)}
                    </p>
                    <p className="text-xs text-gray-500">
                      更新于 {formatDate(save.updatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadSave(save.id)}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-500 transition-colors"
                    >
                      加载
                    </button>
                    <button
                      onClick={() => deleteSave(save.id)}
                      className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded hover:bg-red-500/30 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-400">
            最多可创建 5 个存档
          </p>
        </div>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">新建存档</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">存档名称</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="输入存档名称..."
                maxLength={50}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowSaveModal(false)
                  setSaveName('')
                }}
                className="flex-1 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                取消
              </button>
              <button
                onClick={createSave}
                className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}