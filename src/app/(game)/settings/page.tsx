'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadConfig()
  }, [])

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
      setMessage('请填写 Base URL 和 API Key')
      return
    }

    setTesting(true)
    setMessage('')

    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey })
      })

      const data = await res.json()

      if (data.success) {
        setMessage('连接成功')
      } else {
        setMessage(data.error || '连接失败')
      }
    } catch {
      setMessage('连接测试失败')
    } finally {
      setTesting(false)
    }
  }

  const fetchModels = async () => {
    if (!baseUrl || !apiKey) {
      setMessage('请先测试连接')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('/api/ai/models')
      
      if (!res.ok) {
        const data = await res.json()
        setMessage(data.error || '获取模型失败')
        return
      }

      const data = await res.json()
      setModels(data.models || [])
      setMessage(`获取到 ${data.models?.length || 0} 个模型`)
    } catch {
      setMessage('获取模型列表失败')
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!baseUrl || !apiKey) {
      setMessage('请填写 Base URL 和 API Key')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey, model })
      })

      const data = await res.json()

      if (data.success) {
        setMessage('配置已保存')
      } else {
        setMessage(data.error || '保存失败')
      }
    } catch {
      setMessage('保存配置失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">AI 设置</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            返回
          </button>
        </div>

        <div className="glass-card p-6 space-y-6">
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

          {message && (
            <p className={`text-sm ${message.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
              {message}
            </p>
          )}

          <button
            onClick={saveConfig}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            保存配置
          </button>
        </div>
      </div>
    </main>
  )
}