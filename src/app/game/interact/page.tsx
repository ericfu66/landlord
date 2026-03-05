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
import { ArrowLeft, BookOpen } from 'lucide-react'

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
  portraitUrl?: string
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
  
  // Sticker and portrait states
  const [stickerUrl, setStickerUrl] = useState<string | undefined>()
  const [stickerEmotion, setStickerEmotion] = useState<string | undefined>()
  const [tempPortraitUrl, setTempPortraitUrl] = useState<string | undefined>()
  const [portraitLoading, setPortraitLoading] = useState(false)
  
  // Diary related states
  const [diaries, setDiaries] = useState<DiaryEntry[]>([])
  const [diaryLoading, setDiaryLoading] = useState(false)
  const [showDiaryModal, setShowDiaryModal] = useState(false)
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntry | null>(null)
  const [diaryMessage, setDiaryMessage] = useState<string>('')
  // Mobile view toggle
  const [showSidebar, setShowSidebar] = useState(false)

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

        if (data.choices && Array.isArray(data.choices)) {
          setChoices(data.choices.map((c: string, i: number) => ({
            id: `choice-${i}`,
            text: c
          })))
        }

        // Handle sticker
        if (data.stickerUrl) {
          setStickerUrl(data.stickerUrl)
          setStickerEmotion(data.stickerEmotion)
          // Clear sticker after 5 seconds
          setTimeout(() => {
            setStickerUrl(undefined)
            setStickerEmotion(undefined)
          }, 5000)
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

    setChoices([])
    await handleSend(choice.text)
  }

  const handleModeChange = (newMode: InteractionMode) => {
    setMode(newMode)
    setMessages([])
    setChoices([])
    setStickerUrl(undefined)
    setTempPortraitUrl(undefined)
  }

  // Handle real-time portrait generation
  const handleGeneratePortrait = async (emotion: string) => {
    if (!character || portraitLoading) return
    
    setPortraitLoading(true)
    try {
      const res = await fetch('/api/interact/edit-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: character.name,
          emotion,
          pose: 'standing'
        })
      })
      
      const data = await res.json()
      
      if (res.ok && data.imageUrl) {
        setTempPortraitUrl(data.imageUrl)
      } else {
        console.error('Portrait generation failed:', data.error)
        alert(data.error || '生成实时立绘失败')
      }
    } catch (error) {
      console.error('Generate portrait error:', error)
      alert('生成实时立绘失败')
    } finally {
      setPortraitLoading(false)
    }
  }

  const isGalgameMode = GALGAME_MODES.includes(mode)

  if (!characterName) {
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-0">
        <div className="glass-card p-6 text-center">
          <p className="text-gray-400 mb-4">请选择一个角色进行互动</p>
          <button
            onClick={() => router.push('/game/characters')}
            className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-500 touch-target"
          >
            查看角色列表
          </button>
        </div>
      </div>
    )
  }

  if (!character) {
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-0">
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-4" />
          加载中...
        </div>
      </div>
    )
  }

  if (isGalgameMode) {
    return (
      <GalgameDialog
        characterName={character.name}
        characterImage={tempPortraitUrl || character.portraitUrl}
        messages={messages}
        choices={choices}
        onSend={handleSend}
        onChoice={handleChoice}
        onModeChange={handleModeChange}
        loading={loading}
        favorability={character.favorability}
        mode={mode}
        stickerUrl={stickerUrl}
        stickerEmotion={stickerEmotion}
        onGeneratePortrait={handleGeneratePortrait}
        portraitLoading={portraitLoading}
      />
    )
  }

  // WeChat mode (flirt, free)
  const modes: InteractionMode[] = ['daily', 'date', 'flirt', 'free']

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 sm:gap-2 text-gray-400 hover:text-white text-sm sm:text-base touch-target"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>返回</span>
        </button>
        <h1 className="text-lg sm:text-xl font-bold">{character.name}</h1>
        <div className="w-12" />
      </div>

      {/* Mobile: Toggle sidebar button */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="md:hidden w-full mb-3 py-2 glass-card text-sm flex items-center justify-center gap-2"
      >
        <BookOpen className="w-4 h-4" />
        {showSidebar ? '隐藏信息面板' : '显示信息面板'}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Chat area */}
        <div className="md:col-span-2 order-1">
          <div className="glass-card h-[60vh] sm:h-96 md:h-[500px] flex flex-col">
            {/* Mode selector */}
            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 border-b border-white/10">
              {modes.map((m) => {
                const info = getInteractionModeInfo(m, character.favorability)
                return (
                  <button
                    key={m}
                    onClick={() => info.unlocked && handleModeChange(m)}
                    disabled={!info.unlocked}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm touch-target-sm ${
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
            <div className="flex-1 overflow-hidden">
              <WeChatUI
                characterName={character.name}
                messages={messages}
                onSend={handleSend}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* Sidebar - Hidden on mobile by default */}
        <div className={`order-2 ${showSidebar ? 'block' : 'hidden md:block'}`}>
          <VariableDisplay
            favorability={character.favorability}
            obedience={character.obedience}
            corruption={character.corruption}
            mood={character.mood}
            updating={updating}
          />

          <div className="glass-card p-3 sm:p-4 mt-3 sm:mt-4">
            <h3 className="font-bold mb-2 text-sm sm:text-base">角色信息</h3>
            <div className="text-xs sm:text-sm space-y-1 text-gray-300">
              <p>年龄：{character.template.角色档案.基本信息.年龄}</p>
              <p>身份：{character.template.角色档案.基本信息.身份}</p>
              <p>租金：💰 {character.rent || 200}/天</p>
            </div>
          </div>

          {/* 日记功能 */}
          <div className="glass-card p-3 sm:p-4 mt-3 sm:mt-4">
            <h3 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base">📓 日记</h3>
            
            {/* 日记操作按钮 */}
            <div className="flex gap-2 mb-2 sm:mb-3">
              <button
                onClick={handleAskDiary}
                disabled={diaryLoading}
                className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm touch-target-sm"
              >
                {diaryLoading ? '生成中...' : '📖 索要'}
              </button>
              <button
                onClick={handlePeekDiary}
                disabled={diaryLoading}
                className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-orange-600 rounded-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm touch-target-sm"
              >
                {diaryLoading ? '生成中...' : '👀 偷看'}
              </button>
            </div>
            
            {/* 消息提示 */}
            {diaryMessage && (
              <p className="text-xs text-gray-400 mb-2 text-center">{diaryMessage}</p>
            )}
            
            {/* 日记列表 */}
            <div className="space-y-1.5 sm:space-y-2 max-h-32 sm:max-h-48 overflow-y-auto scrollbar-hide">
              {diaries.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">暂无日记</p>
              ) : (
                diaries.map((diary) => (
                  <div
                    key={diary.id}
                    onClick={() => handleViewDiary(diary)}
                    className="p-1.5 sm:p-2 bg-white/5 rounded cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-300">{diary.date}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${diary.isPeeked ? 'bg-orange-600/50' : 'bg-blue-600/50'}`}>
                        {diary.isPeeked ? '偷看' : '展示'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      心情: {diary.mood}
                    </div>
                    <p className="text-xs text-gray-300 mt-0.5 line-clamp-2">
                      {diary.content.slice(0, 40)}...
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="glass-card max-w-md w-full max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base">{selectedDiary.date} 的日记</h3>
                <p className="text-xs text-gray-400">
                  心情: {selectedDiary.mood} · {selectedDiary.isPeeked ? '偷看' : '主动展示'}
                </p>
              </div>
              <button
                onClick={() => setShowDiaryModal(false)}
                className="text-gray-400 hover:text-white text-lg sm:text-xl p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 scrollbar-hide">
              <p className="text-xs sm:text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                {selectedDiary.content}
              </p>
            </div>
            <div className="p-3 sm:p-4 border-t border-white/10">
              <button
                onClick={() => setShowDiaryModal(false)}
                className="w-full px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-500 text-sm touch-target"
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
    <Suspense fallback={
      <div className="text-center py-12 text-gray-400">
        <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-4" />
        加载中...
      </div>
    }>
      <InteractContent />
    </Suspense>
  )
}
