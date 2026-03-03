'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGameState } from '../GameStateContext'

interface WorldView {
  id: number
  name: string
  description: string
  content: string
}

interface CharacterTemplate {
  角色档案: {
    基本信息: {
      姓名: string
      年龄: number
      性别: string
      身份: string
      标签: string[]
    }
    外貌特征: {
      整体印象: string
      发型: string
      面部: string
      身材: string
      穿着打扮: string
    }
    性格特点: {
      核心特质: string
      表现形式: string
      对用户的表现: string
    }
    背景设定: {
      家庭背景: string
      经济状况: string
      成长经历: string
      社交关系: string
    }
    语言特征: {
      音色: string
      说话习惯: string
      口头禅: string
    }
    关系设定: {
      与用户的关系: string
      相识过程: string
      互动方式: string
    }
  }
  来源类型: 'modern' | 'crossover'
  穿越说明?: string
}

export default function RecruitPage() {
  const router = useRouter()
  const { refreshGameState } = useGameState()
  const [characterType, setCharacterType] = useState<'modern' | 'crossover'>('modern')
  const [traits, setTraits] = useState('')
  const [sourceDescription, setSourceDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [character, setCharacter] = useState<CharacterTemplate | null>(null)
  const [error, setError] = useState('')
  const [availableRooms, setAvailableRooms] = useState(0)
  const [loadingRooms, setLoadingRooms] = useState(true)
  
  // 世界观相关状态
  const [worldviews, setWorldviews] = useState<WorldView[]>([])
  const [selectedWorldviewId, setSelectedWorldviewId] = useState<number | null>(null)
  const [loadingWorldviews, setLoadingWorldviews] = useState(true)

  useEffect(() => {
    fetchAvailableRooms()
    fetchWorldviews()
  }, [])

  const fetchAvailableRooms = async () => {
    try {
      const res = await fetch('/api/recruit/confirm')
      if (res.ok) {
        const data = await res.json()
        setAvailableRooms(data.availableCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch available rooms:', error)
    } finally {
      setLoadingRooms(false)
    }
  }

  const fetchWorldviews = async () => {
    try {
      const res = await fetch('/api/worldviews')
      if (res.ok) {
        const data = await res.json()
        setWorldviews(data.worldviews || [])
      }
    } catch (error) {
      console.error('Failed to fetch worldviews:', error)
    } finally {
      setLoadingWorldviews(false)
    }
  }

  const generateCharacter = async () => {
    if (!traits.trim()) {
      setError('请描述期望的角色特征')
      return
    }

    setLoading(true)
    setError('')

    try {
      const selectedWorldview = worldviews.find(w => w.id === selectedWorldviewId)
      
      const res = await fetch('/api/recruit/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterType,
          traits,
          sourceDescription: characterType === 'crossover' ? sourceDescription : undefined,
          worldviewId: selectedWorldviewId,
          worldviewContent: selectedWorldview?.content
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '生成失败')
        return
      }

      setCharacter(data.character)
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  const confirmRecruit = async () => {
    if (!character) return
    
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/recruit/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          character,
          worldviewId: selectedWorldviewId 
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '招募失败')
        return
      }

      await refreshGameState()
      // 刷新空房间数量
      await fetchAvailableRooms()
      router.push('/game')
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-card p-6 mb-6">
        <h1 className="text-2xl font-bold mb-6">招募租客</h1>

        {!character ? (
          <div className="space-y-6">
            <div className="glass-card p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">可用空房间</span>
                <span className={`text-2xl font-bold ${availableRooms > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {loadingRooms ? '...' : availableRooms}
                </span>
              </div>
              {availableRooms === 0 && !loadingRooms && (
                <p className="text-red-400 text-sm mt-2">
                  没有空房间！请先 <a href="/game/building" className="underline hover:text-red-300">去建造房间</a>
                </p>
              )}
            </div>
            
            {/* 世界观选择器 */}
            <div>
              <label className="block text-sm font-medium mb-3">世界观（可选）</label>
              {loadingWorldviews ? (
                <div className="text-gray-400 text-sm">加载中...</div>
              ) : worldviews.length === 0 ? (
                <div className="glass-card p-3 bg-white/5">
                  <p className="text-gray-400 text-sm">暂无世界观</p>
                  <a href="/game/worldviews" className="text-purple-400 text-sm hover:underline">
                    去创建世界观 →
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedWorldviewId(null)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedWorldviewId === null
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <div className="font-medium">默认世界观</div>
                    <div className="text-sm opacity-80">不指定特定世界观</div>
                  </button>
                  {worldviews.map((worldview) => (
                    <button
                      key={worldview.id}
                      onClick={() => setSelectedWorldviewId(worldview.id)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedWorldviewId === worldview.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <div className="font-medium">{worldview.name}</div>
                      {worldview.description && (
                        <div className="text-sm opacity-80">{worldview.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">角色类型</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setCharacterType('modern')}
                  className={`flex-1 py-3 rounded-lg transition-colors ${
                    characterType === 'modern'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  🏙️ 现代角色
                </button>
                <button
                  onClick={() => setCharacterType('crossover')}
                  className={`flex-1 py-3 rounded-lg transition-colors ${
                    characterType === 'crossover'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  ⚔️ 跨时空角色
                </button>
              </div>
            </div>

            {characterType === 'crossover' && (
              <div>
                <label className="block text-sm font-medium mb-2">来源说明</label>
                <input
                  type="text"
                  value={sourceDescription}
                  onChange={(e) => setSourceDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="例如：来自古代中国、来自二次元世界..."
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">期望特征</label>
              <textarea
                value={traits}
                onChange={(e) => setTraits(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-32"
                placeholder="描述你期望的角色特征，例如：温柔善良的女生，喜欢读书..."
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              onClick={generateCharacter}
              disabled={loading || availableRooms === 0}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '生成中...' : availableRooms === 0 ? '请先去建造房间' : '生成角色'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl">
                {character.角色档案.基本信息.性别 === '女' ? '👩' : '👨'}
              </div>
              <h2 className="text-2xl font-bold">{character.角色档案.基本信息.姓名}</h2>
              <p className="text-gray-400">
                {character.角色档案.基本信息.年龄}岁 · {character.角色档案.基本信息.身份}
              </p>
              <div className="flex gap-2 justify-center mt-2">
                {character.角色档案.基本信息.标签.map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-white/10 rounded-full text-xs">
                    {tag}
                  </span>
                ))}
              </div>
              {selectedWorldviewId && (
                <p className="text-purple-400 text-sm mt-2">
                  世界观: {worldviews.find(w => w.id === selectedWorldviewId)?.name}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="glass-card p-4">
                <h3 className="font-bold mb-2">外貌特征</h3>
                <p className="text-gray-300">{character.角色档案.外貌特征.整体印象}</p>
              </div>
              
              <div className="glass-card p-4">
                <h3 className="font-bold mb-2">性格特点</h3>
                <p className="text-gray-300">{character.角色档案.性格特点.核心特质}</p>
              </div>
              
              <div className="glass-card p-4">
                <h3 className="font-bold mb-2">背景设定</h3>
                <p className="text-gray-300">{character.角色档案.背景设定.家庭背景}</p>
              </div>
              
              <div className="glass-card p-4">
                <h3 className="font-bold mb-2">语言特征</h3>
                <p className="text-gray-300">{character.角色档案.语言特征.说话习惯}</p>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="space-y-4">
              {availableRooms === 0 && !loadingRooms && (
                <div className="glass-card p-4 border border-red-500/30">
                  <p className="text-red-400 text-sm text-center">
                    ⚠️ 没有空房间！请先 <a href="/game/building" className="underline hover:text-red-300">去建造房间</a>
                  </p>
                </div>
              )}
              
              <div className="flex gap-4">
                <button
                  onClick={() => setCharacter(null)}
                  className="flex-1 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                >
                  重新生成
                </button>
                <button
                  onClick={confirmRecruit}
                  disabled={loading || availableRooms === 0}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? '招募中...' : '确认招募'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
