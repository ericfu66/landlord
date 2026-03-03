'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Users, Eye, MessageCircle, History, Shield, Radio } from 'lucide-react'
import { MultiplayerSettings, VisitableUser, VisitRecord } from '@/types/multiplayer'

// 赛博朋克风格用户卡片
function CyberpunkUserCard({ user, onVisit }: { user: VisitableUser; onVisit: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-cyan-500/30 hover:border-cyan-400 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]">
      {/* 动态网格背景 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(6,182,212,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }} />
      </div>
      
      {/* 霓虹光效 */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-500" />
      
      <div className="relative p-6">
        {/* 用户头像区域 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 p-[2px]">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-2xl font-bold text-cyan-400">
                {user.username[0].toUpperCase()}
              </div>
            </div>
            {/* 在线状态指示器 */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-slate-900 animate-pulse" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
              {user.username}
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Lv.{Math.floor(user.totalFloors * 0.5 + user.characterCount * 0.3)}
              </span>
              <span className="text-slate-400">房东</span>
            </div>
          </div>
        </div>
        
        {/* 统计数据 - 霓虹风格 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
            <div className="text-2xl font-bold text-cyan-400">{user.totalFloors}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">楼层</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-fuchsia-500/20 hover:border-fuchsia-500/40 transition-colors">
            <div className="text-2xl font-bold text-fuchsia-400">{user.characterCount}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">租客</div>
          </div>
        </div>
        
        {/* 访问按钮 */}
        <button
          onClick={onVisit}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 group/btn"
        >
          <Globe size={18} className="group-hover/btn:rotate-12 transition-transform" />
          参观基建
        </button>
      </div>
      
      {/* 角落装饰 */}
      <div className="absolute top-2 right-2 text-cyan-500/30 text-xs font-mono">ID:{user.userId}</div>
    </div>
  )
}

// 赛博朋克风格开关
function CyberpunkToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-cyan-500/30 transition-all">
      <span className="text-slate-300 font-medium">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
          checked ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-slate-600'
        }`}
      >
        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 ${
          checked ? 'left-8' : 'left-1'
        }`} />
      </button>
    </div>
  )
}

export default function MultiplayerPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<MultiplayerSettings | null>(null)
  const [users, setUsers] = useState<VisitableUser[]>([])
  const [visitHistory, setVisitHistory] = useState<VisitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'history'>('users')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [settingsRes, usersRes, historyRes] = await Promise.all([
        fetch('/api/multiplayer/settings'),
        fetch('/api/multiplayer/users'),
        fetch('/api/multiplayer/history')
      ])
      
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data.settings)
      }
      
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users)
      }
      
      if (historyRes.ok) {
        const data = await historyRes.json()
        setVisitHistory(data.history || [])
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (key: keyof MultiplayerSettings, value: boolean) => {
    if (!settings) return
    
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    
    try {
      setSaving(true)
      const res = await fetch('/api/multiplayer/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })
      
      if (!res.ok) {
        setSettings(settings)
      }
    } catch (error) {
      console.error('更新设置失败:', error)
      setSettings(settings)
    } finally {
      setSaving(false)
    }
  }

  const visitUser = (userId: number) => {
    router.push(`/game/multiplayer/visit/${userId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <div className="absolute inset-0 w-12 h-12 border-2 border-fuchsia-500/30 border-b-fuchsia-500 rounded-full animate-spin animate-reverse" style={{ animationDuration: '1.5s' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 赛博朋克风格标题 */}
      <div className="text-center mb-8 relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <div className="w-64 h-64 bg-cyan-500 rounded-full blur-[100px]" />
          <div className="w-64 h-64 bg-fuchsia-500 rounded-full blur-[100px] -ml-32" />
        </div>
        
        <div className="relative">
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              联机中心
            </span>
          </h1>
          <p className="text-slate-400 flex items-center justify-center gap-2">
            <Radio size={16} className="text-cyan-400 animate-pulse" />
            探索其他房东的基建世界
            <Radio size={16} className="text-fuchsia-400 animate-pulse" />
          </p>
        </div>
      </div>

      {/* 赛博朋克风格标签页 */}
      <div className="flex justify-center gap-2 mb-8">
        {[
          { id: 'users', icon: Users, label: '探索世界' },
          { id: 'settings', icon: Shield, label: '隐私设置' },
          { id: 'history', icon: History, label: '访问记录' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-cyan-500/30 hover:text-cyan-400'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="min-h-[400px]">
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <div className="inline-block p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
                  <Globe size={48} className="mx-auto mb-4 text-slate-500" />
                  <p className="text-slate-400">暂无其他房东开启联机功能</p>
                  <p className="text-sm text-slate-500 mt-2">成为第一个探索者吧！</p>
                </div>
              </div>
            ) : (
              users.map((user) => (
                <CyberpunkUserCard
                  key={user.userId}
                  user={user}
                  onVisit={() => visitUser(user.userId)}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Shield size={24} className="text-cyan-400" />
                隐私控制中心
              </h2>
              
              <div className="space-y-4">
                <CyberpunkToggle
                  checked={settings?.allowVisits ?? true}
                  onChange={(v) => updateSettings('allowVisits', v)}
                  label="允许其他用户参观我的基建"
                />
                <CyberpunkToggle
                  checked={settings?.allowInteractions ?? true}
                  onChange={(v) => updateSettings('allowInteractions', v)}
                  label="允许访客与我互动"
                />
                <CyberpunkToggle
                  checked={settings?.allowCharacterInteractions ?? true}
                  onChange={(v) => updateSettings('allowCharacterInteractions', v)}
                  label="允许访客与我的租客互动"
                />
              </div>

              <div className="mt-6 p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <p className="text-sm text-cyan-300 flex items-start gap-2">
                  <Eye size={16} className="mt-0.5 flex-shrink-0" />
                  注意：访客互动使用独立的变量系统，不会影响您的角色数据。
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <History size={20} className="text-fuchsia-400" />
                  最近访客记录
                </h2>
              </div>
              
              {visitHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History size={40} className="mx-auto mb-3 text-slate-600" />
                  <p className="text-slate-400">暂无访问记录</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {visitHistory.map((record) => (
                    <div key={record.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                          {record.visitorName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="text-white font-medium">{record.visitorName}</div>
                          <div className="text-sm text-slate-400">
                            {new Date(record.visitedAt).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-cyan-400">
                        <MessageCircle size={16} />
                        <span className="text-sm">访问了您的基建</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
