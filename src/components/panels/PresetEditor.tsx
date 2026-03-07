'use client'

import { useState } from 'react'
import { DEFAULT_PERSONA_PROMPT } from '@/prompts/preset-defaults'
import { PersonaPosition } from '@/types/preset'

interface PresetEditorProps {
  presetType: 'daily' | 'date' | 'flirt' | 'free'
  entries: Array<{
    id: string
    role: 'system' | 'user' | 'assistant'
    content: string
    order: number
    isFixed: boolean
    type?: 'persona' | 'memory' | 'history' | 'mode' | 'custom'
  }>
  personaPosition: PersonaPosition
  onSave: (entries: Array<{
    id: string
    role: 'system' | 'user' | 'assistant'
    content: string
    order: number
    isFixed: boolean
    type?: 'persona' | 'memory' | 'history' | 'mode' | 'custom'
  }>, personaPosition: PersonaPosition) => void
}

const TYPE_LABELS: Record<string, string> = {
  persona: '人设',
  memory: '记忆',
  history: '历史',
  mode: '模式',
  custom: '自定义'
}

const TYPE_COLORS: Record<string, string> = {
  persona: 'bg-purple-600/50',
  memory: 'bg-blue-600/50',
  history: 'bg-green-600/50',
  mode: 'bg-orange-600/50',
  custom: 'bg-white/10'
}

export default function PresetEditor({ presetType, entries, personaPosition, onSave }: PresetEditorProps) {
  const [editingEntries, setEditingEntries] = useState(entries)
  const [newEntry, setNewEntry] = useState({
    role: 'system' as 'system' | 'user' | 'assistant',
    content: '',
    type: 'custom' as 'persona' | 'memory' | 'history' | 'mode' | 'custom'
  })

  const addEntry = () => {
    if (!newEntry.content.trim()) return

    setEditingEntries([
      ...editingEntries,
      {
        id: Date.now().toString(),
        role: newEntry.role,
        content: newEntry.content,
        order: editingEntries.length,
        isFixed: false,
        type: newEntry.type
      }
    ])
    setNewEntry({ role: 'system', content: '', type: 'custom' })
  }

  const addPersonaEntry = () => {
    // 检查是否已存在人设条目
    const existingPersona = editingEntries.filter(e => e.type === 'persona')
    if (existingPersona.length > 0) {
      if (!confirm('已存在人设条目，确定要添加新的人设条目吗？')) {
        return
      }
    }

    setEditingEntries([
      ...editingEntries,
      {
        id: Date.now().toString(),
        role: 'system',
        content: DEFAULT_PERSONA_PROMPT,
        order: editingEntries.length,
        isFixed: false,
        type: 'persona'
      }
    ])
  }

  const removeEntry = (id: string) => {
    setEditingEntries(editingEntries.filter((e) => e.id !== id))
  }

  const moveEntry = (id: string, direction: 'up' | 'down') => {
    const index = editingEntries.findIndex((e) => e.id === id)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === editingEntries.length - 1) return

    const newEntries = [...editingEntries]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    ;[newEntries[index], newEntries[swapIndex]] = [newEntries[swapIndex], newEntries[index]]
    
    newEntries.forEach((e, i) => {
      e.order = i
    })

    setEditingEntries(newEntries)
  }

  const handleSave = () => {
    onSave(editingEntries, personaPosition)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold capitalize">{presetType} 预设编辑器</h3>

      <div className="space-y-2">
        {editingEntries.map((entry, index) => (
          <div
            key={entry.id}
            className={`glass-card p-3 ${entry.isFixed ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-1">
                <span className={`text-xs px-2 py-1 rounded ${TYPE_COLORS[entry.type || 'custom']}`}>
                  {TYPE_LABELS[entry.type || 'custom']}
                </span>
                <span className="text-xs px-2 py-1 bg-white/10 rounded text-center">
                  {entry.role}
                </span>
              </div>
              <div className="flex-1">
                {entry.isFixed ? (
                  <p className="text-sm text-gray-300">{entry.content}</p>
                ) : (
                  <textarea
                    value={entry.content}
                    onChange={(e) => {
                      const updated = editingEntries.map((en) =>
                        en.id === entry.id ? { ...en, content: e.target.value } : en
                      )
                      setEditingEntries(updated)
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded p-2 text-sm"
                    rows={entry.type === 'persona' ? 8 : 2}
                  />
                )}
              </div>
              {!entry.isFixed && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveEntry(entry.id, 'up')}
                    disabled={index === 0}
                    className="text-xs px-2 py-1 bg-white/10 rounded hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveEntry(entry.id, 'down')}
                    disabled={index === editingEntries.length - 1}
                    className="text-xs px-2 py-1 bg-white/10 rounded hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="text-xs px-2 py-1 bg-red-500/20 rounded hover:bg-red-500/40"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-3">
        <div className="flex gap-2 mb-3">
          <select
            value={newEntry.role}
            onChange={(e) => setNewEntry({ ...newEntry, role: e.target.value as any })}
            className="px-2 py-1 bg-white/10 border border-white/20 rounded text-sm"
          >
            <option value="system">system</option>
            <option value="user">user</option>
            <option value="assistant">assistant</option>
          </select>
          <select
            value={newEntry.type}
            onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value as any })}
            className="px-2 py-1 bg-white/10 border border-white/20 rounded text-sm"
          >
            <option value="custom">自定义</option>
            <option value="persona">人设</option>
            <option value="memory">记忆</option>
            <option value="history">历史</option>
          </select>
          <input
            type="text"
            value={newEntry.content}
            onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
            className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-sm"
            placeholder="新条目内容..."
          />
          <button
            onClick={addEntry}
            className="px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-500"
          >
            添加
          </button>
        </div>
        
        <div className="flex gap-2 pt-3 border-t border-white/10">
          <button
            onClick={addPersonaEntry}
            className="flex-1 py-2 bg-purple-600/30 border border-purple-500/50 rounded-lg text-sm hover:bg-purple-600/50 transition-colors"
          >
            ➕ 添加人设条目
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          💡 提示：添加人设条目后，可以通过 ↑↓ 按钮调整其位置。如果预设中包含人设条目，将优先使用预设中的人设而非默认人设。
        </p>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90"
      >
        保存预设
      </button>
    </div>
  )
}