import React from 'react'
import { GroupChatMessage } from '@/types/group-chat'
import MessageBubble from '@/components/group-chat/MessageBubble'

interface MessageListProps {
  messages: GroupChatMessage[]
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="space-y-3">
      {messages.map((message, index) => (
        <MessageBubble key={`${message.id ?? index}-${message.createdAt ?? ''}`} message={message} />
      ))}
    </div>
  )
}
