'use client'

import React, { useState } from 'react'

interface ChatInputProps {
  participants: string[]
  onSend: (content: string, mentionedCharacters: string[]) => Promise<void>
  disabled?: boolean
}

export default function ChatInput({ participants, onSend, disabled = false }: ChatInputProps) {
  const [content, setContent] = useState('')
  const [mentionedCharacters, setMentionedCharacters] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  const submit = async () => {
    const text = content.trim()
    if (!text || sending || disabled) {
      return
    }

    setSending(true)
    try {
      await onSend(text, mentionedCharacters)
      setContent('')
      setMentionedCharacters([])
    } finally {
      setSending(false)
    }
  }

  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="space-y-2">
      {/* @选择器 */}
      <div className="flex flex-wrap gap-2">
        {participants.slice(0, 8).map((name) => {
          const active = mentionedCharacters.includes(name)
          return (
            <button
              key={name}
              type="button"
              disabled={disabled}
              className={`rounded-full px-2 py-1 text-xs border transition-colors ${
                active 
                  ? 'border-amber-400 text-amber-300 bg-amber-400/10' 
                  : 'border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                setMentionedCharacters((prev) =>
                  prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
                )
              }}
            >
              @{name}
            </button>
          )
        })}
      </div>

      {/* 输入框 */}
      <div className="flex gap-2">
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? '等待回复中...' : '输入消息...'}
          disabled={disabled || sending}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 disabled:opacity-60"
          maxLength={500}
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || sending || !content.trim()}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm text-black font-medium hover:bg-amber-400 disabled:opacity-60 disabled:hover:bg-amber-500 transition-colors"
        >
          {sending ? '发送中...' : '发送'}
        </button>
      </div>
      
      {/* 字符计数 */}
      <div className="text-right text-xs text-slate-500">
        {content.length}/500
      </div>
    </div>
  )
}
