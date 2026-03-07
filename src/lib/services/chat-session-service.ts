/**
 * 聊天会话管理服务
 * 支持 Galgame 和 WeChat 两种互动形式的会话管理
 */

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatSession {
  id: string
  characterName: string
  mode: 'daily' | 'date' | 'flirt' | 'free'
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  title?: string
}

const STORAGE_KEY = 'landlord_chat_sessions'

/**
 * 获取所有会话列表
 */
export function getAllSessions(): ChatSession[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) return []
  try {
    const sessions = JSON.parse(data)
    return Array.isArray(sessions) ? sessions : []
  } catch {
    return []
  }
}

/**
 * 根据角色名获取会话列表
 */
export function getSessionsByCharacter(characterName: string): ChatSession[] {
  const sessions = getAllSessions()
  return sessions
    .filter(s => s.characterName === characterName)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

/**
 * 根据 ID 获取单个会话
 */
export function getSessionById(sessionId: string): ChatSession | null {
  const sessions = getAllSessions()
  return sessions.find(s => s.id === sessionId) || null
}

/**
 * 创建新会话
 */
export function createSession(
  characterName: string,
  mode: ChatSession['mode'],
  title?: string
): ChatSession {
  const now = new Date().toISOString()
  const session: ChatSession = {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    characterName,
    mode,
    messages: [],
    createdAt: now,
    updatedAt: now,
    title: title || generateSessionTitle(characterName, mode)
  }
  const sessions = getAllSessions()
  sessions.push(session)
  saveSessions(sessions)
  return session
}

/**
 * 更新会话消息
 */
export function updateSessionMessages(
  sessionId: string,
  messages: ChatMessage[]
): ChatSession | null {
  const sessions = getAllSessions()
  const index = sessions.findIndex(s => s.id === sessionId)
  if (index === -1) return null

  sessions[index].messages = messages
  sessions[index].updatedAt = new Date().toISOString()
  saveSessions(sessions)
  return sessions[index]
}

/**
 * 添加消息到会话
 */
export function addMessageToSession(
  sessionId: string,
  message: Omit<ChatMessage, 'id' | 'timestamp'>
): ChatSession | null {
  const sessions = getAllSessions()
  const index = sessions.findIndex(s => s.id === sessionId)
  if (index === -1) return null

  const newMessage: ChatMessage = {
    ...message,
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString()
  }

  sessions[index].messages.push(newMessage)
  sessions[index].updatedAt = new Date().toISOString()
  saveSessions(sessions)
  return sessions[index]
}

/**
 * 删除会话
 */
export function deleteSession(sessionId: string): boolean {
  const sessions = getAllSessions()
  const filtered = sessions.filter(s => s.id !== sessionId)
  if (filtered.length === sessions.length) return false
  saveSessions(filtered)
  return true
}

/**
 * 更新会话标题
 */
export function updateSessionTitle(sessionId: string, title: string): boolean {
  const sessions = getAllSessions()
  const index = sessions.findIndex(s => s.id === sessionId)
  if (index === -1) return false
  sessions[index].title = title
  sessions[index].updatedAt = new Date().toISOString()
  saveSessions(sessions)
  return true
}

/**
 * 更新会话模式
 */
export function updateSessionMode(
  sessionId: string,
  mode: ChatSession['mode']
): boolean {
  const sessions = getAllSessions()
  const index = sessions.findIndex(s => s.id === sessionId)
  if (index === -1) return false
  sessions[index].mode = mode
  sessions[index].updatedAt = new Date().toISOString()
  saveSessions(sessions)
  return true
}

/**
 * 清理指定角色的旧会话（保留最近 N 个）
 */
export function cleanupOldSessions(characterName: string, keepCount: number = 10): void {
  const sessions = getAllSessions()
  const characterSessions = sessions.filter(s => s.characterName === characterName)
  
  if (characterSessions.length <= keepCount) return

  const sorted = characterSessions.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
  const sessionsToDelete = sorted.slice(keepCount).map(s => s.id)
  
  const filtered = sessions.filter(s => !sessionsToDelete.includes(s.id))
  saveSessions(filtered)
}

/**
 * 获取当前进行中的会话（最近更新的活跃会话）
 */
export function getActiveSession(characterName: string): ChatSession | null {
  const sessions = getSessionsByCharacter(characterName)
  if (sessions.length === 0) return null
  
  // 返回最近更新的会话
  return sessions[0]
}

/**
 * 将会话标记为完成（可以触发清理）
 */
export function finalizeSession(sessionId: string): void {
  // 可以在这里添加完成标记逻辑
  // 目前主要用于触发清理
  const session = getSessionById(sessionId)
  if (session) {
    cleanupOldSessions(session.characterName, 10)
  }
}

// 内部辅助函数
function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

function generateSessionTitle(characterName: string, mode: string): string {
  const modeNames: Record<string, string> = {
    daily: '日常',
    date: '约会',
    flirt: '亲密',
    free: '自由'
  }
  const now = new Date()
  const timeStr = now.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  return `${characterName} - ${modeNames[mode] || mode} (${timeStr})`
}
