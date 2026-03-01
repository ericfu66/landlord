'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import WeChatUI from '@/components/game/WeChatUI'
import VariableDisplay from '@/components/game/VariableDisplay'
import { getInteractionModeInfo } from '@/lib/services/preset-client'
import { InteractionMode } from '@/types/preset'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface CharacterData {
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
  mood: string
  rent?: number
}

function InteractContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const characterName = searchParams.get('character')
  
  const [character, setCharacter] = useState<CharacterData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<InteractionMode>('daily')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (characterName) {
      fetchCharacterData()
    }
  }, [characterName])

  const fetchCharacterData = async () => {
    try {
      const res = await fetch(`/api/characters/${encodeURIComponent(characterName!)}`)
      if (res.ok) {
        const data = await res.json()
        setCharacter(data.character)
      } else {
        router.push('/game/characters')
      }
    } catch (error) {
      console.error('Fetch character error:', error)
    }
  }

  const handleSend = async (content: string) => {
    if (!character || loading) return

    setLoading(true)
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch('/api/interact/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: character.name,
          mode,
          userInput: content
        })
      })

      const data = await res.json()

      if (res.ok) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date()
        }
        setMessages((prev) => [...prev, assistantMsg])

        if (data.toolCall) {
          setUpdating(true)
          await fetch('/api/variables/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ characterName: character.name })
          })
          await fetchCharacterData()
          setUpdating(false)
        }
      } else {
        alert(data.error || '发送失败')
      }
    } catch (error) {
      console.error('Send message error:', error)
      alert('发送失败')
    } finally {
      setLoading(false)
    }
  }

  if (!characterName) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-6 text-center">
          <p className="text-gray-400 mb-4">请选择一个角色进行互动</p>
          <button
            onClick={() => router.push('/game/characters')}
            className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-500"
          >
            查看角色列表
          </button>
        </div>
      </div>
    )
  }

  if (!character) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12 text-gray-400">加载中...</div>
      </div>
    )
  }

  const modes: InteractionMode[] = ['daily', 'date', 'flirt', 'free']

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white"
        >
          ← 返回
        </button>
        <h1 className="text-xl font-bold">{character.name}</h1>
        <div className="w-12" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="glass-card h-96 md:h-[500px] flex flex-col">
            <div className="flex gap-2 p-3 border-b border-white/10">
              {modes.map((m) => {
                const info = getInteractionModeInfo(m, character.favorability)
                return (
                  <button
                    key={m}
                    onClick={() => info.unlocked && setMode(m)}
                    disabled={!info.unlocked}
                    className={`px-3 py-1 rounded text-sm ${
                      mode === m
                        ? 'bg-purple-600 text-white'
                        : info.unlocked
                        ? 'bg-white/10 hover:bg-white/20'
                        : 'bg-white/5 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {info.name}
                    {!info.unlocked && ' 🔒'}
                  </button>
                )
              })}
            </div>
            <div className="flex-1">
              <WeChatUI
                characterName={character.name}
                messages={messages}
                onSend={handleSend}
                loading={loading}
              />
            </div>
          </div>
        </div>

        <div>
          <VariableDisplay
            favorability={character.favorability}
            obedience={character.obedience}
            corruption={character.corruption}
            mood={character.mood}
            updating={updating}
          />

          <div className="glass-card p-4 mt-4">
            <h3 className="font-bold mb-2">角色信息</h3>
            <div className="text-sm space-y-1 text-gray-300">
              <p>年龄：{character.template.角色档案.基本信息.年龄}</p>
              <p>身份：{character.template.角色档案.基本信息.身份}</p>
              <p>租金：💰 {character.rent || 200}/天</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InteractPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">加载中...</div>}>
      <InteractContent />
    </Suspense>
  )
}