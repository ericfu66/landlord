'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PresetEditor from '@/components/panels/PresetEditor'
import {
  DAILY_PRESET_PROMPT,
  DATE_PRESET_PROMPT,
  FLIRT_PRESET_PROMPT,
  FREE_PRESET_PROMPT,
  MEMORY_TEMPLATE,
  HISTORY_TEMPLATE
} from '@/prompts/preset-defaults'
import { InteractionMode, PresetEntry } from '@/types/preset'
import { ArrowLeft } from 'lucide-react'

const MODE_LABELS: Record<InteractionMode, string> = {
  daily: '日常',
  date: '约会',
  flirt: '调情',
  free: '自由'
}

const MODE_PROMPTS: Record<InteractionMode, string> = {
  daily: DAILY_PRESET_PROMPT,
  date: DATE_PRESET_PROMPT,
  flirt: FLIRT_PRESET_PROMPT,
  free: FREE_PRESET_PROMPT
}

function getFixedEntries(mode: InteractionMode): PresetEntry[] {
  return [
    {
      id: 'fixed-mode',
      role: 'system',
      content: MODE_PROMPTS[mode],
      order: 0,
      isFixed: true
    },
    {
      id: 'fixed-memory',
      role: 'system',
      content: MEMORY_TEMPLATE,
      order: 1,
      isFixed: true
    },
    {
      id: 'fixed-history',
      role: 'system',
      content: HISTORY_TEMPLATE,
      order: 2,
      isFixed: true
    }
  ]
}

export default function PresetsPage() {
  const router = useRouter()
  const [mode, setMode] = useState<InteractionMode>('daily')
  const [entries, setEntries] = useState<PresetEntry[]>(getFixedEntries('daily'))
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const loadPreset = async (targetMode: InteractionMode) => {
    setLoading(true)
    setMessage('')

    try {
      const res = await fetch(`/api/presets?presetType=${targetMode}`)
      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || '加载预设失败')
        setEntries(getFixedEntries(targetMode))
        return
      }

      const baseEntries = getFixedEntries(targetMode)
      const customEntries: PresetEntry[] = (data.entries || []).map((entry: PresetEntry, index: number) => ({
        ...entry,
        order: index + baseEntries.length,
        isFixed: false
      }))

      setEntries([...baseEntries, ...customEntries])
    } catch {
      setMessage('加载预设失败')
      setEntries(getFixedEntries(targetMode))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPreset(mode)
  }, [mode])

  const handleSave = async (nextEntries: PresetEntry[]) => {
    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetType: mode, entries: nextEntries })
      })

      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || '保存失败')
        return
      }

      setMessage('预设保存成功')
      await loadPreset(mode)
    } catch {
      setMessage('保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-3 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-3 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.back()} 
              className="p-2 hover:bg-white/10 rounded-lg transition-colors touch-target-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold">互动预设</h1>
          </div>
        </div>

        <div className="glass-card p-3 sm:p-4">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {(['daily', 'date', 'flirt', 'free'] as InteractionMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={loading}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm touch-target-sm ${
                  mode === m ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
          {entries.length > 0 && (
            <PresetEditor key={mode} presetType={mode} entries={entries} onSave={handleSave} />
          )}
        </div>

        {message && (
          <p className={`text-xs sm:text-sm ${message.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>
    </main>
  )
}
