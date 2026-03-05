'use client'

import { useState, useEffect, useRef } from 'react'
import { InteractionMode } from '@/types/preset'

interface Choice {
  id: string
  text: string
}

interface StickerInfo {
  url: string
  emotion: string
}

interface GalgameDialogProps {
  characterName: string
  characterImage?: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  choices?: Choice[]
  onSend?: (message: string) => void
  onChoice?: (choiceId: string) => void
  onModeChange?: (mode: InteractionMode) => void
  loading?: boolean
  favorability?: number
  mode?: InteractionMode
  stickerUrl?: string
  stickerEmotion?: string
  onGeneratePortrait?: (emotion: string) => void
  portraitLoading?: boolean
}

// Mode info helper
const getModeInfo = (mode: InteractionMode, favorability: number): { name: string; unlocked: boolean } => {
  const thresholds: Record<InteractionMode, number> = {
    daily: 0,
    date: 20,
    flirt: 50,
    free: 0
  }
  const names: Record<InteractionMode, string> = {
    daily: '日常',
    date: '约会',
    flirt: '亲密',
    free: '自由'
  }
  return {
    name: names[mode],
    unlocked: favorability >= thresholds[mode]
  }
}

// Character sprite expressions based on mood
const getMoodSprite = (mood: string, characterName: string): string => {
  const moodEmoji: Record<string, string> = {
    happy: '😊',
    excited: '😄',
    neutral: '😐',
    sad: '😢',
    angry: '😠',
    shy: '😊',
    surprised: '😮',
    默认: '😊'
  }
  return moodEmoji[mood.toLowerCase()] || moodEmoji['默认']
}

// Emotion options for real-time portrait editing
const EMOTION_OPTIONS = [
  { key: 'happy', label: '😊 开心', emoji: '😊' },
  { key: 'sad', label: '😢 伤心', emoji: '😢' },
  { key: 'angry', label: '😠 生气', emoji: '😠' },
  { key: 'surprised', label: '😮 惊讶', emoji: '😮' },
  { key: 'shy', label: '😳 害羞', emoji: '😳' },
  { key: 'love', label: '😍 喜欢', emoji: '😍' },
  { key: 'sleepy', label: '😴 困倦', emoji: '😴' },
  { key: 'cool', label: '😎 酷', emoji: '😎' },
]

export default function GalgameDialog({
  characterName,
  characterImage,
  messages,
  choices = [],
  onSend,
  onChoice,
  onModeChange,
  loading,
  favorability = 50,
  mode: externalMode,
  stickerUrl,
  stickerEmotion,
  onGeneratePortrait,
  portraitLoading
}: GalgameDialogProps) {
  const [input, setInput] = useState('')
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [internalMode, setInternalMode] = useState<InteractionMode>('daily')
  const [currentPortrait, setCurrentPortrait] = useState(characterImage)
  const [showEmotionPanel, setShowEmotionPanel] = useState(false)
  const typingRef = useRef<NodeJS.Timeout | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const mode = externalMode || internalMode
  const setMode = (m: InteractionMode) => {
    if (externalMode) {
      onModeChange?.(m)
    } else {
      setInternalMode(m)
    }
  }

  // Update current portrait when characterImage prop changes
  useEffect(() => {
    setCurrentPortrait(characterImage)
  }, [characterImage])

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null
  const isCharacterSpeaking = lastMessage?.role === 'assistant'

  // Typewriter effect for character dialogue
  useEffect(() => {
    if (lastMessage && isCharacterSpeaking) {
      setDisplayedText('')
      setIsTyping(true)

      const text = lastMessage.content
      let index = 0

      if (typingRef.current) clearTimeout(typingRef.current)

      typingRef.current = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1))
          index++
        } else {
          setIsTyping(false)
          if (typingRef.current) clearInterval(typingRef.current)
        }
      }, 30) // 30ms per character

      return () => {
        if (typingRef.current) clearInterval(typingRef.current)
      }
    } else if (lastMessage?.role === 'user') {
      setDisplayedText(lastMessage.content)
    }
  }, [lastMessage, isCharacterSpeaking])

  const handleSend = () => {
    if (!input.trim() || loading || isTyping) return
    onSend?.(input.trim())
    setInput('')
  }

  const handleChoice = (choiceId: string) => {
    if (loading || isTyping) return
    onChoice?.(choiceId)
  }

  // Skip typing animation
  const skipTyping = () => {
    if (isTyping && lastMessage) {
      if (typingRef.current) clearInterval(typingRef.current)
      setDisplayedText(lastMessage.content)
      setIsTyping(false)
    }
  }

  // Handle portrait emotion generation
  const handleEmotionClick = (emotion: string) => {
    onGeneratePortrait?.(emotion)
    setShowEmotionPanel(false)
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{
      background: `
        radial-gradient(ellipse at 30% 20%, rgba(255, 182, 193, 0.3) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(255, 192, 203, 0.2) 0%, transparent 40%),
        linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)
      `,
    }}>
      {/* Floating particles/stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-pink-300/50 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Character name tag at top */}
      {characterName && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-20">
          <div className="px-6 py-2 bg-gradient-to-r from-pink-500/80 to-rose-500/80 rounded-full backdrop-blur-sm border border-pink-300/50 shadow-lg">
            <span className="text-white font-bold tracking-wider" style={{
              fontFamily: '"ZCOOL KuaiLe", "Ma Shan Zheng", cursive',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              {characterName}
            </span>
          </div>
        </div>
      )}

      {/* Character sprite - center */}
      <div className="absolute left-1/2 -translate-x-1/2 top-24 bottom-80 md:bottom-64 flex items-end justify-center z-30">
        <div className="relative">
          {/* Character image or placeholder */}
          <div
            className="w-64 h-80 md:w-80 md:h-96 rounded-t-3xl overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(255,182,193,0.2) 0%, rgba(255,192,203,0.1) 100%)',
              border: '2px solid rgba(255,182,193,0.3)',
              boxShadow: '0 0 60px rgba(255,182,193,0.3), inset 0 0 30px rgba(255,182,193,0.1)'
            }}
          >
            {portraitLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full" />
              </div>
            ) : currentPortrait ? (
              <img
                src={currentPortrait}
                alt={characterName}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl">
                {getMoodSprite('happy', characterName)}
              </div>
            )}
          </div>

          {/* Character shadow */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-4 bg-black/20 blur-xl rounded-full" />

          {/* Real-time portrait button */}
          {currentPortrait && !portraitLoading && (
            <button
              onClick={() => setShowEmotionPanel(!showEmotionPanel)}
              className="absolute -right-12 bottom-0 p-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full shadow-lg hover:scale-110 transition-transform"
              title="实时立绘"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          )}

          {/* Emotion panel */}
          {showEmotionPanel && (
            <div className="absolute -right-16 bottom-12 bg-black/80 backdrop-blur-md rounded-xl p-2 flex flex-col gap-1 z-30">
              {EMOTION_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleEmotionClick(opt.key)}
                  className="px-3 py-1.5 text-xs text-white hover:bg-pink-500/50 rounded-lg transition-colors whitespace-nowrap"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticker display - top right */}
      {stickerUrl && (
        <div className="absolute top-32 right-4 z-20 animate-bounce">
          <div className="relative">
            <img
              src={stickerUrl}
              alt="sticker"
              className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-2xl"
            />
            <div className="absolute -bottom-1 -right-1 text-2xl">
              {EMOTION_OPTIONS.find(e => e.key === stickerEmotion)?.emoji || '💕'}
            </div>
          </div>
        </div>
      )}

      {/* Choice buttons - center */}
      {choices.length > 0 && !isCharacterSpeaking && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col gap-3 w-80" style={{ marginBottom: '40px' }}>
          {choices.map((choice, index) => (
            <button
              key={choice.id}
              onClick={() => handleChoice(choice.id)}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed animate-fade-in"
              style={{
                animationDelay: `${index * 100}ms`,
                fontFamily: '"ZCOOL KuaiLe", "Ma Shan Zheng", cursive',
                boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)'
              }}
            >
              {choice.text}
            </button>
          ))}
        </div>
      )}

      {/* Dialog box - bottom */}
      <div
        ref={dialogRef}
        className="absolute bottom-24 left-0 right-0 z-20 p-4 md:p-6"
      >
        <div
          className="max-w-3xl mx-auto rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.98) 100%)',
            border: '1px solid rgba(255, 182, 193, 0.3)',
            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 182, 193, 0.2)'
          }}
        >
          {/* Dialog header with character name */}
          <div className="px-6 py-3 border-b border-pink-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <span className="text-white text-sm">💕</span>
              </div>
              <span className="text-pink-300 font-bold">{characterName}</span>
            </div>

            {/* Favorability indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">好感度</span>
              <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, favorability))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Dialog content */}
          <div className="p-6 min-h-24">
            {messages.length === 0 && (
              <p className="text-gray-400 text-center italic">
                点击下方按钮开始对话...
              </p>
            )}

            {lastMessage && (
              <div
                className="text-white leading-relaxed cursor-pointer"
                onClick={skipTyping}
                style={{
                  fontFamily: '"ZCOOL KuaiLe", "Ma Shan Zheng", cursive',
                  fontSize: '1.1rem',
                  lineHeight: '1.8'
                }}
              >
                {displayedText}
                {isTyping && (
                  <span className="inline-block w-1 h-5 ml-1 bg-pink-400 animate-pulse" />
                )}
              </div>
            )}
          </div>

          {/* Input area - for user input mode */}
          {choices.length === 0 && (
            <div className="px-6 pb-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 px-4 py-3 bg-white/10 border border-pink-500/30 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all"
                  placeholder="输入你想说的话..."
                  disabled={loading || isTyping}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim() || isTyping}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-full hover:shadow-lg hover:shadow-pink-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  发送
                </button>
              </div>
            </div>
          )}

          {/* Quick reply buttons when no choices */}
          {choices.length === 0 && messages.length > 0 && !loading && (
            <div className="px-6 pb-4 flex flex-wrap gap-2">
              {[
                '你好呀~',
                '今天怎么样?',
                '有什么想说的吗?',
                '我们去约会吧!'
              ].map((text) => (
                <button
                  key={text}
                  onClick={() => {
                    setInput(text)
                    onSend?.(text)
                  }}
                  className="px-3 py-1 text-sm bg-white/10 hover:bg-pink-500/30 text-pink-200 rounded-full transition-colors border border-pink-500/30 hover:border-pink-500"
                >
                  {text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={() => window.history.back()}
        className="absolute top-20 left-4 z-30 p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Mode selector - top center */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex flex-wrap justify-center gap-2">
        {(['daily', 'date', 'flirt', 'free'] as const).map((m) => {
          const info = getModeInfo(m, favorability)
          return (
            <button
              key={m}
              onClick={() => {
                if (info.unlocked) {
                  setMode(m)
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs backdrop-blur-sm transition-all ${
                mode === m
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-gray-300'
              } ${!info.unlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {info.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
