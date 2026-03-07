'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface WeChatUIProps {
  characterName: string
  characterAvatar?: string
  messages: Message[]
  onSend: (message: string) => void
  loading?: boolean
  ragLoading?: boolean // 向量化查询中状态
}

export default function WeChatUI({
  characterName,
  characterAvatar,
  messages,
  onSend,
  loading,
  ragLoading
}: WeChatUIProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || loading) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/10 text-center">
        <span className="font-medium">{characterName}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                msg.role === 'user' ? 'bg-purple-600' : 'bg-gradient-to-br from-purple-500 to-pink-500'
              }`}
            >
              {msg.role === 'user' ? (
                '👤'
              ) : characterAvatar ? (
                <img src={characterAvatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                '👩'
              )}
            </div>
            
            <div
              className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white rounded-br-md'
                  : 'bg-white/10 text-gray-100 rounded-bl-md'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        
        {ragLoading && (
          <div className="flex items-end gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center animate-pulse">
              🔍
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-2xl rounded-bl-md">
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在检索相关记忆...
              </p>
            </div>
          </div>
        )}

        {loading && !ragLoading && (
          <div className="flex items-end gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              👩
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-2xl rounded-bl-md">
              <p className="text-sm text-gray-400">正在输入...</p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="输入消息..."
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-purple-600 rounded-full font-medium hover:bg-purple-500 transition-colors disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}