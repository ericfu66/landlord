'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Save, Settings, AlertCircle, CheckCircle } from 'lucide-react'

interface AIModel {
  id: string
  name: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  // 自动隐藏消息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      
      if (data.user?.api_config) {
        const config = JSON.parse(data.user.api_config)
        setBaseUrl(config.baseUrl || '')
        setApiKey(config.apiKey || '')
        setModel(config.model || '')
      }
    } catch (error) {
      console.error('Load config error:', error)
    }
  }

  const testConnection = async () => {
    if (!baseUrl || !apiKey) {
      setMessage({ type: 'error', text: '请填写 Base URL 和 API Key' })
      return
    }

    setTesting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey })
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: '连接成功' })
      } else {
        setMessage({ type: 'error', text: data.error || '连接失败' })
      }
    } catch {
      setMessage({ type: 'error', text: '连接测试失败' })
    } finally {
      setTesting(false)
    }
  }

  const fetchModels = async () => {
    if (!baseUrl || !apiKey) {
      setMessage({ type: 'error', text: '请先测试连接' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey, fetchOnly: true })
      })
      
      if (!res.ok) {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || '获取模型失败' })
        return
      }

      const data = await res.json()
      setModels(data.models || [])
      setMessage({ type: 'success', text: `获取到 ${data.models?.length || 0} 个模型` })
    } catch {
      setMessage({ type: 'error', text: '获取模型列表失败' })
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!baseUrl || !apiKey) {
      setMessage({ type: 'error', text: '请填写 Base URL 和 API Key' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey, model })
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: '配置已保存' })
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' })
      }
    } catch {
      setMessage({ type: 'error', text: '保存配置失败' })
    } finally {
      setLoading(false)
    }
  }

  const quickSave = async () => {
    setIsSaving(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quickSave' })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: '游戏已保存' })
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' })
      }
    } catch (error) {
      console.error('Quick save error:', error)
      setMessage({ type: 'error', text: '保存失败' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    if (!confirm('确定要登出吗？未保存的进度将丢失。')) return

    setIsLoggingOut(true)
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      
      if (res.ok) {
        router.push('/login')
      } else {
        setMessage({ type: 'error', text: '登出失败，请重试' })
        setIsLoggingOut(false)
      }
    } catch (error) {
      console.error('Logout error:', error)
      setMessage({ type: 'error', text: '登出失败' })
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 消息提示 */}
      {message && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all ${
          message.type === 'success' 
            ? 'bg-green-500/90 text-white' 
            : 'bg-red-500/90 text-white'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="glass-card p-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <Settings className="text-amber-400" size={20} />
            </div>
            <h1 className="text-2xl font-bold">设置</h1>
          </div>
          
          <div className="flex gap-2">
            {/* 快速保存按钮 */}
            <button
              onClick={quickSave}
              disabled={isSaving}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} />
              {isSaving ? '保存中...' : '保存游戏'}
            </button>
            
            {/* 登出按钮 */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              <LogOut size={16} />
              {isLoggingOut ? '登出中...' : '登出'}
            </button>
          </div>
        </div>

        {/* AI 设置区域 */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-white/10">
            <span className="text-lg">🤖</span>
            <h2 className="text-lg font-semibold">AI 配置</h2>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">API Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="sk-..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={testConnection}
              disabled={testing}
              className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
            <button
              onClick={fetchModels}
              disabled={loading}
              className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {loading ? '获取中...' : '获取可用模型'}
            </button>
          </div>

          {models.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">选择模型</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">请选择模型</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={saveConfig}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            保存 AI 配置
          </button>
        </div>

        {/* 游戏设置区域 */}
        <div className="mt-8 pt-6 border-t border-white/10 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-white/10">
            <span className="text-lg">🎮</span>
            <h2 className="text-lg font-semibold">游戏设置</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push('/game/saves')}
              className="flex-1 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
            >
              <span>💾</span>
              管理存档
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
