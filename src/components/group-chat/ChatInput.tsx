'use client'

import React, { useState } from 'react'

interface ChatInputProps {
  participants: string[]
  onSend: (content: string, mentionedCharacters: string[]) => Promise<void>
}

export default function ChatInput({ participants, onSend }: ChatInputProps) {
  const [content, setContent] = useState('')
  const [mentionedCharacters, setMentionedCharacters] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  const submit = async () => {
    const text = content.trim()
    if (!text || sending) {
      return
    }

    setSending(true)
    try {
      await onSend(text, mentionedCharacters)
      setContent('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {participants.slice(0, 6).map((name) => {
          const active = mentionedCharacters.includes(name)
          return (
            <button
              key={name}
              type="button"
              className={`rounded-full px-2 py-1 text-xs border ${active ? 'border-amber-400 text-amber-300' : 'border-slate-600 text-slate-300'}`}
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

      <div className="flex gap-2">
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="输入消息..."
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white"
          maxLength={500}
        />
        <button
          type="button"
          onClick={submit}
          disabled={sending}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm text-black font-medium disabled:opacity-60"
        >
          发送
        </button>
      </div>
    </div>
  )
}
