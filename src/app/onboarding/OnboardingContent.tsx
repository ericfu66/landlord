'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Sparkles, ChevronRight, Wand2 } from 'lucide-react'

interface CharacterData {
  name: string
  age: string
  appearance: string
  personality: string
  background: string
}

interface ApiConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export default function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const step = searchParams.get('step') || 'character'
  
  const [currentStep, setCurrentStep] = useState(step)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [characterData, setCharacterData] = useState<CharacterData>({
    name: '',
    age: '',
    appearance: '',
    personality: '',
    background: ''
  })
  
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4'
  })

  const handleCharacterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/user/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(characterData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '保存失败')
      }

      // 进入下一步
      setCurrentStep('apikey')
      router.push('/onboarding?step=apikey')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApiSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/user/api-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiConfig)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '配置保存失败')
      }

      // 完成onboarding
      const completeRes = await fetch('/api/user/complete-onboarding', {
        method: 'POST'
      })

      if (!completeRes.ok) {
        throw new Error('完成引导失败')
      }

      router.push('/game')
    } catch (err) {
      setError(err instanceof Error ? err.message : '配置保存失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = async () => {
    if (currentStep === 'apikey') {
      // 跳过API配置，但完成onboarding
      await fetch('/api/user/complete-onboarding', { method: 'POST' })
      router.push('/game')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] relative overflow-hidden">
      {/* 背景效果 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/20 via-gray-900 to-blue-950/20" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl"
        >
          {/* 进度指示器 */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${currentStep === 'character' ? 'text-amber-400' : 'text-amber-400/60'}`}>
              <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center font-bold">
                1
              </div>
              <span className="text-sm">创建角色</span>
            </div>
            
            <div className="w-16 h-px bg-gradient-to-r from-amber-400/60 to-blue-400/60" />
            
            <div className={`flex items-center gap-2 ${currentStep === 'apikey' ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center font-bold">
                2
              </div>
              <span className="text-sm">API配置</span>
            </div>
          </div>

          {/* 步骤内容 */}
          <AnimatePresence mode="wait">
            {currentStep === 'character' ? (
              <motion.div
                key="character"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-4">
                    <User className="w-8 h-8 text-amber-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    创建你的角色
                  </h1>
                  <p className="text-gray-400">
                    自定义你的房东形象，这将影响游戏中的互动体验
                  </p>
                </div>

                <form onSubmit={handleCharacterSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        角色名称 *
                      </label>
                      <input
                        type="text"
                        required
                        value={characterData.name}
                        onChange={(e) => setCharacterData({...characterData, name: e.target.value})}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                                   focus:outline-none focus:ring-2 focus:ring-amber-500/50 
                                   focus:border-amber-500/30 text-white placeholder-gray-500"
                        placeholder="例如：陈大房东"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        年龄 *
                      </label>
                      <input
                        type="number"
                        required
                        min="18"
                        max="100"
                        value={characterData.age}
                        onChange={(e) => setCharacterData({...characterData, age: e.target.value})}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                                   focus:outline-none focus:ring-2 focus:ring-amber-500/50 
                                   focus:border-amber-500/30 text-white placeholder-gray-500"
                        placeholder="25"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      外貌描述 *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={characterData.appearance}
                      onChange={(e) => setCharacterData({...characterData, appearance: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                                 focus:outline-none focus:ring-2 focus:ring-amber-500/50 
                                 focus:border-amber-500/30 text-white placeholder-gray-500 resize-none"
                      placeholder="描述你的外貌特征，如：戴着金丝眼镜，穿着得体的西装，总是一副从容不迫的样子..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      性格特点 *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={characterData.personality}
                      onChange={(e) => setCharacterData({...characterData, personality: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                                 focus:outline-none focus:ring-2 focus:ring-amber-500/50 
                                 focus:border-amber-500/30 text-white placeholder-gray-500 resize-none"
                      placeholder="例如：精明能干、有点八卦、对房客既严格又关心..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      背景故事
                    </label>
                    <textarea
                      rows={3}
                      value={characterData.background}
                      onChange={(e) => setCharacterData({...characterData, background: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                                 focus:outline-none focus:ring-2 focus:ring-amber-500/50 
                                 focus:border-amber-500/30 text-white placeholder-gray-500 resize-none"
                      placeholder="可选：讲述你的房东生涯是如何开始的..."
                    />
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm text-center">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 
                               hover:from-amber-500 hover:to-amber-400
                               text-white font-medium rounded-xl transition-all duration-300
                               disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>保存中...</>
                    ) : (
                      <>
                        下一步
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="apikey"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-4">
                    <Wand2 className="w-8 h-8 text-blue-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    配置AI模型
                  </h1>
                  <p className="text-gray-400">
                    设置你的AI API，用于驱动游戏中的智能对话
                  </p>
                </div>

                <form onSubmit={handleApiSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      API Base URL
                    </label>
                    <input
                      type="text"
                      value={apiConfig.baseUrl}
                      onChange={(e) => setApiConfig({...apiConfig, baseUrl: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                                 focus:border-blue-500/30 text-white placeholder-gray-500"
                      placeholder="https://api.openai.com/v1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      支持 OpenAI、Azure、以及其他兼容的API服务商
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      API Key *
                    </label>
                    <input
                      type="password"
                      required
                      value={apiConfig.apiKey}
                      onChange={(e) => setApiConfig({...apiConfig, apiKey: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                                 focus:border-blue-500/30 text-white placeholder-gray-500"
                      placeholder="sk-..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      模型名称
                    </label>
                    <input
                      type="text"
                      value={apiConfig.model}
                      onChange={(e) => setApiConfig({...apiConfig, model: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                                 focus:border-blue-500/30 text-white placeholder-gray-500"
                      placeholder="gpt-4"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      例如：gpt-4, gpt-3.5-turbo, claude-3-opus-20240229
                    </p>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-sm text-blue-200/80">
                      <strong>提示：</strong> 
                      API Key仅存储在你的设备本地，不会上传到服务器。
                      你也可以先跳过此步骤，稍后在设置中配置。
                    </p>
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm text-center">{error}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="flex-1 py-3 border border-white/20 text-gray-300 
                                 hover:bg-white/5 rounded-xl transition-all duration-300"
                    >
                      跳过
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-500 
                                 hover:from-blue-500 hover:to-blue-400
                                 text-white font-medium rounded-xl transition-all duration-300
                                 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>配置中...</>
                      ) : (
                        <>
                          进入游戏
                          <Sparkles className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}