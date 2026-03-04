'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Upload, RotateCcw, AlertCircle, CheckCircle, FileJson } from 'lucide-react'

interface GameStatus {
  state: {
    currency: number
    energy: number
    debtDays: number
    totalFloors: number
    weather: string
    currentTime: string
  }
  characterCount: number
  roomCount: number
}

export default function SavesPage() {
  const router = useRouter()
  const [currentState, setCurrentState] = useState<GameStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [exportData, setExportData] = useState('')
  const [importData, setImportData] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    fetchGameState()
  }, [])

  // 自动隐藏消息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const fetchGameState = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/saves')
      const data = await res.json()
      
      if (res.ok) {
        setCurrentState(data.currentState)
      } else {
        setMessage({ type: 'error', text: data.error || '获取游戏状态失败' })
      }
    } catch (error) {
      console.error('Fetch game state error:', error)
      setMessage({ type: 'error', text: '获取游戏状态失败' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save' })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: '游戏已保存' })
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' })
      }
    } catch (error) {
      console.error('Save error:', error)
      setMessage({ type: 'error', text: '保存失败' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExport = async () => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' })
      })

      const data = await res.json()

      if (res.ok && data.data) {
        setExportData(data.data)
        setShowExport(true)
        setMessage({ type: 'success', text: '游戏数据已导出' })
      } else {
        setMessage({ type: 'error', text: data.error || '导出失败' })
      }
    } catch (error) {
      console.error('Export error:', error)
      setMessage({ type: 'error', text: '导出失败' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (!importData.trim()) {
      setMessage({ type: 'error', text: '请输入导入数据' })
      return
    }

    setIsProcessing(true)
    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', data: importData })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: '游戏数据已导入' })
        setShowImport(false)
        setImportData('')
        await fetchGameState()
        router.refresh()
      } else {
        setMessage({ type: 'error', text: data.error || '导入失败' })
      }
    } catch (error) {
      console.error('Import error:', error)
      setMessage({ type: 'error', text: '导入失败' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('确定要重置游戏数据吗？此操作不可撤销！')) return

    setIsProcessing(true)
    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: '游戏数据已重置' })
        await fetchGameState()
        router.refresh()
      } else {
        setMessage({ type: 'error', text: data.error || '重置失败' })
      }
    } catch (error) {
      console.error('Reset error:', error)
      setMessage({ type: 'error', text: '重置失败' })
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('zh-CN')
  }

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-0">
      {/* 消息提示 */}
      {message && (
        <div className={`fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all text-sm ${
          message.type === 'success' 
            ? 'bg-green-500/90 text-white' 
            : 'bg-red-500/90 text-white'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <div className="glass-card p-4 sm:p-6">
        {/* 头部 */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <FileJson className="text-purple-400" size={18} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">数据管理</h1>
            <p className="text-xs text-gray-400">游戏数据自动保存，支持导入导出</p>
          </div>
        </div>

        {/* 当前游戏状态 */}
        {currentState && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/5 rounded-xl border border-white/10">
            <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-2 sm:mb-3">当前游戏状态</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <div className="text-center p-2 bg-black/20 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-amber-400">💰 {formatCurrency(currentState.state.currency)}</div>
                <div className="text-[10px] sm:text-xs text-gray-500">货币</div>
              </div>
              <div className="text-center p-2 bg-black/20 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-blue-400">⚡ {currentState.state.energy}/3</div>
                <div className="text-[10px] sm:text-xs text-gray-500">体力</div>
              </div>
              <div className="text-center p-2 bg-black/20 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-purple-400">👥 {currentState.characterCount}</div>
                <div className="text-[10px] sm:text-xs text-gray-500">租客</div>
              </div>
              <div className="text-center p-2 bg-black/20 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-green-400">🏢 {currentState.state.totalFloors}</div>
                <div className="text-[10px] sm:text-xs text-gray-500">楼层</div>
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
              <span>🌤️ {currentState.state.weather}</span>
              <span>🕐 {currentState.state.currentTime}</span>
              {currentState.state.debtDays > 0 && (
                <span className="text-red-400">⚠️ 负债 {currentState.state.debtDays} 天</span>
              )}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="p-3 sm:p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex flex-col items-center gap-1.5 sm:gap-2 touch-target"
          >
            <Download size={20} className="sm:w-6 sm:h-6" />
            <span className="text-xs sm:text-sm">保存游戏</span>
          </button>

          <button
            onClick={handleExport}
            disabled={isProcessing}
            className="p-3 sm:p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex flex-col items-center gap-1.5 sm:gap-2 touch-target"
          >
            <Upload size={20} className="sm:w-6 sm:h-6" />
            <span className="text-xs sm:text-sm">导出数据</span>
          </button>

          <button
            onClick={() => setShowImport(true)}
            disabled={isProcessing}
            className="p-3 sm:p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex flex-col items-center gap-1.5 sm:gap-2 touch-target"
          >
            <FileJson size={20} className="sm:w-6 sm:h-6" />
            <span className="text-xs sm:text-sm">导入数据</span>
          </button>

          <button
            onClick={handleReset}
            disabled={isProcessing}
            className="p-3 sm:p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex flex-col items-center gap-1.5 sm:gap-2 touch-target"
          >
            <RotateCcw size={20} className="sm:w-6 sm:h-6" />
            <span className="text-xs sm:text-sm">重置游戏</span>
          </button>
        </div>

        {/* 导出数据对话框 */}
        {showExport && (
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-white/5 rounded-xl border border-white/10">
            <h3 className="text-sm sm:text-base font-medium mb-2 sm:mb-3">导出数据</h3>
            <p className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">复制以下 JSON 数据保存到安全的地方：</p>
            <textarea
              value={exportData}
              readOnly
              className="w-full h-24 sm:h-32 px-2.5 sm:px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-xs font-mono text-gray-300 focus:outline-none resize-none"
            />
            <div className="mt-2 sm:mt-3 flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportData)
                  setMessage({ type: 'success', text: '已复制到剪贴板' })
                }}
                className="px-3 sm:px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-xs sm:text-sm touch-target-sm"
              >
                复制
              </button>
              <button
                onClick={() => setShowExport(false)}
                className="px-3 sm:px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-xs sm:text-sm touch-target-sm"
              >
                关闭
              </button>
            </div>
          </div>
        )}

        {/* 导入数据对话框 */}
        {showImport && (
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-white/5 rounded-xl border border-white/10">
            <h3 className="text-sm sm:text-base font-medium mb-2 sm:mb-3">导入数据</h3>
            <p className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">粘贴之前导出的 JSON 数据：</p>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="粘贴 JSON 数据..."
              className="w-full h-24 sm:h-32 px-2.5 sm:px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-xs font-mono text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
            <div className="mt-2 sm:mt-3 flex gap-2">
              <button
                onClick={handleImport}
                disabled={isProcessing || !importData.trim()}
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 text-xs sm:text-sm touch-target-sm"
              >
                {isProcessing ? '导入中...' : '导入'}
              </button>
              <button
                onClick={() => {
                  setShowImport(false)
                  setImportData('')
                }}
                className="px-3 sm:px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-xs sm:text-sm touch-target-sm"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
