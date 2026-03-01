'use client'

import { useState } from 'react'

interface PresetEditorProps {
  presetType: 'daily' | 'date' | 'flirt' | 'free'
  entries: Array<{
    id: string
    role: 'system' | 'user' | 'assistant'
    content: string
    order: number
    isFixed: boolean
  }>
  onSave: (entries: Array<{
    id: string
    role: 'system' | 'user' | 'assistant'
    content: string
    order: number
    isFixed: boolean
  }>) => void
}

export default function PresetEditor({ presetType, entries, onSave }: PresetEditorProps) {
  const [editingEntries, setEditingEntries] = useState(entries)
  const [newEntry, setNewEntry] = useState({
    role: 'system' as 'system' | 'user' | 'assistant',
    content: ''
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
        isFixed: false
      }
    ])
    setNewEntry({ role: 'system', content: '' })
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
    onSave(editingEntries)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold capitalize">{presetType} 预设编辑器</h3>

      <div className="space-y-2">
        {editingEntries.map((entry) => (
          <div
            key={entry.id}
            className={`glass-card p-3 ${entry.isFixed ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-xs px-2 py-1 bg-white/10 rounded">
                {entry.role}
              </span>
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
                    rows={2}
                  />
                )}
              </div>
              {!entry.isFixed && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveEntry(entry.id, 'up')}
                    className="text-xs px-2 py-1 bg-white/10 rounded hover:bg-white/20"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveEntry(entry.id, 'down')}
                    className="text-xs px-2 py-1 bg-white/10 rounded hover:bg-white/20"
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
        <div className="flex gap-2">
          <select
            value={newEntry.role}
            onChange={(e) => setNewEntry({ ...newEntry, role: e.target.value as any })}
            className="px-2 py-1 bg-white/10 border border-white/20 rounded text-sm"
          >
            <option value="system">system</option>
            <option value="user">user</option>
            <option value="assistant">assistant</option>
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