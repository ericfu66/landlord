import React from 'react'
import { GroupChatMessage } from '@/types/group-chat'

interface MessageBubbleProps {
  message: GroupChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isPlayer = message.senderType === 'player'
  const style = isPlayer
    ? 'bg-amber-500/20 border-amber-500/40 ml-8'
    : 'bg-slate-800/70 border-slate-700 mr-8'

  return (
    <div className={`rounded-xl border px-3 py-2 ${style}`}>
      <div className="text-xs text-slate-400 mb-1">{message.senderName}</div>
      <div className="text-sm text-white break-words">{message.content}</div>
    </div>
  )
}
