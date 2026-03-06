'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Sparkles, Lock, RotateCcw, ChevronRight } from 'lucide-react'

interface TalentInfo {
  id: string
  name: string
  maxLevel: number
  tier: number
  effect: string
  description: string
  currentLevel: number
}

interface TalentGroup {
  key: string
  label: string
  theme: {
    primary: string
    secondary: string
    accent: string
    glow: string
    gradient: string
  }
  icon: string
}

const TALENT_GROUPS: TalentGroup[] = [
  {
    key: 'charisma',
    label: '魅 力 系',
    theme: {
      primary: 'from-rose-500/20 to-pink-600/10',
      secondary: 'rose-400',
      accent: 'rose-500',
      glow: 'shadow-rose-500/30',
      gradient: 'from-rose-400 via-pink-500 to-rose-600'
    },
    icon: '💝'
  },
  {
    key: 'shadow',
    label: '暗 影 系',
    theme: {
      primary: 'from-violet-500/20 to-purple-600/10',
      secondary: 'violet-400',
      accent: 'violet-500',
      glow: 'shadow-violet-500/30',
      gradient: 'from-violet-400 via-purple-500 to-violet-600'
    },
    icon: '🌙'
  },
  {
    key: 'business',
    label: '经 营 系',
    theme: {
      primary: 'from-amber-500/20 to-orange-600/10',
      secondary: 'amber-400',
      accent: 'amber-500',
      glow: 'shadow-amber-500/30',
      gradient: 'from-amber-400 via-orange-500 to-amber-600'
    },
    icon: '👑'
  }
]

const TALENT_IDS: Record<string, string[]> = {
  charisma: ['charisma_sweet_talk', 'charisma_affinity', 'charisma_eloquence', 'charisma_aura', 'charisma_idol'],
  shadow: ['shadow_intimidate', 'shadow_hint', 'shadow_manipulate', 'shadow_fear', 'shadow_abyss'],
  business: ['business_merchant', 'business_discount', 'business_energy', 'business_hunter', 'business_tycoon']
}

// 粒子背景组件
const ParticleBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/20 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}

// 连接线组件
const ConnectionLine = ({ active, delay = 0 }: { active: boolean; delay?: number }) => (
  <motion.div
    className="absolute left-1/2 -translate-x-1/2 w-0.5 h-8 -top-8"
    style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1))' }}
    initial={{ scaleY: 0 }}
    animate={{ scaleY: active ? 1 : 0.3 }}
    transition={{ duration: 0.5, delay }}
  >
    {active && (
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-white/60"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    )}
  </motion.div>
)

export default function TalentsPage() {
  const [talents, setTalents] = useState<TalentInfo[]>([])
  const [talentPoints, setTalentPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [hoveredTalent, setHoveredTalent] = useState<string | null>(null)

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
        setMessage({ text: '✨ 天赋觉醒成功', ok: true })
        await fetchTalents()
      } else {
        setMessage({ text: data.error || '觉醒失败', ok: false })
      }
    } catch {
      setMessage({ text: '连接中断', ok: false })
    } finally {
      setPendingId(null)
      setTimeout(() => setMessage(null), 2500)
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
        setMessage({ text: '↺ 已重置，返还200金币', ok: true })
        await fetchTalents()
      } else {
        setMessage({ text: data.error || '重置失败', ok: false })
      }
    } catch {
      setMessage({ text: '连接中断', ok: false })
    } finally {
      setPendingId(null)
      setTimeout(() => setMessage(null), 2500)
    }
  }

  const getTalentMap = () => {
    const map: Record<string, TalentInfo> = {}
    talents.forEach(t => { map[t.id] = t })
    return map
  }

  const getGroupProgress = (groupKey: string) => {
    const groupIds = TALENT_IDS[groupKey]
    const groupTalents = groupIds.map(id => talentMap[id]).filter(Boolean)
    const totalLevels = groupTalents.reduce((sum, t) => sum + t.currentLevel, 0)
    const maxLevels = groupTalents.reduce((sum, t) => sum + t.maxLevel, 0)
    return { totalLevels, maxLevels, percent: maxLevels > 0 ? (totalLevels / maxLevels) * 100 : 0 }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />
        <motion.div
          className="relative z-10 flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-12 h-12 border-2 border-amber-400/30 border-t-amber-400 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <span className="text-amber-200/60 text-sm tracking-widest">LOADING...</span>
        </motion.div>
      </div>
    )
  }

  const talentMap = getTalentMap()

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景层 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(245,158,11,0.05),transparent_50%)]" />
      <ParticleBackground />

      {/* 内容层 */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* 头部 */}
        <motion.header
          className="flex items-center justify-between mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4">
            <Link
              href="/game"
              className="group flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/50 hover:bg-amber-400/10 transition-all duration-300"
            >
              <ArrowLeft size={18} className="text-gray-400 group-hover:text-amber-400 transition-colors" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent"
                style={{ fontFamily: 'Cinzel, Playfair Display, serif' }}>
                天赋神殿
              </h1>
              <p className="text-xs text-gray-500 tracking-widest uppercase mt-0.5">Talent Sanctum</p>
            </div>
          </div>

          {/* 天赋点显示 */}
          <motion.div
            className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/30"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles size={20} className="text-amber-400" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-xs text-amber-300/60 uppercase tracking-wider">可用点数</span>
              <span className="text-lg font-bold text-amber-200">{talentPoints}</span>
            </div>
          </motion.div>
        </motion.header>

        {/* 消息提示 */}
        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              className={`mb-6 px-6 py-3 rounded-xl text-sm text-center border ${
                message.ok
                  ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-400/30 text-red-300'
              }`}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 天赋树网格 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {TALENT_GROUPS.map((group, groupIndex) => {
            const progress = getGroupProgress(group.key)
            const isSelected = selectedGroup === group.key

            return (
              <motion.div
                key={group.key}
                className="relative"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: groupIndex * 0.15 }}
                onMouseEnter={() => setSelectedGroup(group.key)}
                onMouseLeave={() => setSelectedGroup(null)}
              >
                {/* 卡片容器 */}
                <div className={`relative rounded-2xl overflow-hidden border transition-all duration-500 ${
                  isSelected ? `border-${group.theme.accent}/40` : 'border-white/5'
                }`}>
                  {/* 背景渐变 */}
                  <div className={`absolute inset-0 bg-gradient-to-b ${group.theme.primary} opacity-30`} />
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

                  {/* 头部 */}
                  <div className="relative px-5 py-4 border-b border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <motion.span
                          className="text-2xl"
                          animate={isSelected ? { scale: 1.2, rotate: [0, -10, 10, 0] } : { scale: 1 }}
                          transition={{ duration: 0.5 }}
                        >
                          {group.icon}
                        </motion.span>
                        <h2 className={`text-sm font-bold tracking-[0.2em] text-${group.theme.secondary}`}>
                          {group.label}
                        </h2>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">
                        {progress.totalLevels}/{progress.maxLevels}
                      </span>
                    </div>

                    {/* 进度条 */}
                    <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${group.theme.gradient}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.percent}%` }}
                        transition={{ duration: 1, delay: 0.5 + groupIndex * 0.2 }}
                      />
                    </div>
                  </div>

                  {/* 天赋列表 */}
                  <div className="relative p-4 space-y-3">
                    {TALENT_IDS[group.key].map((id, index) => {
                      const t = talentMap[id]
                      if (!t) return null

                      const isMaxed = t.currentLevel >= t.maxLevel
                      const prevTierUnlocked = t.tier === 1 || TALENT_IDS[group.key]
                        .filter(gid => talentMap[gid]?.tier === t.tier - 1)
                        .some(gid => (talentMap[gid]?.currentLevel || 0) > 0)
                      const isLocked = !prevTierUnlocked
                      const canAllocate = !isMaxed && !isLocked && talentPoints > 0
                      const isHovered = hoveredTalent === id

                      return (
                        <motion.div
                          key={id}
                          className="relative"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 + groupIndex * 0.15 }}
                          onMouseEnter={() => setHoveredTalent(id)}
                          onMouseLeave={() => setHoveredTalent(null)}
                        >
                          {/* 层级连接线 */}
                          {index > 0 && (
                            <ConnectionLine active={t.currentLevel > 0 || !isLocked} delay={index * 0.1} />
                          )}

                          <motion.div
                            className={`relative rounded-xl border p-4 transition-all duration-300 ${
                              t.currentLevel > 0
                                ? `bg-gradient-to-r ${group.theme.primary} border-${group.theme.accent}/30 ${group.theme.glow} shadow-lg`
                                : isLocked
                                ? 'bg-black/20 border-white/5 opacity-50'
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                            whileHover={!isLocked ? { scale: 1.02, x: 4 } : {}}
                            animate={isHovered && canAllocate ? {
                              boxShadow: [`0 0 0 0 rgba(255,255,255,0)`, `0 0 20px 2px rgba(245,158,11,0.15)`, `0 0 0 0 rgba(255,255,255,0)`]
                            } : {}}
                            transition={{ duration: 1.5, repeat: isHovered && canAllocate ? Infinity : 0 }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              {/* 左侧信息 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {isLocked ? (
                                    <Lock size={12} className="text-gray-600" />
                                  ) : t.currentLevel > 0 ? (
                                    <motion.div
                                      className={`w-2 h-2 rounded-full bg-${group.theme.accent}`}
                                      animate={{ boxShadow: [`0 0 0 0`, `0 0 10px 2px currentColor`, `0 0 0 0`] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                    />
                                  ) : null}
                                  <span className={`font-medium text-sm ${
                                    t.currentLevel > 0 ? `text-${group.theme.secondary}` : 'text-gray-400'
                                  }`}>
                                    {t.name}
                                  </span>
                                  {t.maxLevel > 1 && (
                                    <span className={`text-xs ${
                                      t.currentLevel > 0 ? `text-${group.theme.accent}/60` : 'text-gray-600'
                                    }`}>
                                      Lv.{t.currentLevel}/{t.maxLevel}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed">{t.description}</p>

                                {/* 等级指示点 */}
                                {t.maxLevel > 1 && (
                                  <div className="flex gap-1.5 mt-2.5">
                                    {Array.from({ length: t.maxLevel }).map((_, i) => (
                                      <motion.div
                                        key={i}
                                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                                          i < t.currentLevel
                                            ? `bg-${group.theme.accent}`
                                            : 'bg-white/10'
                                        }`}
                                        initial={false}
                                        animate={i < t.currentLevel ? { scale: [1, 1.2, 1] } : {}}
                                        transition={{ duration: 0.3, delay: i * 0.05 }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 操作按钮 */}
                              <div className="flex flex-col gap-1.5 shrink-0">
                                {t.currentLevel > 0 && (
                                  <motion.button
                                    onClick={() => refund(id)}
                                    disabled={!!pendingId}
                                    className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-amber-300 hover:border-amber-400/30 hover:bg-amber-400/10 transition-all disabled:opacity-30"
                                    whileHover={{ scale: 1.1, rotate: -10 }}
                                    whileTap={{ scale: 0.95 }}
                                    title="重置 (返还200金币)"
                                  >
                                    <RotateCcw size={12} />
                                  </motion.button>
                                )}
                                {!isMaxed && (
                                  <motion.button
                                    onClick={() => allocate(id)}
                                    disabled={!canAllocate || !!pendingId}
                                    className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-all disabled:opacity-30 ${
                                      canAllocate
                                        ? `bg-${group.theme.accent}/20 border-${group.theme.accent}/40 text-${group.theme.secondary} hover:bg-${group.theme.accent}/30`
                                        : 'bg-white/5 border-white/10 text-gray-600'
                                    }`}
                                    whileHover={canAllocate ? { scale: 1.1 } : {}}
                                    whileTap={canAllocate ? { scale: 0.95 } : {}}
                                    title={canAllocate ? '觉醒天赋' : isLocked ? '需要前置天赋' : '天赋点不足'}
                                  >
                                    <ChevronRight size={14} />
                                  </motion.button>
                                )}
                              </div>
                            </div>

                            {/* 已激活特效 */}
                            {t.currentLevel > 0 && (
                              <motion.div
                                className="absolute -inset-px rounded-xl pointer-events-none"
                                style={{
                                  background: `linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)`,
                                }}
                                animate={{
                                  backgroundPosition: ['200% 200%', '-200% -200%'],
                                }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                              />
                            )}
                          </motion.div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* 底部说明 */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-white/5 border border-white/10">
            <span className="text-xs text-gray-500">
              <span className="text-amber-400/60">◆</span> 升级可获得天赋点
            </span>
            <span className="w-px h-3 bg-white/10" />
            <span className="text-xs text-gray-500">
              重置消耗 <span className="text-amber-400">200</span> 金币 <span className="text-amber-400/60">◆</span>
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
