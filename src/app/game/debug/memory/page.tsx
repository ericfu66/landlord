'use client'

import { useState, useEffect } from 'react'
import { Brain, Search, ChevronRight, Clock, User, Hash, RefreshCw, Download, Trash2, AlertTriangle } from 'lucide-react'

interface CharacterMemory {
  id: number
  characterName: string
  summary: string
  interactionDate: string
  createdAt: string
}

interface MemoryStats {
  totalMemories: number
  characters: string[]
  dateRange: {
    earliest: string
    latest: string
  }
}

// 终端风格字符头像
function TerminalAvatar({ name }: { name: string }) {
  const colors = ['text-green-400', 'text-cyan-400', 'text-yellow-400', 'text-pink-400', 'text-purple-400']
  const color = colors[name.charCodeAt(0) % colors.length]
  
  return (
    <div className="w-10 h-10 rounded bg-slate-800 border border-slate-600 flex items-center justify-center font-mono text-lg font-bold">
      <span className={color}>{name[0].toUpperCase()}</span>
    </div>
  )
}

// 记忆条目 - 终端日志风格
function MemoryLog({ memory, index }: { memory: CharacterMemory; index: number }) {
  const [expanded, setExpanded] = useState(false)
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="font-mono text-sm border-l-2 border-slate-700 hover:border-green-500 transition-colors">
      <div 
        className="flex items-center gap-3 py-2 px-3 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-slate-500 text-xs">[{String(index + 1).padStart(3, '0')}]</span>
        <Clock size={12} className="text-slate-600" />
        <span className="text-slate-400">{formatDate(memory.interactionDate)}</span>
        <ChevronRight 
          size={14} 
          className={`text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} 
        />
        <span className="text-green-400">{memory.characterName}</span>
        <span className="text-slate-600">#{memory.id}</span>
      </div>

      {expanded && (
        <div className="pl-12 pr-4 pb-4">
          <div className="bg-slate-900/80 rounded border border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
              <Hash size={12} />
              <span>内存地址: 0x{memory.id.toString(16).toUpperCase().padStart(8, '0')}</span>
              <span className="text-slate-700">|</span>
              <Clock size={12} />
              <span>创建时间: {formatDate(memory.createdAt)}</span>
            </div>
            
            <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {memory.summary}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MemoryDebugPage() {
  const [memories, setMemories] = useState<CharacterMemory[]>([])
  const [filteredMemories, setFilteredMemories] = useState<CharacterMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCharacter, setSelectedCharacter] = useState<string>('all')
  const [stats, setStats] = useState<MemoryStats | null>(null)

  useEffect(() => {
    fetchMemories()
  }, [])

  useEffect(() => {
    filterMemories()
  }, [memories, searchQuery, selectedCharacter])

  const fetchMemories = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/memories')
      
      if (res.ok) {
        const data = await res.json()
        setMemories(data.memories || [])
        setFilteredMemories(data.memories || [])
        
        if (data.memories && data.memories.length > 0) {
          const characterSet = new Set<string>()
          data.memories.forEach((m: CharacterMemory) => characterSet.add(m.characterName))
          const characters = Array.from(characterSet).sort()
          
          const dates = data.memories.map((m: CharacterMemory) => new Date(m.interactionDate))
          
          setStats({
            totalMemories: data.memories.length,
            characters,
            dateRange: {
              earliest: new Date(Math.min(...dates.map((d: Date) => d.getTime()))).toISOString(),
              latest: new Date(Math.max(...dates.map((d: Date) => d.getTime()))).toISOString()
            }
          })
        }
      }
    } catch (error) {
      console.error('Fetch memories error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterMemories = () => {
    let filtered = [...memories]
    
    if (selectedCharacter !== 'all') {
      filtered = filtered.filter(m => m.characterName === selectedCharacter)
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(m => 
        m.summary.toLowerCase().includes(query) ||
        m.characterName.toLowerCase().includes(query)
      )
    }
    
    setFilteredMemories(filtered)
  }

  const exportMemories = () => {
    const data = {
      exportTime: new Date().toISOString(),
      totalCount: memories.length,
      memories: memories
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `memories_export_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearAllMemories = async () => {
    if (!confirm('警告：此操作将清空所有角色的记忆！\n\n确定要继续吗？')) return
    if (!confirm('再次确认：这将删除所有记忆数据且无法恢复！')) return
    
    try {
      const res = await fetch('/api/memories', { method: 'DELETE' })
      if (res.ok) {
        setMemories([])
        setFilteredMemories([])
        setStats(null)
        alert('记忆数据已清空')
      }
    } catch (error) {
      console.error('Clear memories error:', error)
      alert('清空失败')
    }
  }

  const characterSet = new Set<string>()
  memories.forEach(m => characterSet.add(m.characterName))
  const characters = Array.from(characterSet).sort()

  return (
    <div className="max-w-6xl mx-auto font-mono">
      <div className="mb-6 border-b-2 border-slate-700 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded bg-slate-800 border border-slate-600 flex items-center justify-center">
            <Brain size={24} className="text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-green-400">MEMORY_DEBUG.exe</h1>
            <p className="text-slate-500 text-sm">角色记忆系统调试终端 v1.0</p>
          </div>
        </div>

        {stats && (
          <div className="flex flex-wrap gap-4 text-sm mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded border border-slate-700">
              <Hash size={14} className="text-cyan-400" />
              <span className="text-slate-400">总记录:</span>
              <span className="text-cyan-400 font-bold">{stats.totalMemories}</span>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded border border-slate-700">
              <User size={14} className="text-yellow-400" />
              <span className="text-slate-400">角色数:</span>
              <span className="text-yellow-400 font-bold">{stats.characters.length}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded border border-slate-700">
              <Clock size={14} className="text-pink-400" />
              <span className="text-slate-400">时间跨度:</span>
              <span className="text-pink-400">{new Date(stats.dateRange.earliest).toLocaleDateString()} - {new Date(stats.dateRange.latest).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6 p-4 bg-slate-800/50 rounded border border-slate-700">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 rounded border border-slate-700 focus-within:border-green-500 transition-colors">
              <Search size={16} className="text-slate-500" />
              <input
                type="text"
                placeholder="搜索记忆内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-slate-300 placeholder-slate-600 focus:outline-none font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <User size={16} className="text-slate-500" />
            <select
              value={selectedCharacter}
              onChange={(e) => setSelectedCharacter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-300 focus:outline-none focus:border-green-500 font-mono text-sm"
            >
              <option value="all">全部角色</option>
              {characters.map(char => (
                <option key={char} value={char}>{char}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchMemories}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded border border-slate-600 transition-colors flex items-center gap-2 text-sm"
            >
              <RefreshCw size={14} />
              刷新
            </button>
            
            <button
              onClick={exportMemories}
              disabled={memories.length === 0}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded border border-slate-600 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Download size={14} />
              导出
            </button>
            
            <button
              onClick={clearAllMemories}
              disabled={memories.length === 0}
              className="px-4 py-2 bg-red-900/50 hover:bg-red-900/80 text-red-400 rounded border border-red-800 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Trash2 size={14} />
              清空
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded border border-slate-700 overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-3 bg-slate-800 border-b border-slate-700 text-xs text-slate-500 font-mono">
          <div className="w-12">#</div>
          <div className="w-8"></div>
          <div className="w-32">时间戳</div>
          <div className="flex-1">角色</div>
          <div className="w-16">ID</div>
        </div>

        <div className="divide-y divide-slate-800/50">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-3 text-slate-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>正在读取记忆数据...</span>
              </div>
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-block p-4 rounded-lg bg-slate-800 border border-slate-700">
                <Brain size={32} className="mx-auto mb-3 text-slate-600" />
                <div className="text-slate-500 mb-1"> NO_DATA_FOUND</div>
                <div className="text-slate-600 text-sm">未找到符合条件的记忆记录</div>
                {searchQuery && (
                  <div className="text-slate-600 text-xs mt-2">搜索词: &quot;{searchQuery}&quot;</div>
                )}
              </div>
            </div>
          ) : (
            filteredMemories.map((memory, index) => (
              <MemoryLog
                key={memory.id}
                memory={memory}
                index={index}
              />
            ))
          )}
        </div>

        <div className="px-4 py-3 bg-slate-800 border-t border-slate-700 text-xs text-slate-500 flex justify-between">
          <span>显示 {filteredMemories.length} / {memories.length} 条记录</span>
          <span>Memory_Debug_v1.0</span>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded flex items-start gap-3">
        <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-200/80">
          <div className="font-bold mb-1">调试说明</div>
          <div className="space-y-1">
            <div>• 此页面用于调试和查看角色记忆系统的数据</div>
            <div>• 每次与角色互动后，系统会自动生成记忆摘要</div>
            <div>• 最近5条记忆会注入到角色的对话上下文中</div>
            <div>• 清空记忆数据将无法恢复，请谨慎操作</div>
          </div>
        </div>
      </div>
    </div>
  )
}
