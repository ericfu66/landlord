'use client'

import React, { useEffect, useState } from 'react'
import ChatInput from '@/components/group-chat/ChatInput'
import MessageList from '@/components/group-chat/MessageList'
import SummaryManager from '@/components/group-chat/SummaryManager'
import { GroupChatMessage, GroupChatSummary } from '@/types/group-chat'

interface SSEEvent {
  event: string
  data: unknown
}

function parseSseEvents(chunk: string): SSEEvent[] {
  const events: SSEEvent[] = []
  const lines = chunk.split('\n')

  let currentEvent: SSEEvent | null = null
  
  for (const line of lines) {
    if (line.startsWith('event:')) {
      currentEvent = { event: line.slice(6).trim(), data: null }
    } else if (line.startsWith('data:') && currentEvent) {
      const payload = line.slice(5).trim()
      try {
        currentEvent.data = JSON.parse(payload)
      } catch {
        currentEvent.data = payload
      }
      events.push(currentEvent)
      currentEvent = null
    }
  }

  return events
}

export default function GroupChatContainer() {
  const [messages, setMessages] = useState<GroupChatMessage[]>([])
  const [participants, setParticipants] = useState<string[]>([])
  const [summaries, setSummaries] = useState<GroupChatSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [historyRes, participantRes, summaryRes] = await Promise.all([
        fetch('/api/group-chat/history?unsummarized=true'), // 只加载未总结的消息
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
    setIsLoading(true)
    
    try {
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
      let buffer = ''
      
      while (!done) {
        const result = await reader.read()
        done = result.done
        if (!result.value) {
          continue
        }

        buffer += decoder.decode(result.value, { stream: true })
        
        // 处理完整的事件
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || '' // 保留未完整的部分
        
        for (const chunk of lines) {
          const events = parseSseEvents(chunk)
          
          for (const event of events) {
            if (event.event === 'message') {
              const message = event.data as GroupChatMessage
              setMessages((prev) => {
                // 避免重复添加相同ID的消息
                if (message.id && prev.some(m => m.id === message.id)) {
                  return prev
                }
                return [...prev, message]
              })
            } else if (event.event === 'trigger') {
              // 处理工具触发的额外角色通知
              const triggerData = event.data as { characterName: string; reason: string; triggeredBy: string }
              console.log(`[群聊] ${triggerData.triggeredBy} 触发了 ${triggerData.characterName}: ${triggerData.reason}`)
            } else if (event.event === 'done') {
              setIsLoading(false)
            }
          }
        }
      }
      
      // 处理缓冲区中剩余的内容
      if (buffer.trim()) {
        const events = parseSseEvents(buffer)
        for (const event of events) {
          if (event.event === 'message') {
            const message = event.data as GroupChatMessage
            setMessages((prev) => {
              if (message.id && prev.some(m => m.id === message.id)) {
                return prev
              }
              return [...prev, message]
            })
          }
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error)
    } finally {
      setIsLoading(false)
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

    const result = await res.json()
    
    // 立即清空前端消息窗口（重启对话的核心功能）
    // 无论后端是否成功创建总结，前端都立即清空，给用户"重新开始"的感觉
    setMessages([])
    
    // 刷新总结列表
    const summariesRes = await fetch('/api/group-chat/summaries')
    if (summariesRes.ok) {
      const json = await summariesRes.json()
      setSummaries(json.summaries ?? [])
    }
    
    // 显示提示
    if (result.message) {
      console.log(result.message)
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">公寓群聊</h1>
        {isLoading && (
          <span className="text-sm text-amber-400 animate-pulse">
            角色回复中...
          </span>
        )}
      </div>
      
      <SummaryManager 
        summaries={summaries} 
        onRestart={restartContext} 
        onSaveSelection={saveSelection} 
      />
      
      <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 min-h-[260px] max-h-[500px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">
            <div className="text-center">
              <div className="text-3xl mb-2">💬</div>
              <div>暂无消息，发送第一条消息开始群聊吧</div>
              <div className="text-xs mt-2 text-slate-600">
                点击"重启对话"可清空上下文并生成话题总结
              </div>
            </div>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>
      
      <ChatInput 
        participants={participants} 
        onSend={sendMessage} 
        disabled={isLoading}
      />
    </div>
  )
}
