'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star, Lock } from 'lucide-react'

interface TalentInfo {
  id: string
  name: string
  maxLevel: number
  tier: number
  effect: string
  description: string
  currentLevel: number
}

const TALENT_GROUPS = {
  charisma: {
    label: '魅力系',
    color: 'rose',
    ids: ['charisma_sweet_talk', 'charisma_affinity', 'charisma_eloquence', 'charisma_aura', 'charisma_idol']
  },
  shadow: {
    label: '暗影系',
    color: 'violet',
    ids: ['shadow_intimidate', 'shadow_hint', 'shadow_manipulate', 'shadow_fear', 'shadow_abyss']
  },
  business: {
    label: '经营系',
    color: 'amber',
    ids: ['business_merchant', 'business_discount', 'business_energy', 'business_hunter', 'business_tycoon']
  }
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; dim: string }> = {
  rose: { bg: 'bg-rose-900/60', border: 'border-rose-700', text: 'text-rose-300', dim: 'text-rose-600' },
  violet: { bg: 'bg-violet-900/60', border: 'border-violet-700', text: 'text-violet-300', dim: 'text-violet-600' },
  amber: { bg: 'bg-amber-900/60', border: 'border-amber-700', text: 'text-amber-300', dim: 'text-amber-600' },
}

export default function TalentsPage() {
  const [talents, setTalents] = useState<TalentInfo[]>([])
  const [talentPoints, setTalentPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    fetchTalents()
  }, [])

  const fetchTalents = async () => {
    try {
      const res = await fetch('/api/talents')
      const data = await res.json()
      if (data.talents) setTalents(data.talents)
      if (data.talentPoints !== undefined) setTalentPoints(data.talentPoints)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const allocate = async (id: string) => {
    if (pendingId) return
    setPendingId(id)
    try {
      const res = await fetch('/api/talents/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ talent_id: id })
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ text: '天赋点已分配', ok: true })
        await fetchTalents()
      } else {
        setMessage({ text: data.error || '分配失败', ok: false })
      }
    } catch {
      setMessage({ text: '网络错误', ok: false })
    } finally {
      setPendingId(null)
      setTimeout(() => setMessage(null), 2000)
    }
  }

  const refund = async (id: string) => {
    if (pendingId) return
    setPendingId(id)
    try {
      const res = await fetch('/api/talents/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ talent_id: id })
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ text: `已退点，返还200金币`, ok: true })
        await fetchTalents()
      } else {
        setMessage({ text: data.error || '退点失败', ok: false })
      }
    } catch {
      setMessage({ text: '网络错误', ok: false })
    } finally {
      setPendingId(null)
      setTimeout(() => setMessage(null), 2000)
    }
  }

  const getTalentMap = () => {
    const map: Record<string, TalentInfo> = {}
    talents.forEach(t => { map[t.id] = t })
    return map
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  const talentMap = getTalentMap()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/game" className="text-gray-400 hover:text-gray-200 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-semibold">天赋树</h1>
          </div>
          <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800">
            <Star size={14} className="text-amber-400" />
            <span className="text-sm font-medium">{talentPoints} 天赋点</span>
          </div>
        </div>

        {/* Toast */}
        {message && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm text-center ${
            message.ok ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-800' : 'bg-red-900/60 text-red-300 border border-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Talent Groups */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(TALENT_GROUPS).map(([key, group]) => {
            const colors = COLOR_MAP[group.color]
            return (
              <div key={key} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className={`px-4 py-2.5 border-b border-gray-800`}>
                  <h2 className={`font-semibold text-sm ${colors.text}`}>{group.label}</h2>
                </div>
                <div className="p-3 space-y-2">
                  {group.ids.map(id => {
                    const t = talentMap[id]
                    if (!t) return null
                    const isMaxed = t.currentLevel >= t.maxLevel
                    const isLocked = t.tier > 1 && !group.ids
                      .filter(gid => talentMap[gid]?.tier === t.tier - 1)
                      .some(gid => (talentMap[gid]?.currentLevel || 0) > 0)
                    const canAllocate = !isMaxed && !isLocked && talentPoints > 0

                    return (
                      <div
                        key={id}
                        className={`rounded-lg p-3 border transition-all ${
                          t.currentLevel > 0
                            ? `${colors.bg} ${colors.border}`
                            : isLocked
                            ? 'bg-gray-800/40 border-gray-700 opacity-50'
                            : 'bg-gray-800/60 border-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isLocked && <Lock size={11} className="text-gray-500 shrink-0" />}
                              <span className={`text-xs font-medium ${t.currentLevel > 0 ? colors.text : 'text-gray-400'}`}>
                                {t.name}
                              </span>
                              {t.maxLevel > 1 && (
                                <span className={`text-xs ${t.currentLevel > 0 ? colors.dim : 'text-gray-600'}`}>
                                  {t.currentLevel}/{t.maxLevel}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.description}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {t.currentLevel > 0 && (
                              <button
                                onClick={() => refund(id)}
                                disabled={!!pendingId}
                                className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:opacity-40 transition-colors"
                                title="退点（返还200金币）"
                              >
                                退
                              </button>
                            )}
                            {!isMaxed && (
                              <button
                                onClick={() => allocate(id)}
                                disabled={!canAllocate || !!pendingId}
                                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                                  canAllocate
                                    ? `${colors.bg} ${colors.text} hover:opacity-80 border ${colors.border}`
                                    : 'bg-gray-700 text-gray-500 opacity-40'
                                } disabled:cursor-not-allowed`}
                              >
                                +1
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Level dots */}
                        {t.maxLevel > 1 && (
                          <div className="flex gap-1 mt-2">
                            {Array.from({ length: t.maxLevel }).map((_, i) => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full ${i < t.currentLevel ? colors.bg.replace('/60', '') : 'bg-gray-700'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-600 text-center mt-6">
          升级可获得天赋点 · 退点消耗 200 金币
        </p>
      </div>
    </div>
  )
}
