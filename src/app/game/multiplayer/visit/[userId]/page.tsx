'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Building2, Users, ArrowLeft, MessageCircle, Heart, Sparkles, X, Send } from 'lucide-react'
import { RemoteBuilding, RemoteCharacter } from '@/types/multiplayer'

// 赛博朋克风格楼层展示
function CyberpunkFloor({ floor }: { floor: any }) {
  return (
    <div className="relative mb-8">
      {/* 楼层标签 */}
      <div className="absolute -left-16 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white px-3 py-2 rounded-lg font-bold text-sm shadow-[0_0_15px_rgba(6,182,212,0.5)]">
          F{floor.floor}
        </div>
      </div>
      
      {/* 楼层容器 */}
      <div className="relative bg-gradient-to-r from-slate-800/80 to-slate-900/80 rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300">
        {/* 连接线装饰 */}
        <div className="absolute -left-6 top-1/2 w-6 h-0.5 bg-cyan-500/50" />
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {floor.rooms.map((room: any) => (
            <div
              key={room.id}
              className="group relative bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-fuchsia-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(192,38,211,0.2)]"
            >
              {/* 房间类型图标 */}
              <div className="text-3xl mb-2">{getRoomEmoji(room.roomType)}</div>
              
              <h4 className="font-semibold text-white mb-1 group-hover:text-fuchsia-400 transition-colors">
                {room.name}
              </h4>
              <p className="text-xs text-slate-400 mb-3">{room.description}</p>
              
              {/* 角色信息 */}
              {room.characterName && (
                <div className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg">
                  {room.characterPortrait ? (
                    <img src={room.characterPortrait} alt={room.characterName} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold">
                      {room.characterName[0]}
                    </div>
                  )}
                  <span className="text-sm text-cyan-300">{room.characterName}</span>
                </div>
              )}
              
              {/* 霓虹角标 */}
              <div className="absolute top-2 right-2 text-[10px] text-slate-500 font-mono">
                #{room.id}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getRoomEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    bedroom: '🛏️',
    living: '🛋️',
    kitchen: '🍳',
    bathroom: '🚿',
    study: '📚',
    gym: '🏋️',
    garden: '🌺',
    storage: '📦',
    default: '🏠'
  }
  return emojiMap[type] || emojiMap.default
}

// 角色互动卡片
function CharacterInteractCard({ character, onInteract }: { character: RemoteCharacter; onInteract: () => void }) {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-fuchsia-500/20 hover:border-fuchsia-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(192,38,211,0.2)]">
      <div className="flex items-start gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 p-[3px]">
            {character.portraitUrl ? (
              <img src={character.portraitUrl} alt={character.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-3xl">
                {character.template?.角色档案?.基本信息?.性别 === '女' ? '👩' : '👨'}
              </div>
            )}
          </div>
          {/* 心情指示 */}
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-800 border-2 border-fuchsia-500 flex items-center justify-center text-lg">
            {getMoodEmoji(character.mood)}
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">{character.name}</h3>
          <p className="text-slate-400 text-sm mb-2">
            {character.template?.角色档案?.基本信息?.身份}
          </p>
          
          {/* 好感度 */}
          <div className="flex items-center gap-2 mb-3">
            <Heart size={16} className="text-pink-400" />
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(character.favorability, 100)}%` }}
              />
            </div>
            <span className="text-sm text-pink-400 font-medium">{character.favorability}</span>
          </div>
          
          {/* 互动按钮 */}
          <button
            onClick={onInteract}
            className="w-full py-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white font-medium transition-all duration-300 hover:shadow-[0_0_15px_rgba(192,38,211,0.4)] flex items-center justify-center gap-2"
          >
            <MessageCircle size={16} />
            互动
          </button>
        </div>
      </div>
    </div>
  )
}

function getMoodEmoji(mood: string): string {
  const emojiMap: Record<string, string> = {
    '开心': '😊',
    '平静': '😐',
    '难过': '😢',
    '生气': '😠',
    '兴奋': '🤩',
    '疲惫': '😴',
    'default': '😐'
  }
  return emojiMap[mood] || emojiMap.default
}

// 赛博朋克风格聊天对话框
function CyberpunkChatModal({ 
  character, 
  hostUserId,
  onClose 
}: { 
  character: RemoteCharacter; 
  hostUserId: number;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!input.trim()) return
    
    const userMessage = input.trim()
    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsTyping(true)
    
    try {
      // 调用真实的联机互动API
      const res = await fetch('/api/multiplayer/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostUserId,
          characterName: character.name,
          message: userMessage
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '互动失败')
      }
      
      const data = await res.json()
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.reply 
      }])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '互动失败，请稍后重试'
      setError(errorMsg)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `（系统提示：${errorMsg}）` 
      }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-fuchsia-500/30 shadow-[0_0_50px_rgba(192,38,211,0.2)] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-fuchsia-500/20 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 p-[2px]">
              {character.portraitUrl ? (
                <img src={character.portraitUrl} alt={character.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xl">
                  {character.template?.角色档案?.基本信息?.性别 === '女' ? '👩' : '👨'}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-white">{character.name}</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">访客模式</span>
                <span className="text-slate-400">独立变量系统</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* 聊天区域 */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <Sparkles size={48} className="mb-4 text-fuchsia-500/50" />
              <p>开始与 {character.name} 的对话吧</p>
              <p className="text-sm mt-2">访客模式下的对话不会保存</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-700 rounded-2xl px-4 py-3 flex items-center gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          )}
        </div>
        
        {/* 输入区域 */}
        <div className="p-4 border-t border-fuchsia-500/20">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="输入消息..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/30"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VisitPage() {
  const params = useParams()
  const router = useRouter()
  const userId = parseInt(params.userId as string)
  
  const [building, setBuilding] = useState<RemoteBuilding | null>(null)
  const [characters, setCharacters] = useState<RemoteCharacter[]>([])
  const [hostName, setHostName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'building' | 'characters'>('building')
  const [selectedCharacter, setSelectedCharacter] = useState<RemoteCharacter | null>(null)

  useEffect(() => {
    if (!isNaN(userId)) {
      fetchData()
    }
  }, [userId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/multiplayer/visit/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setBuilding(data.building)
        setCharacters(data.characters || [])
        setHostName(data.hostName || '房东')
      } else if (res.status === 403) {
        setError('该用户不允许访问')
        setBuilding(null)
      } else if (res.status === 404) {
        setError('用户不存在')
        setBuilding(null)
      } else {
        setError('获取数据失败')
        setBuilding(null)
      }
    } catch (err) {
      console.error('Fetch visit data error:', err)
      setError('网络错误，请稍后重试')
      setBuilding(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <div className="absolute inset-0 w-12 h-12 border-2 border-fuchsia-500/30 border-b-fuchsia-500 rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
        </div>
      </div>
    )
  }

  if (!building || error) {
    return (
      <div className="max-w-6xl mx-auto">
        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft size={20} />
          返回联机中心
        </button>
        
        <div className="text-center py-16">
          <div className="inline-block p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
            <Building2 size={48} className="mx-auto mb-4 text-slate-500" />
            <p className="text-slate-400">{error || '无法访问该用户的基建'}</p>
            <p className="text-sm text-slate-500 mt-2">该用户可能关闭了访问权限</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 返回按钮 */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors"
      >
        <ArrowLeft size={20} />
        返回联机中心
      </button>

      {/* 房东信息头 */}
      <div className="text-center mb-8 relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="w-96 h-96 bg-cyan-500 rounded-full blur-[120px]" />
        </div>
        
        <div className="relative">
          <div className="inline-block p-1 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-4">
            <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center text-4xl font-bold text-cyan-400">
              {hostName[0]?.toUpperCase() || '?'}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {hostName} 的基建
          </h1>
          <p className="text-slate-400 flex items-center justify-center gap-2">
            <Building2 size={16} className="text-cyan-400" />
            {building.floors.length} 层 · 
            <Users size={16} className="text-fuchsia-400" />
            {characters.length} 位租客
          </p>
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="flex justify-center gap-2 mb-8">
        <button
          onClick={() => setActiveTab('building')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
            activeTab === 'building'
              ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-cyan-500/30 hover:text-cyan-400'
          }`}
        >
          <Building2 size={18} />
          参观基建
        </button>
        <button
          onClick={() => setActiveTab('characters')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
            activeTab === 'characters'
              ? 'bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 text-white shadow-[0_0_20px_rgba(192,38,211,0.4)]'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-fuchsia-500/30 hover:text-fuchsia-400'
          }`}
        >
          <Sparkles size={18} />
          与租客互动
        </button>
      </div>

      {/* 内容区域 */}
      {activeTab === 'building' && (
        <div className="relative pl-20">
          {/* 垂直时间线 */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-fuchsia-500 to-cyan-500 pointer-events-none" />
          
          {building.floors.map((floor) => (
            <CyberpunkFloor key={floor.floor} floor={floor} />
          ))}
        </div>
      )}

      {activeTab === 'characters' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {characters.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="inline-block p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
                <Users size={48} className="mx-auto mb-4 text-slate-500" />
                <p className="text-slate-400">暂无租客</p>
              </div>
            </div>
          ) : (
            characters.map((character) => (
              <CharacterInteractCard
                key={character.name}
                character={character}
                onInteract={() => setSelectedCharacter(character)}
              />
            ))
          )}
        </div>
      )}

      {/* 聊天对话框 */}
      {selectedCharacter && (
        <CyberpunkChatModal
          character={selectedCharacter}
          hostUserId={userId}
          onClose={() => setSelectedCharacter(null)}
        />
      )}
    </div>
  )
}
