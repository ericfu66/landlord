'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import GalgameDialog from '@/components/game/GalgameDialog'
import WeChatUI from '@/components/game/WeChatUI'
import VariableDisplay from '@/components/game/VariableDisplay'
import { getInteractionModeInfo } from '@/lib/services/preset-client'
import { InteractionMode } from '@/types/preset'
import { DiaryEntry } from '@/types/diary'
import { useGameState } from '../GameStateContext'
import { useChatSession } from '@/hooks/useChatSession'
import { ChatSession } from '@/lib/services/chat-session-service'
import { ArrowLeft, BookOpen, MessageSquare, Plus, History, Trash2, Edit2, X, Check, Bug } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// 会话管理组件
function SessionManager({
  sessions,
  currentSession,
  onNewSession,
  onLoadSession,
  onDeleteSession,
  onRenameSession,
  isOpen,
  onClose,
  characterName
}: {
  sessions: ChatSession[]
  currentSession: ChatSession | null
  onNewSession: () => void
  onLoadSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, title: string) => void
  isOpen: boolean
  onClose: () => void
  characterName: string
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  if (!isOpen) return null

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      daily: '日常',
      date: '约会',
      flirt: '亲密',
      free: '自由'
    }
    return labels[mode] || mode
  }

  const handleStartEdit = (session: ChatSession) => {
    setEditingId(session.id)
    setEditTitle(session.title || '')
  }

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim()) {
      onRenameSession(editingId, editTitle.trim())
      setEditingId(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <History className="w-5 h-5" />
              会话管理
            </h3>
            <p className="text-xs text-gray-400 mt-1">与 {characterName} 的对话记录</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Session Button */}
        <div className="p-4 border-b border-white/10">
          <button
            onClick={() => {
              onNewSession()
              onClose()
            }}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            开始新会话
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无会话记录</p>
              <p className="text-xs mt-1">点击上方按钮开始新对话</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                  currentSession?.id === session.id
                    ? 'bg-purple-600/30 border-purple-500/50'
                    : 'bg-white/5 border-transparent hover:bg-white/10'
                }`}
                onClick={() => {
                  onLoadSession(session.id)
                  onClose()
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingId === session.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit()
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-sm"
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSaveEdit()
                          }}
                          className="p-1 hover:bg-green-500/20 rounded"
                        >
                          <Check className="w-4 h-4 text-green-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCancelEdit()
                          }}
                          className="p-1 hover:bg-red-500/20 rounded"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ) : (
                      <h4 className="font-medium text-sm truncate">
                        {session.title || `会话 ${formatDate(session.createdAt)}`}
                      </h4>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <span className="px-1.5 py-0.5 bg-white/10 rounded">
                        {getModeLabel(session.mode)}
                      </span>
                      <span>{session.messages.length} 条消息</span>
                      <span>· {formatDate(session.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartEdit(session)
                      }}
                      className="p-1.5 hover:bg-white/10 rounded transition-colors"
                      title="重命名"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('确定要删除这个会话吗？')) {
                          onDeleteSession(session.id)
                        }
                      }}
                      className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
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
  const [ragLoading, setRagLoading] = useState(false) // 向量化查询中状态
  const [mode, setMode] = useState<InteractionMode>('daily')
  const [updating, setUpdating] = useState(false)
  const [showSessionManager, setShowSessionManager] = useState(false)
  const [sessionRestored, setSessionRestored] = useState(false)
  
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
  
  // Debug prompt viewer states
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [debugPromptData, setDebugPromptData] = useState<{
    messages: Array<{role: string, content: string}>
    stats: {system: number, user: number, assistant: number, total: number}
    personaPosition: string
  } | null>(null)
  const [debugLoading, setDebugLoading] = useState(false)

  // 会话管理 - 必须在 useEffect 之前声明
  const {
    currentSession,
    sessions,
    startNewSession,
    loadSession,
    restoreActiveSession,
    addMessage,
    removeSession,
    renameSession,
    clearCurrentSession
  } = useChatSession({
    characterName: characterName || '',
    mode
  })

  useEffect(() => {
    if (characterName) {
      fetchCharacterData()
      fetchDiaries()
      enterInteraction()
    }
  }, [characterName])

  // 尝试恢复上次的会话
  useEffect(() => {
    if (characterName && !sessionRestored && sessions.length > 0) {
      const active = restoreActiveSession()
      if (active) {
        // 恢复消息到状态
        const restoredMessages = active.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        }))
        setMessages(restoredMessages)
        // 恢复模式
        setMode(active.mode)
      }
      setSessionRestored(true)
    }
  }, [characterName, sessions.length, sessionRestored, restoreActiveSession])

  // 进入互动时扣除体力（使用 sessionStorage 防止刷新重复扣费）
  const enterInteraction = async () => {
    if (!characterName) return
    
    // 检查当前会话是否已经进入过互动
    const sessionKey = `interact_entered_${characterName}`
    if (sessionStorage.getItem(sessionKey)) {
      return // 当前会话已进入过，不重复扣费
    }

    try {
      const res = await fetch('/api/interact/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName })
      })

      const data = await res.json()

      if (res.ok) {
        // 标记当前会话已进入互动
        sessionStorage.setItem(sessionKey, 'true')
        // 刷新游戏状态以更新体力显示
        await refreshGameState()
      } else {
        // 体力不足或其他错误，返回角色列表
        alert(data.error || '进入互动失败')
        router.push('/game/characters')
      }
    } catch (error) {
      console.error('Enter interaction error:', error)
      alert('进入互动失败')
      router.push('/game/characters')
    }
  }

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
    setRagLoading(true) // 开始RAG查询动画
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }
    setMessages((prev) => {
      const newMessages = [...prev, userMsg]
      return newMessages
    })

    try {
      // 模拟RAG查询时间（实际查询在服务端进行）
      // 这里我们给用户一个视觉反馈，表示正在进行记忆检索
      const ragStartTime = Date.now()
      const minRagDisplayTime = 800 // 最少显示800ms动画
      
      const res = await fetch('/api/interact/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: character.name,
          mode,
          userInput: content
        })
      })
      
      // 确保动画至少显示最小时间
      const elapsed = Date.now() - ragStartTime
      if (elapsed < minRagDisplayTime) {
        await new Promise(resolve => setTimeout(resolve, minRagDisplayTime - elapsed))
      }
      setRagLoading(false)

      const data = await res.json()

      if (res.ok) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date()
        }
        setMessages((prev) => {
          const newMessages = [...prev, assistantMsg]
          // 保存到会话
          if (currentSession) {
            addMessage('assistant', data.reply)
          } else {
            // 如果没有会话，创建一个并保存两条消息
            startNewSession()
            setTimeout(() => {
              addMessage('user', content)
              addMessage('assistant', data.reply)
            }, 0)
          }
          return newMessages
        })

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
      setRagLoading(false)
    }
  }

  const handleChoice = async (choiceId: string) => {
    const choice = choices.find(c => c.id === choiceId)
    if (!choice) return

    setChoices([])
    await handleSend(choice.text)
  }

  // 获取 debug 提示词
  const fetchDebugPrompt = async () => {
    if (!character) return
    setDebugLoading(true)
    
    // 使用最后一条用户消息或默认文本
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()
    const testInput = lastUserMessage?.content || '你好'
    
    try {
      const res = await fetch('/api/interact/debug-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: character.name,
          mode,
          userInput: testInput
        })
      })
      
      const data = await res.json()
      if (res.ok) {
        setDebugPromptData(data)
      } else {
        alert(data.error || '获取提示词失败')
      }
    } catch (error) {
      console.error('Fetch debug prompt error:', error)
      alert('获取提示词失败')
    } finally {
      setDebugLoading(false)
    }
  }

  const handleModeChange = (newMode: InteractionMode) => {
    // 如果有当前会话且消息不为空，询问用户
    if (messages.length > 0) {
      const continueCurrent = confirm('切换模式将开始新会话，当前对话已自动保存。是否继续？')
      if (!continueCurrent) return
    }
    setMode(newMode)
    setMessages([])
    setChoices([])
    setStickerUrl(undefined)
    setTempPortraitUrl(undefined)
    clearCurrentSession()
  }

  // 加载会话
  const handleLoadSession = useCallback((sessionId: string) => {
    const session = loadSession(sessionId)
    if (session) {
      setMode(session.mode)
      const restoredMessages = session.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }))
      setMessages(restoredMessages)
      setChoices([])
    }
  }, [loadSession])

  // 开始新会话
  const handleStartNewSession = useCallback(() => {
    startNewSession()
    setMessages([])
    setChoices([])
  }, [startNewSession])

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
      <>
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
          currentSession={currentSession}
          onShowSessionManager={() => setShowSessionManager(true)}
          ragLoading={ragLoading}
        />
        <SessionManager
          sessions={sessions}
          currentSession={currentSession}
          onNewSession={handleStartNewSession}
          onLoadSession={handleLoadSession}
          onDeleteSession={removeSession}
          onRenameSession={renameSession}
          isOpen={showSessionManager}
          onClose={() => setShowSessionManager(false)}
          characterName={character.name}
        />
      </>
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
                ragLoading={ragLoading}
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

          {/* 会话管理 */}
          <div className="glass-card p-3 sm:p-4 mt-3 sm:mt-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="font-bold text-sm sm:text-base">💬 会话</h3>
              <button
                onClick={() => setShowSessionManager(true)}
                className="text-xs px-2 py-1 bg-purple-600/50 hover:bg-purple-600 rounded transition-colors"
              >
                管理
              </button>
            </div>
            {currentSession && (
              <div className="p-2 bg-white/5 rounded text-xs">
                <p className="text-gray-300 truncate">{currentSession.title}</p>
                <p className="text-gray-500 mt-0.5">
                  {currentSession.messages.length} 条消息 · {getModeLabel(currentSession.mode)}
                </p>
              </div>
            )}
          </div>

          {/* Debug 按钮 */}
          <div className="glass-card p-3 sm:p-4 mt-3 sm:mt-4">
            <button
              onClick={() => {
                setShowDebugPanel(true)
                fetchDebugPrompt()
              }}
              className="w-full py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Bug className="w-4 h-4" />
              查看提示词
            </button>
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

      {/* 会话管理器 */}
      <SessionManager
        sessions={sessions}
        currentSession={currentSession}
        onNewSession={handleStartNewSession}
        onLoadSession={handleLoadSession}
        onDeleteSession={removeSession}
        onRenameSession={renameSession}
        isOpen={showSessionManager}
        onClose={() => setShowSessionManager(false)}
        characterName={character.name}
      />

      {/* Debug 提示词查看器 */}
      {showDebugPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Bug className="w-5 h-5" />
                  提示词查看器
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  人设位置: {debugPromptData?.personaPosition || 'loading...'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchDebugPrompt}
                  disabled={debugLoading}
                  className="px-3 py-1.5 bg-purple-600/50 hover:bg-purple-600 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {debugLoading ? '加载中...' : '刷新'}
                </button>
                <button
                  onClick={() => setShowDebugPanel(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stats */}
            {debugPromptData?.stats && (
              <div className="flex gap-4 p-3 bg-white/5 border-b border-white/10 text-xs">
                <span className="text-gray-400">
                  总计: <span className="text-white">{debugPromptData.stats.total}</span>
                </span>
                <span className="text-blue-400">
                  system: <span className="text-white">{debugPromptData.stats.system}</span>
                </span>
                <span className="text-green-400">
                  user: <span className="text-white">{debugPromptData.stats.user}</span>
                </span>
                <span className="text-purple-400">
                  assistant: <span className="text-white">{debugPromptData.stats.assistant}</span>
                </span>
              </div>
            )}

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {debugLoading ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-4" />
                  加载中...
                </div>
              ) : debugPromptData?.messages ? (
                debugPromptData.messages.map((msg, index) => (
                  <div key={index} className="border border-white/10 rounded-lg overflow-hidden">
                    <div className={`px-3 py-1.5 text-xs font-medium ${
                      msg.role === 'system' ? 'bg-blue-600/30 text-blue-200' :
                      msg.role === 'user' ? 'bg-green-600/30 text-green-200' :
                      'bg-purple-600/30 text-purple-200'
                    }`}>
                      {msg.role.toUpperCase()} #{index + 1}
                    </div>
                    <div className="p-3 bg-black/20">
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {msg.content}
                      </pre>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  点击刷新获取提示词
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => setShowDebugPanel(false)}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
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

// 辅助函数：获取模式标签
function getModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    daily: '日常',
    date: '约会',
    flirt: '亲密',
    free: '自由'
  }
  return labels[mode] || mode
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
