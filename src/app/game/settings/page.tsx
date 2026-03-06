'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Save, Settings, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Brain, TestTube } from 'lucide-react'

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
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [temperature, setTemperature] = useState('')
  const [topP, setTopP] = useState('')
  const [topK, setTopK] = useState('')
  const [maxTokens, setMaxTokens] = useState('')
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // RAG Memory settings
  const [ragEnabled, setRagEnabled] = useState(false)
  const [ragBaseUrl, setRagBaseUrl] = useState('')
  const [ragApiKey, setRagApiKey] = useState('')
  const [ragModel, setRagModel] = useState('BAAI/bge-m3')
  const [ragLoading, setRagLoading] = useState(false)
  const [ragTesting, setRagTesting] = useState(false)

  useEffect(() => {
    loadConfig()
    loadRagConfig()
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

      if (data.user?.apiConfig) {
        const config = data.user.apiConfig
        setBaseUrl(config.baseUrl || '')
        setApiKey(config.apiKey || '')
        setModel(config.model || '')
        if (config.temperature !== undefined) setTemperature(String(config.temperature))
        if (config.top_p !== undefined) setTopP(String(config.top_p))
        if (config.top_k !== undefined) setTopK(String(config.top_k))
        if (config.max_tokens !== undefined) setMaxTokens(String(config.max_tokens))
      }
    } catch (error) {
      console.error('Load config error:', error)
    }
  }

  const loadRagConfig = async () => {
    try {
      const res = await fetch('/api/rag')
      if (res.ok) {
        const data = await res.json()
        setRagEnabled(data.enabled)
        if (data.config) {
          setRagBaseUrl(data.config.baseUrl || '')
          setRagModel(data.config.model || 'BAAI/bge-m3')
          // API Key is masked, don't set it
        }
      }
    } catch (error) {
      console.error('Load RAG config error:', error)
    }
  }

  const testRagConnection = async () => {
    if (!ragBaseUrl || !ragApiKey) {
      setMessage({ type: 'error', text: '请填写 Embedding Base URL 和 API Key' })
      return
    }

    setRagTesting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/rag/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          baseUrl: ragBaseUrl, 
          apiKey: ragApiKey,
          model: ragModel 
        })
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: `连接成功！向量维度: ${data.dimension || '未知'}` })
      } else {
        setMessage({ type: 'error', text: data.error || '连接失败' })
      }
    } catch {
      setMessage({ type: 'error', text: '连接测试失败' })
    } finally {
      setRagTesting(false)
    }
  }

  const saveRagConfig = async () => {
    if (ragEnabled && (!ragBaseUrl || !ragApiKey)) {
      setMessage({ type: 'error', text: '启用 RAG 记忆需要提供 Embedding 配置' })
      return
    }

    setRagLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: ragEnabled,
          ...(ragBaseUrl && ragApiKey && {
            config: {
              baseUrl: ragBaseUrl,
              apiKey: ragApiKey,
              model: ragModel
            }
          })
        })
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'RAG 记忆设置已保存' })
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' })
      }
    } catch {
      setMessage({ type: 'error', text: '保存 RAG 设置失败' })
    } finally {
      setRagLoading(false)
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

  const buildConfigBody = () => ({
    baseUrl,
    apiKey,
    model: model || 'gpt-4o',
    ...(temperature !== '' && !isNaN(Number(temperature)) && { temperature: Number(temperature) }),
    ...(topP !== '' && !isNaN(Number(topP)) && { top_p: Number(topP) }),
    ...(topK !== '' && !isNaN(Number(topK)) && { top_k: Number(topK) }),
    ...(maxTokens !== '' && !isNaN(Number(maxTokens)) && { max_tokens: Number(maxTokens) }),
  })

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
        body: JSON.stringify(buildConfigBody())
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
    <div className="max-w-2xl mx-auto px-2 sm:px-0">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <Settings className="text-amber-400" size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">设置</h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={quickSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs sm:text-sm touch-target"
            >
              <Save size={14} />
              {isSaving ? '保存中...' : '保存游戏'}
            </button>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs sm:text-sm touch-target"
            >
              <LogOut size={14} />
              {isLoggingOut ? '登出中...' : '登出'}
            </button>
          </div>
        </div>

        {/* AI 设置区域 */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center gap-2 pb-3 sm:pb-4 border-b border-white/10">
            <span className="text-base sm:text-lg">🤖</span>
            <h2 className="text-base sm:text-lg font-semibold">AI 配置</h2>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">API Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              placeholder="sk-..."
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={testConnection}
              disabled={testing}
              className="flex-1 px-3 sm:px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 text-xs sm:text-sm touch-target"
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
            <button
              onClick={fetchModels}
              disabled={loading}
              className="flex-1 px-3 sm:px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 text-xs sm:text-sm touch-target"
            >
              {loading ? '获取中...' : '获取可用模型'}
            </button>
          </div>

          {/* 模型选择 + 手动输入 */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">模型</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              placeholder="手动输入模型名称，如 gpt-4o"
              list="model-list"
            />
            {models.length > 0 && (
              <datalist id="model-list">
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </datalist>
            )}
            {models.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">已获取 {models.length} 个模型，可从建议中选择或直接输入</p>
            )}
          </div>

          {/* 高级参数 */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors"
            >
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              高级参数（可选）
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">
                      Temperature
                      <span className="ml-1 text-gray-600">0~2</span>
                    </label>
                    <input
                      type="number"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      placeholder="0.7"
                      min="0"
                      max="2"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">
                      Top P
                      <span className="ml-1 text-gray-600">0~1</span>
                    </label>
                    <input
                      type="number"
                      value={topP}
                      onChange={(e) => setTopP(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      placeholder="留空使用默认"
                      min="0"
                      max="1"
                      step="0.05"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">
                      Top K
                      <span className="ml-1 text-gray-600">整数</span>
                    </label>
                    <input
                      type="number"
                      value={topK}
                      onChange={(e) => setTopK(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      placeholder="留空使用默认"
                      min="1"
                      step="1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">
                      Max Tokens
                      <span className="ml-1 text-gray-600">整数</span>
                    </label>
                    <input
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      placeholder="留空使用默认"
                      min="1"
                      step="256"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-600">留空的参数将使用模型默认值。部分参数不被所有模型支持。</p>
              </div>
            )}
          </div>

          <button
            onClick={saveConfig}
            disabled={loading}
            className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 text-sm touch-target"
          >
            保存 AI 配置
          </button>
        </div>

        {/* RAG 记忆设置区域 */}
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-2 pb-3 sm:pb-4 border-b border-white/10">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
              <Brain className="text-blue-400" size={18} />
            </div>
            <div className="flex-1">
              <h2 className="text-base sm:text-lg font-semibold">RAG 记忆增强</h2>
              <p className="text-xs text-gray-400">使用向量检索增强角色记忆</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ragEnabled}
                onChange={(e) => setRagEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {ragEnabled && (
            <div className="space-y-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-xs sm:text-sm text-gray-300 space-y-2">
                <p>启用后，每次对话将：</p>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>根据当前消息检索最相关的 3 条历史记忆</li>
                  <li>自动包含最新的 3 条记忆</li>
                  <li>将相关记忆注入到角色上下文中</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Embedding Base URL</label>
                <input
                  type="text"
                  value={ragBaseUrl}
                  onChange={(e) => setRagBaseUrl(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="https://api.siliconflow.cn/v1"
                />
                <p className="text-xs text-gray-500 mt-1">推荐使用 SiliconFlow 的 Embedding API</p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Embedding API Key</label>
                <input
                  type="password"
                  value={ragApiKey}
                  onChange={(e) => setRagApiKey(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="sk-..."
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Embedding 模型</label>
                <select
                  value={ragModel}
                  onChange={(e) => setRagModel(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="BAAI/bge-m3">BAAI/bge-m3 (推荐)</option>
                  <option value="BAAI/bge-large-zh-v1.5">BAAI/bge-large-zh-v1.5</option>
                  <option value="netease-youdao/bce-embedding-base_v1">netease-youdao/bce-embedding-base_v1</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={testRagConnection}
                  disabled={ragTesting}
                  className="flex-1 px-3 sm:px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 text-xs sm:text-sm touch-target flex items-center justify-center gap-1.5"
                >
                  <TestTube size={14} />
                  {ragTesting ? '测试中...' : '测试 Embedding 连接'}
                </button>
              </div>

              <button
                onClick={saveRagConfig}
                disabled={ragLoading}
                className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 text-sm touch-target"
              >
                保存 RAG 记忆设置
              </button>
            </div>
          )}
        </div>

        {/* 游戏设置区域 */}
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-2 pb-3 sm:pb-4 border-b border-white/10">
            <span className="text-base sm:text-lg">🎮</span>
            <h2 className="text-base sm:text-lg font-semibold">游戏设置</h2>
          </div>

          <button
            onClick={() => router.push('/game/saves')}
            className="w-full py-2.5 sm:py-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2 text-sm touch-target"
          >
            <span>💾</span>
            管理存档
          </button>
        </div>
      </div>
    </div>
  )
}
}
