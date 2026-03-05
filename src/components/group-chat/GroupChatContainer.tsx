'use client'

import React, { useEffect, useState } from 'react'
import ChatInput from '@/components/group-chat/ChatInput'
import MessageList from '@/components/group-chat/MessageList'
import SummaryManager from '@/components/group-chat/SummaryManager'
import { GroupChatMessage, GroupChatSummary } from '@/types/group-chat'

function parseSsePayload(chunk: string): GroupChatMessage[] {
  const messages: GroupChatMessage[] = []
  const lines = chunk.split('\n')

  let eventName = ''
  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
      continue
    }

    if (!line.startsWith('data:')) {
      continue
    }

    if (eventName !== 'message') {
      continue
    }

    const payload = line.slice(5).trim()
    try {
      const parsed = JSON.parse(payload) as GroupChatMessage
      messages.push(parsed)
    } catch {
      // ignore malformed chunks
    }
  }

  return messages
}

export default function GroupChatContainer() {
  const [messages, setMessages] = useState<GroupChatMessage[]>([])
  const [participants, setParticipants] = useState<string[]>([])
  const [summaries, setSummaries] = useState<GroupChatSummary[]>([])

  useEffect(() => {
    const load = async () => {
      const [historyRes, participantRes, summaryRes] = await Promise.all([
        fetch('/api/group-chat/history'),
        fetch('/api/group-chat/participants'),
        fetch('/api/group-chat/summaries')
      ])

      if (historyRes.ok) {
        const historyJson = await historyRes.json()
        setMessages(historyJson.messages ?? [])
      }

      if (participantRes.ok) {
        const participantJson = await participantRes.json()
        setParticipants(participantJson.participants ?? [])
      }

      if (summaryRes.ok) {
        const summaryJson = await summaryRes.json()
        setSummaries(summaryJson.summaries ?? [])
      }
    }

    load().catch(() => undefined)
  }, [])

  const sendMessage = async (content: string, mentionedCharacters: string[]) => {
    const res = await fetch('/api/group-chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, mentionedCharacters })
    })

    if (!res.ok || !res.body) {
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let done = false
    while (!done) {
      const result = await reader.read()
      done = result.done
      if (!result.value) {
        continue
      }

      const chunk = decoder.decode(result.value, { stream: true })
      const nextMessages = parseSsePayload(chunk)
      if (nextMessages.length > 0) {
        setMessages((prev) => [...prev, ...nextMessages])
      }
    }
  }

  const restartContext = async () => {
    const res = await fetch('/api/group-chat/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keepRecentCount: 3 })
    })

    if (!res.ok) {
      return
    }

    const summariesRes = await fetch('/api/group-chat/summaries')
    if (summariesRes.ok) {
      const json = await summariesRes.json()
      setSummaries(json.summaries ?? [])
    }
  }

  const saveSelection = async (ids: number[]) => {
    const res = await fetch('/api/group-chat/summaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summaryIds: ids })
    })

    if (!res.ok) {
      return
    }

    setSummaries((prev) =>
      prev.map((item) => ({
        ...item,
        selected: item.id ? ids.includes(item.id) : false
      }))
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold text-white">公寓群聊</h1>
      <SummaryManager summaries={summaries} onRestart={restartContext} onSaveSelection={saveSelection} />
      <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 min-h-[260px]">
        <MessageList messages={messages} />
      </div>
      <ChatInput participants={participants} onSend={sendMessage} />
    </div>
  )
}
