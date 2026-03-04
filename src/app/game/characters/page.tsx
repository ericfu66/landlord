'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ImageIcon, Wand2 } from 'lucide-react'
import Image from 'next/image'

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
      性格?: string
      背景故事?: string
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

// Mood to color mapping for border glow
const moodColors: Record<string, string> = {
  '开心': '#ffb6c1',
  '兴奋': '#ff69b4',
  '平静': '#87ceeb',
  '害羞': '#dda0dd',
  '生气': '#ff6b6b',
  '难过': '#778899',
  '惊讶': '#ffd700',
  '困惑': '#d3d3d3',
  'default': '#ffb6c1'
}

// Mood to gradient mapping for background
const moodGradients: Record<string, string> = {
  '开心': 'linear-gradient(135deg, #ffe4ec 0%, #ffd6e8 100%)',
  '兴奋': 'linear-gradient(135deg, #ffd0e8 0%, #ffc0eb 100%)',
  '平静': 'linear-gradient(135deg, #e0f0ff 0%, #d6e8ff 100%)',
  '害羞': 'linear-gradient(135deg, #ffe0f0 0%, #ffd0e8 100%)',
  '生气': 'linear-gradient(135deg, #ffe0e0 0%, #ffd0d0 100%)',
  '难过': 'linear-gradient(135deg, #e8e8f0 0%, #e0e0ea 100%)',
  '惊讶': 'linear-gradient(135deg, #fff8e0 0%, #fff0d0 100%)',
  '困惑': 'linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 100%)',
  'default': 'linear-gradient(135deg, #ffe4ec 0%, #ffd6e8 100%)'
}

function CharacterCard({ 
  character, 
  index, 
  onClick, 
  onGenerate 
}: { 
  character: Character
  index: number
  onClick: () => void
  onGenerate: (e: React.MouseEvent) => void
}) {
  const basicInfo = character.template?.角色档案?.基本信息 || {}
  const name = basicInfo.姓名 || character.name
  const age = basicInfo.年龄 || 20
  const gender = basicInfo.性别 || '女'
  const identity = basicInfo.身份 || '租客'
  const tags = basicInfo.标签 || []
  
  const moodColor = moodColors[character.mood] || moodColors.default
  const moodGradient = moodGradients[character.mood] || moodGradients.default
  
  const hasPortrait = !!character.portraitUrl
  
  return (
    <div 
      className="group relative cursor-pointer"
      onClick={onClick}
      style={{ 
        animationDelay: `${index * 100}ms`,
        '--mood-color': moodColor
      } as React.CSSProperties}
    >
      {/* Card frame with mood-based border */}
      <div 
        className="relative overflow-hidden rounded-2xl transition-all duration-500"
        style={{
          background: moodGradient,
          boxShadow: `0 0 0 3px ${moodColor}40, 0 20px 60px ${moodColor}30`,
        }}
      >
        {/* Decorative corner elements */}
        <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none z-10">
          <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: moodColor }} />
        </div>
        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none z-10">
          <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: moodColor }} />
        </div>
        <div className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none z-10">
          <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: moodColor }} />
        </div>
        <div className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none z-10">
          <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: moodColor }} />
        </div>

        {/* Main content area */}
        <div className="relative aspect-[3/4] overflow-hidden">
          {hasPortrait ? (
            <>
              {/* Portrait image */}
              <img 
                src={character.portraitUrl}
                alt={name}
                className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
              />
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </>
          ) : (
            /* Placeholder with generate button */
            <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: moodGradient }}>
              <div className="text-8xl mb-4 filter drop-shadow-lg">
                {gender === '女' ? '👩' : '👨'}
              </div>
              <button
                onClick={onGenerate}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 active:scale-95"
                style={{ 
                  background: 'rgba(255,255,255,0.9)',
                  color: '#333',
                  boxShadow: `0 4px 20px ${moodColor}50`
                }}
              >
                <Sparkles className="w-4 h-4" />
                生成立绘
              </button>
            </div>
          )}

          {/* Character info overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Name with decorative background */}
            <div className="relative mb-2">
              <h3 
                className="text-2xl font-bold text-white drop-shadow-lg"
                style={{ 
                  fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif',
                  textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                }}
              >
                {name}
              </h3>
              {/* Decorative underline */}
              <div 
                className="h-0.5 w-20 mt-1 rounded-full"
                style={{ background: `linear-gradient(90deg, ${moodColor}, transparent)` }}
              />
            </div>

            {/* Tags - minimal style */}
            <div className="flex gap-1.5 flex-wrap mb-2">
              {tags.slice(0, 3).map((tag, i) => (
                <span 
                  key={i}
                  className="px-2 py-0.5 text-xs rounded-full backdrop-blur-sm"
                  style={{ 
                    background: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    border: `1px solid ${moodColor}60`
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Subtle stats */}
            <div className="flex items-center gap-4 text-xs text-white/80">
              <span>{age}岁</span>
              <span>·</span>
              <span>{identity}</span>
            </div>

            {/* Favorability heart - minimal */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1">
              <span className="text-lg">💕</span>
              <span className="text-white font-medium">{character.favorability}</span>
            </div>
          </div>

          {/* Mood indicator - subtle corner badge */}
          <div 
            className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
            style={{ 
              background: moodColor,
              color: '#fff',
              boxShadow: `0 2px 10px ${moodColor}80`
            }}
          >
            {character.mood}
          </div>
        </div>
      </div>

      {/* Hover effect - glow pulse */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          boxShadow: `0 0 40px ${moodColor}40, inset 0 0 60px ${moodColor}10`
        }}
      />
    </div>
  )
}

export default function CharactersPage() {
  const router = useRouter()
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)

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

  const handleGeneratePortrait = async (e: React.MouseEvent, characterName: string) => {
    e.stopPropagation()
    setGenerating(characterName)
    
    try {
      const res = await fetch('/api/characters/generate-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName })
      })

      const data = await res.json()
      
      if (res.ok) {
        // Update character with new portrait
        setCharacters(prev => prev.map(char => 
          char.name === characterName 
            ? { ...char, portraitUrl: data.imageUrl }
            : char
        ))
      } else {
        alert(data.error || '生成失败')
      }
    } catch (error) {
      console.error('Generate portrait error:', error)
      alert('生成立绘失败')
    } finally {
      setGenerating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div 
            className="w-20 h-20 rounded-full mx-auto mb-4 animate-pulse"
            style={{
              background: 'linear-gradient(135deg, #ffb6c1 0%, #ffc0cb 100%)',
              boxShadow: '0 0 30px #ffb6c150'
            }}
          />
          <p className="text-pink-300 text-lg">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 pb-32">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="text-center mb-8">
          <h1 
            className="text-4xl md:text-5xl font-bold mb-2"
            style={{
              fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif',
              background: 'linear-gradient(135deg, #ffb6c1 0%, #ff69b4 50%, #da70d6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 40px #ffb6c130'
            }}
          >
            我的租客
          </h1>
          <p className="text-pink-300/60 text-sm">
            共 {characters.length} 位租客
          </p>
        </div>

        {characters.length === 0 ? (
          <div className="text-center py-20">
            <div 
              className="w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center text-6xl"
              style={{
                background: 'linear-gradient(135deg, #ffb6c1 0%, #ffc0cb 100%)',
                boxShadow: '0 0 40px #ffb6c150'
              }}
            >
              🏠
            </div>
            <p className="text-pink-200/60 mb-6 text-lg">暂无租客，快去招募吧</p>
            <button
              onClick={() => router.push('/game/recruit')}
              className="px-8 py-3 rounded-full font-medium transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #ffb6c1 0%, #ff69b4 100%)',
                color: '#fff',
                boxShadow: '0 4px 20px #ff69b450'
              }}
            >
              招募租客
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {characters.map((char, index) => (
              <CharacterCard
                key={char.name}
                character={char}
                index={index}
                onClick={() => handleCharacterClick(char.name)}
                onGenerate={(e) => handleGeneratePortrait(e, char.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating recruit button */}
      {characters.length > 0 && (
        <button
          onClick={() => router.push('/game/recruit')}
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95 z-40"
          style={{
            background: 'linear-gradient(135deg, #ffb6c1 0%, #ff69b4 100%)',
            boxShadow: '0 4px 20px #ff69b450, 0 0 40px #ffb6c130'
          }}
        >
          <Sparkles className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Loading overlay for generation */}
      {generating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 animate-spin"
              style={{
                border: '3px solid rgba(255,182,193,0.3)',
                borderTopColor: '#ffb6c1'
              }}
            />
            <p className="text-pink-300">正在生成立绘...</p>
          </div>
        </div>
      )}
    </div>
  )
}
