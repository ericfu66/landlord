'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChatSession,
  ChatMessage,
  createSession,
  getSessionsByCharacter,
  getSessionById,
  updateSessionMessages,
  addMessageToSession,
  deleteSession,
  updateSessionTitle,
  getActiveSession
} from '@/lib/services/chat-session-service'

interface UseChatSessionOptions {
  characterName: string
  mode: ChatSession['mode']
  autoSave?: boolean
}

export function useChatSession({ characterName, mode, autoSave = true }: UseChatSessionOptions) {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(false)

  // 加载会话列表
  const loadSessions = useCallback(() => {
    const list = getSessionsByCharacter(characterName)
    setSessions(list)
    return list
  }, [characterName])

  // 初始化时加载会话列表
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // 开始新会话
  const startNewSession = useCallback((title?: string) => {
    const session = createSession(characterName, mode, title)
    setCurrentSession(session)
    loadSessions()
    return session
  }, [characterName, mode, loadSessions])

  // 加载已有会话
  const loadSession = useCallback((sessionId: string) => {
    const session = getSessionById(sessionId)
    if (session && session.characterName === characterName) {
      setCurrentSession(session)
      return session
    }
    return null
  }, [characterName])

  // 尝试恢复最近的活动会话
  const restoreActiveSession = useCallback(() => {
    const active = getActiveSession(characterName)
    if (active && active.mode === mode) {
      setCurrentSession(active)
      return active
    }
    return null
  }, [characterName, mode])

  // 保存消息到当前会话
  const saveMessages = useCallback((messages: ChatMessage[]) => {
    if (!currentSession) return
    const updated = updateSessionMessages(currentSession.id, messages)
    if (updated) {
      setCurrentSession(updated)
      loadSessions()
    }
  }, [currentSession, loadSessions])

  // 添加单条消息到当前会话
  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    if (!currentSession) {
      // 如果没有当前会话，自动创建一个新会话
      const newSession = createSession(characterName, mode)
      setCurrentSession(newSession)
      const updated = addMessageToSession(newSession.id, { role, content })
      if (updated) {
        setCurrentSession(updated)
        loadSessions()
      }
      return updated
    }
    
    const updated = addMessageToSession(currentSession.id, { role, content })
    if (updated) {
      setCurrentSession(updated)
      loadSessions()
    }
    return updated
  }, [currentSession, characterName, mode, loadSessions])

  // 删除会话
  const removeSession = useCallback((sessionId: string) => {
    const success = deleteSession(sessionId)
    if (success) {
      if (currentSession?.id === sessionId) {
        setCurrentSession(null)
      }
      loadSessions()
    }
    return success
  }, [currentSession, loadSessions])

  // 重命名会话
  const renameSession = useCallback((sessionId: string, title: string) => {
    const success = updateSessionTitle(sessionId, title)
    if (success) {
      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, title } : null)
      }
      loadSessions()
    }
    return success
  }, [currentSession, loadSessions])

  // 清空当前会话
  const clearCurrentSession = useCallback(() => {
    setCurrentSession(null)
  }, [])

  // 将当前消息数组转换为 ChatMessage 格式
  const convertToChatMessages = useCallback((messages: { role: 'user' | 'assistant'; content: string; timestamp?: Date }[]): ChatMessage[] => {
    return messages.map((msg, index) => ({
      id: `msg_${Date.now()}_${index}`,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp?.toISOString() || new Date().toISOString()
    }))
  }, [])

  return {
    // 状态
    currentSession,
    sessions,
    loading,
    
    // 操作
    startNewSession,
    loadSession,
    restoreActiveSession,
    saveMessages,
    addMessage,
    removeSession,
    renameSession,
    clearCurrentSession,
    convertToChatMessages,
    refreshSessions: loadSessions
  }
}
