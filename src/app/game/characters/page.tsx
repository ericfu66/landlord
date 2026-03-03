'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CharacterCard from '@/components/game/CharacterCard'

interface Character {
  name: string
  template: {
    角色档案: {
      基本信息: {
        姓名: string
        年龄: number
        性别: string
        身份: string
        标签: string[]
      }
    }
  }
  favorability: number
  obedience: number
  corruption: number
  rent: number
  mood: string
  portraitUrl?: string
  roomId?: number
}

export default function CharactersPage() {
  const router = useRouter()
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCharacters()
  }, [])

  const fetchCharacters = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/characters')
      if (res.ok) {
        const data = await res.json()
        setCharacters(data.characters || [])
      }
    } catch (error) {
      console.error('Fetch characters error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCharacterClick = (name: string) => {
    router.push(`/game/interact?character=${encodeURIComponent(name)}`)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12 text-gray-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-card p-6 mb-6">
        <h1 className="text-2xl font-bold mb-6">我的租客</h1>

        {characters.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">暂无租客</p>
            <button
              onClick={() => router.push('/game/recruit')}
              className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors"
            >
              去招募
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {characters.map((char) => (
              <CharacterCard
                key={char.name}
                name={char.template.角色档案.基本信息.姓名}
                age={char.template.角色档案.基本信息.年龄}
                gender={char.template.角色档案.基本信息.性别}
                identity={char.template.角色档案.基本信息.身份}
                tags={char.template.角色档案.基本信息.标签}
                portraitUrl={char.portraitUrl}
                favorability={char.favorability}
                mood={char.mood}
                rent={char.rent}
                onClick={() => handleCharacterClick(char.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}