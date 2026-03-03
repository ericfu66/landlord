'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import GalgameDialog from '@/components/game/GalgameDialog'
import WeChatUI from '@/components/game/WeChatUI'
import VariableDisplay from '@/components/game/VariableDisplay'
import { getInteractionModeInfo } from '@/lib/services/preset-client'
import { InteractionMode } from '@/types/preset'
import { DiaryEntry } from '@/types/diary'
import { useGameState } from '../GameStateContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Choice {
  id: string
  text: string
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

// Galgame modes
const GALGAME_MODES: InteractionMode[] = ['daily', 'date']
// WeChat modes
const WECHAT_MODES: InteractionMode[] = ['flirt', 'free']

function InteractContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refreshGameState } = useGameState()
  const characterName = searchParams.get('character')

  const [character, setCharacter] = useState<CharacterData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [choices, setChoices] = useState<Choice[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<InteractionMode>('daily')
  const [updating, setUpdating] = useState(false)
  
  // Diary related states
  const [diaries, setDiaries] = useState<DiaryEntry[]>([])
  const [diaryLoading, setDiaryLoading] = useState(false)
  const [showDiaryModal, setShowDiaryModal] = useState(false)
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntry | null>(null)
  const [diaryMessage, setDiaryMessage] = useState<string>('')

  useEffect(() => {
    if (characterName) {
      fetchCharacterData()
      fetchDiaries()
    }
  }, [characterName])

  const fetchDiaries = async () => {
    if (!characterName) return
    try {
      const res = await fetch(`/api/diary?character=${encodeURIComponent(characterName)}&limit=5`)
      if (res.ok) {
        const data = await res.json()
        setDiaries(data.diaries || [])
      }
    } catch (error) {
      console.error('Fetch diaries error:', error)
    }
  }

  const handleAskDiary = async () => {
    if (!character || diaryLoading) return
    setDiaryLoading(true)
    setDiaryMessage('')
    
    try {
      const res = await fetch('/api/diary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ask',
          characterName: character.name
        })
      })
      
      const data = await res.json()
      
      if (res.ok && data.diary) {
        setDiaryMessage(data.message)
        setSelectedDiary(data.diary)
        setShowDiaryModal(true)
        // Refresh diary list
        await fetchDiaries()
      } else {
        setDiaryMessage(data.error || '获取日记失败')
      }
    } catch (error) {
      console.error('Ask diary error:', error)
      setDiaryMessage('获取日记失败')
    } finally {
      setDiaryLoading(false)
    }
  }

  const handlePeekDiary = async () => {
    if (!character || diaryLoading) return
    setDiaryLoading(true)
    setDiaryMessage('')
    
    try {
      const res = await fetch('/api/diary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'peek',
          characterName: character.name
        })
      })
      
      const data = await res.json()
      
      if (res.ok && data.diary) {
        setDiaryMessage(data.message)
        setSelectedDiary(data.diary)
        setShowDiaryModal(true)
        // Refresh diary list
        await fetchDiaries()
      } else {
        setDiaryMessage(data.error || '偷看日记失败')
      }
    } catch (error) {
      console.error('Peek diary error:', error)
      setDiaryMessage('偷看日记失败')
    } finally {
      setDiaryLoading(false)
    }
  }

  const handleViewDiary = (diary: DiaryEntry) => {
    setSelectedDiary(diary)
    setShowDiaryModal(true)
  }

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

    // Clear choices when user sends a message
    setChoices([])

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

        // Handle choices if provided (galgame mode)
        if (data.choices && Array.isArray(data.choices)) {
          setChoices(data.choices.map((c: string, i: number) => ({
            id: `choice-${i}`,
            text: c
          })))
        }

        if (data.toolCall) {
          setUpdating(true)
          await fetch('/api/variables/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ characterName: character.name })
          })
          await fetchCharacterData()
          await refreshGameState()
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

  const handleChoice = async (choiceId: string) => {
    const choice = choices.find(c => c.id === choiceId)
    if (!choice) return

    // Clear choices and send the choice text
    setChoices([])
    await handleSend(choice.text)
  }

  const handleModeChange = (newMode: InteractionMode) => {
    setMode(newMode)
    // Clear messages when switching modes
    setMessages([])
    setChoices([])
  }

  const isGalgameMode = GALGAME_MODES.includes(mode)

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

  if (isGalgameMode) {
    // Galgame mode (daily, date)
    return (
      <GalgameDialog
        characterName={character.name}
        characterImage={character.template.角色档案.基本信息.标签?.[0]}
        messages={messages}
        choices={choices}
        onSend={handleSend}
        onChoice={handleChoice}
        onModeChange={handleModeChange}
        loading={loading}
        favorability={character.favorability}
        mode={mode}
      />
    )
  }

  // WeChat mode (flirt, free)
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
                    onClick={() => info.unlocked && handleModeChange(m)}
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

          {/* 日记功能 */}
          <div className="glass-card p-4 mt-4">
            <h3 className="font-bold mb-3">📓 日记</h3>
            
            {/* 日记操作按钮 */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleAskDiary}
                disabled={diaryLoading}
                className="flex-1 px-3 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {diaryLoading ? '生成中...' : '📖 索要日记'}
              </button>
              <button
                onClick={handlePeekDiary}
                disabled={diaryLoading}
                className="flex-1 px-3 py-2 bg-orange-600 rounded-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {diaryLoading ? '生成中...' : '👀 偷看日记'}
              </button>
            </div>
            
            {/* 消息提示 */}
            {diaryMessage && (
              <p className="text-xs text-gray-400 mb-2 text-center">{diaryMessage}</p>
            )}
            
            {/* 日记列表 */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {diaries.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">暂无日记</p>
              ) : (
                diaries.map((diary) => (
                  <div
                    key={diary.id}
                    onClick={() => handleViewDiary(diary)}
                    className="p-2 bg-white/5 rounded cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-300">{diary.date}</span>
                      <span className={`px-2 py-0.5 rounded ${diary.isPeeked ? 'bg-orange-600/50' : 'bg-blue-600/50'}`}>
                        {diary.isPeeked ? '偷看' : '展示'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      心情: {diary.mood}
                    </div>
                    <p className="text-xs text-gray-300 mt-1 line-clamp-2">
                      {diary.content.slice(0, 50)}...
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 日记详情弹窗 */}
      {showDiaryModal && selectedDiary && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold">{selectedDiary.date} 的日记</h3>
                <p className="text-xs text-gray-400">
                  心情: {selectedDiary.mood} · {selectedDiary.isPeeked ? '偷看' : '主动展示'}
                </p>
              </div>
              <button
                onClick={() => setShowDiaryModal(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                {selectedDiary.content}
              </p>
            </div>
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => setShowDiaryModal(false)}
                className="w-full px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-500"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
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
