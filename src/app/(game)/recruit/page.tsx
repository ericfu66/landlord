'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  const [characterType, setCharacterType] = useState<'modern' | 'crossover'>('modern')
  const [traits, setTraits] = useState('')
  const [sourceDescription, setSourceDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [character, setCharacter] = useState<CharacterTemplate | null>(null)
  const [error, setError] = useState('')

  const generateCharacter = async () => {
    if (!traits.trim()) {
      setError('请描述期望的角色特征')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/recruit/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterType,
          traits,
          sourceDescription: characterType === 'crossover' ? sourceDescription : undefined
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
        body: JSON.stringify({ character })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '招募失败')
        return
      }

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
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '生成中...' : '生成角色'}
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

            <div className="flex gap-4">
              <button
                onClick={() => setCharacter(null)}
                className="flex-1 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                重新生成
              </button>
              <button
                onClick={confirmRecruit}
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? '招募中...' : '确认招募'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}