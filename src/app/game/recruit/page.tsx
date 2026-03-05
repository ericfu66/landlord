'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGameState } from '../GameStateContext'
import { Sparkles, Users, AlertCircle, Zap, Layers, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react'

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

interface StagePersonality {
  阶段范围: string
  阶段名称: string
  人格表现: string
}

interface SpecialVariableData {
  变量名: string
  变量说明: string
  初始值: number
  最小值: number
  最大值: number
  分阶段人设: StagePersonality[]
}

interface Candidate {
  id: string
  character: CharacterTemplate
  specialVar?: SpecialVariableData
}

export default function RecruitPage() {
  const router = useRouter()
  const { refreshGameState } = useGameState()
  const [characterType, setCharacterType] = useState<'modern' | 'crossover'>('modern')
  const [traits, setTraits] = useState('')
  const [sourceDescription, setSourceDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [availableRooms, setAvailableRooms] = useState(0)
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [generatingSpecialVars, setGeneratingSpecialVars] = useState(false)
  
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

  const generateCandidates = async () => {
    if (!traits.trim()) {
      setError('请描述期望的角色特征')
      return
    }

    setLoading(true)
    setError('')
    setCandidates([])
    setSelectedCandidateId(null)
    setGeneratingSpecialVars(true)

    try {
      const selectedWorldview = worldviews.find(w => w.id === selectedWorldviewId)
      
      const res = await fetch('/api/recruit/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterType,
          traits,
          sourceDescription: characterType === 'crossover' ? sourceDescription : undefined,
          worldviewId: selectedWorldviewId,
          worldviewContent: selectedWorldview?.content,
          count: 3
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '生成失败')
        return
      }

      if (data.candidates && data.candidates.length > 0) {
        setCandidates(data.candidates)
        setSelectedCandidateId(data.candidates[0].id)
      } else {
        setError('未能生成候选角色，请重试')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
      setGeneratingSpecialVars(false)
    }
  }

  const confirmRecruit = async () => {
    if (!selectedCandidateId) return
    
    const selectedCandidate = candidates.find(c => c.id === selectedCandidateId)
    if (!selectedCandidate) return
    
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/recruit/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          character: selectedCandidate.character,
          worldviewId: selectedWorldviewId,
          specialVar: selectedCandidate.specialVar
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '招募失败')
        return
      }

      await refreshGameState()
      await fetchAvailableRooms()
      router.push('/game')
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId)
  const currentIndex = candidates.findIndex(c => c.id === selectedCandidateId)

  const nextCandidate = () => {
    const nextIndex = (currentIndex + 1) % candidates.length
    setSelectedCandidateId(candidates[nextIndex].id)
  }

  const prevCandidate = () => {
    const prevIndex = (currentIndex - 1 + candidates.length) % candidates.length
    setSelectedCandidateId(candidates[prevIndex].id)
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-0">
      <div className="glass-card p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">招募租客</h1>
        </div>

        {candidates.length === 0 ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Available rooms indicator */}
            <div className="glass-card p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-xs sm:text-sm text-gray-300">可用空房间</span>
                </div>
                <span className={`text-xl sm:text-2xl font-bold ${availableRooms > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {loadingRooms ? '...' : availableRooms}
                </span>
              </div>
              {availableRooms === 0 && !loadingRooms && (
                <p className="text-red-400 text-xs sm:text-sm mt-2 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  没有空房间！请先 <a href="/game/building" className="underline hover:text-red-300">去建造房间</a>
                </p>
              )}
            </div>
            
            {/* 世界观选择器 */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3">世界观（可选）</label>
              {loadingWorldviews ? (
                <div className="text-gray-400 text-xs sm:text-sm">加载中...</div>
              ) : worldviews.length === 0 ? (
                <div className="glass-card p-2.5 sm:p-3 bg-white/5">
                  <p className="text-gray-400 text-xs sm:text-sm">暂无世界观</p>
                  <a href="/game/worldviews" className="text-purple-400 text-xs sm:text-sm hover:underline">
                    去创建世界观 →
                  </a>
                </div>
              ) : (
                <div className="space-y-1.5 sm:space-y-2 max-h-32 sm:max-h-40 overflow-y-auto scrollbar-hide">
                  <button
                    onClick={() => setSelectedWorldviewId(null)}
                    className={`w-full p-2.5 sm:p-3 rounded-lg text-left transition-colors text-xs sm:text-sm ${
                      selectedWorldviewId === null
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <div className="font-medium">默认世界观</div>
                    <div className="opacity-80 text-[10px] sm:text-xs">不指定特定世界观</div>
                  </button>
                  {worldviews.map((worldview) => (
                    <button
                      key={worldview.id}
                      onClick={() => setSelectedWorldviewId(worldview.id)}
                      className={`w-full p-2.5 sm:p-3 rounded-lg text-left transition-colors text-xs sm:text-sm ${
                        selectedWorldviewId === worldview.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <div className="font-medium">{worldview.name}</div>
                      {worldview.description && (
                        <div className="opacity-80 text-[10px] sm:text-xs line-clamp-1">{worldview.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Character type */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3">角色类型</label>
              <div className="flex gap-2 sm:gap-4">
                <button
                  onClick={() => setCharacterType('modern')}
                  className={`flex-1 py-2.5 sm:py-3 rounded-lg transition-colors text-xs sm:text-sm touch-target ${
                    characterType === 'modern'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  🏙️ 现代角色
                </button>
                <button
                  onClick={() => setCharacterType('crossover')}
                  className={`flex-1 py-2.5 sm:py-3 rounded-lg transition-colors text-xs sm:text-sm touch-target ${
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
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">来源说明</label>
                <input
                  type="text"
                  value={sourceDescription}
                  onChange={(e) => setSourceDescription(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="例如：来自古代中国、来自二次元世界..."
                />
              </div>
            )}

            {/* Traits input */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">期望特征</label>
              <textarea
                value={traits}
                onChange={(e) => setTraits(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-24 sm:min-h-32 text-sm resize-none"
                placeholder="描述你期望的角色特征，例如：温柔善良的女生，喜欢读书..."
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs sm:text-sm">{error}</p>
            )}

            <button
              onClick={generateCandidates}
              disabled={loading || availableRooms === 0}
              className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 text-sm touch-target"
            >
              {loading ? '生成中...' : availableRooms === 0 ? '请先去建造房间' : '生成候选租客（3位）'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Candidate Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={prevCandidate}
                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                disabled={candidates.length <= 1}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="text-center">
                <span className="text-sm text-gray-400">候选租客 </span>
                <span className="text-lg font-bold text-purple-400">{currentIndex + 1}</span>
                <span className="text-sm text-gray-400"> / {candidates.length}</span>
              </div>
              
              <button
                onClick={nextCandidate}
                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                disabled={candidates.length <= 1}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Preview Cards */}
            <div className="flex justify-center gap-2">
              {candidates.map((candidate, index) => (
                <button
                  key={candidate.id}
                  onClick={() => setSelectedCandidateId(candidate.id)}
                  className={`relative p-2 rounded-lg transition-all ${
                    selectedCandidateId === candidate.id
                      ? 'bg-purple-600 ring-2 ring-purple-400'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div className="text-2xl">
                    {candidate.character.角色档案.基本信息.性别 === '女' ? '👩' : '👨'}
                  </div>
                  <div className="text-xs mt-1">{candidate.character.角色档案.基本信息.姓名}</div>
                  {selectedCandidateId === candidate.id && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <UserCheck className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {selectedCandidate && (
              <>
                {/* Selected Character preview */}
                <div className="text-center mb-4 sm:mb-6">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl sm:text-4xl">
                    {selectedCandidate.character.角色档案.基本信息.性别 === '女' ? '👩' : '👨'}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold">{selectedCandidate.character.角色档案.基本信息.姓名}</h2>
                  <p className="text-gray-400 text-sm">
                    {selectedCandidate.character.角色档案.基本信息.年龄}岁 · {selectedCandidate.character.角色档案.基本信息.身份}
                  </p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center mt-2">
                    {selectedCandidate.character.角色档案.基本信息.标签.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] sm:text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                  {selectedWorldviewId && (
                    <p className="text-purple-400 text-xs sm:text-sm mt-2">
                      世界观: {worldviews.find(w => w.id === selectedWorldviewId)?.name}
                    </p>
                  )}
                </div>

                {/* Character details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 text-xs sm:text-sm">
                  <div className="glass-card p-3 sm:p-4">
                    <h3 className="font-bold mb-1.5 sm:mb-2">外貌特征</h3>
                    <p className="text-gray-300 line-clamp-3">{selectedCandidate.character.角色档案.外貌特征.整体印象}</p>
                  </div>
                  
                  <div className="glass-card p-3 sm:p-4">
                    <h3 className="font-bold mb-1.5 sm:mb-2">性格特点</h3>
                    <p className="text-gray-300 line-clamp-3">{selectedCandidate.character.角色档案.性格特点.核心特质}</p>
                  </div>
                  
                  <div className="glass-card p-3 sm:p-4">
                    <h3 className="font-bold mb-1.5 sm:mb-2">背景设定</h3>
                    <p className="text-gray-300 line-clamp-3">{selectedCandidate.character.角色档案.背景设定.家庭背景}</p>
                  </div>
                  
                  <div className="glass-card p-3 sm:p-4">
                    <h3 className="font-bold mb-1.5 sm:mb-2">语言特征</h3>
                    <p className="text-gray-300 line-clamp-3">{selectedCandidate.character.角色档案.语言特征.说话习惯}</p>
                  </div>
                </div>

                {/* Special Variable Section */}
                {generatingSpecialVars && (
                  <div className="glass-card p-4 sm:p-6 border border-yellow-500/30 bg-yellow-500/5">
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full" />
                      <span className="text-yellow-400 text-sm font-medium">分阶段人设生成中...</span>
                    </div>
                  </div>
                )}

                {selectedCandidate.specialVar && !generatingSpecialVars && (
                  <div className="glass-card p-4 sm:p-6 border border-purple-500/30">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-purple-400" />
                      <h3 className="font-bold text-purple-400">特殊变量：{selectedCandidate.specialVar.变量名}</h3>
                      <span className="text-xs text-gray-400">({selectedCandidate.specialVar.初始值}/{selectedCandidate.specialVar.最大值})</span>
                    </div>
                    <p className="text-gray-300 text-xs sm:text-sm mb-4">{selectedCandidate.specialVar.变量说明}</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
                        <Layers className="w-4 h-4" />
                        <span>分阶段人设（5套）：</span>
                      </div>
                      <div className="space-y-2">
                        {selectedCandidate.specialVar.分阶段人设.map((stage, index) => (
                          <div 
                            key={index} 
                            className={`p-3 rounded-lg text-xs sm:text-sm ${
                              index === 0 
                                ? 'bg-purple-500/20 border border-purple-500/30' 
                                : 'bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-purple-300">{stage.阶段名称}</span>
                              <span className="text-gray-500">({stage.阶段范围})</span>
                              {index === 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/30 rounded text-purple-300">
                                  初始
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 line-clamp-2">{stage.人格表现}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-blue-300 text-xs">
                        💡 提示：{selectedCandidate.specialVar.变量名}会随着对话动态变化，当前处于初始阶段。分阶段人设已插入到角色设定中。
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {error && (
              <p className="text-red-400 text-xs sm:text-sm">{error}</p>
            )}

            <div className="space-y-3 sm:space-y-4">
              {availableRooms === 0 && !loadingRooms && (
                <div className="glass-card p-3 sm:p-4 border border-red-500/30">
                  <p className="text-red-400 text-xs sm:text-sm text-center">
                    ⚠️ 没有空房间！请先 <a href="/game/building" className="underline hover:text-red-300">去建造房间</a>
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <button
                  onClick={() => {
                    setCandidates([])
                    setSelectedCandidateId(null)
                  }}
                  className="flex-1 py-2.5 sm:py-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm touch-target"
                >
                  重新生成
                </button>
                <button
                  onClick={confirmRecruit}
                  disabled={loading || availableRooms === 0 || generatingSpecialVars || !selectedCandidateId}
                  className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 text-sm touch-target"
                >
                  {loading ? '招募中...' : generatingSpecialVars ? '等待生成完成...' : `确认招募${selectedCandidate ? `「${selectedCandidate.character.角色档案.基本信息.姓名}」` : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
