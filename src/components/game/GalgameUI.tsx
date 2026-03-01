'use client'

import { useState } from 'react'

interface GalgameUIProps {
  characterName: string
  characterPortrait?: string
  reply?: string
  onSend: (message: string) => void
  loading?: boolean
}

export default function GalgameUI({
  characterName,
  characterPortrait,
  reply,
  onSend,
  loading
}: GalgameUIProps) {
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim() || loading) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        {characterPortrait && (
          <img
            src={characterPortrait}
            alt={characterName}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 max-h-full object-contain"
          />
        )}
        
        {!characterPortrait && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-6xl">
            👩
          </div>
        )}

        {reply && (
          <div className="absolute bottom-40 left-4 right-4">
            <div className="glass-card p-4 max-w-2xl mx-auto">
              <p className="text-sm font-medium mb-2">{characterName}</p>
              <p className="text-gray-200 leading-relaxed">{reply}</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="输入消息..."
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? '...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  )
}