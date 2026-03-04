'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Users, LogOut, AlertCircle } from 'lucide-react'

interface User {
  id: number
  username: string
  role: string
  isBanned: boolean
  apiCallsCount: number
  createdAt: string
}

interface Stats {
  totalUsers: number
  totalApiCalls: number
  activeUsers: number
  bannedUsers: number
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError('')

    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats')
      ])

      if (usersRes.status === 401 || usersRes.status === 403) {
        setError('无权限访问')
        return
      }

      const usersData = await usersRes.json()
      const statsData = await statsRes.json()

      setUsers(usersData.users || [])
      setStats(statsData.stats || null)
    } catch (err) {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleBan = async (userId: number, isBanned: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isBanned ? 'unban' : 'ban',
          userId
        })
      })

      const data = await res.json()

      if (res.ok) {
        setUsers(users.map((u) => 
          u.id === userId ? { ...u, isBanned: !isBanned } : u
        ))
      } else {
        alert(data.error || '操作失败')
      }
    } catch (err) {
      alert('操作失败')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-white flex items-center gap-2">
          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          加载中...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <div className="text-red-400 mb-4 text-sm sm:text-base">{error}</div>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-purple-600 rounded-lg text-sm touch-target"
          >
            返回登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">管理员面板</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm touch-target self-start sm:self-auto"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
            <div className="glass-card p-3 sm:p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-purple-400">{stats.totalUsers}</div>
              <div className="text-xs sm:text-sm text-gray-400 mt-1">总用户数</div>
            </div>
            <div className="glass-card p-3 sm:p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-400">{stats.activeUsers}</div>
              <div className="text-xs sm:text-sm text-gray-400 mt-1">活跃用户</div>
            </div>
            <div className="glass-card p-3 sm:p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-red-400">{stats.bannedUsers}</div>
              <div className="text-xs sm:text-sm text-gray-400 mt-1">封禁用户</div>
            </div>
            <div className="glass-card p-3 sm:p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-400">{stats.totalApiCalls}</div>
              <div className="text-xs sm:text-sm text-gray-400 mt-1">API调用次数</div>
            </div>
          </div>
        )}

        <div className="glass-card p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">用户列表</h2>
          </div>
          
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-gray-400 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">用户名</th>
                  <th className="px-4 py-3">角色</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">API调用</th>
                  <th className="px-4 py-3">注册时间</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3">{user.id}</td>
                    <td className="px-4 py-3 font-medium">{user.username}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.isBanned ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                      }`}>
                        {user.isBanned ? '已封禁' : '正常'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{user.apiCallsCount}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleBan(user.id, user.isBanned)}
                          className={`px-3 py-1 rounded text-xs touch-target-sm ${
                            user.isBanned
                              ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                              : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                          }`}
                        >
                          {user.isBanned ? '解封' : '封禁'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {users.map((user) => (
              <div key={user.id} className="bg-white/5 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white text-sm truncate">{user.username}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        user.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <span className={`px-1.5 py-0.5 rounded ${
                        user.isBanned ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                      }`}>
                        {user.isBanned ? '已封禁' : '正常'}
                      </span>
                      <span>API: {user.apiCallsCount}</span>
                      <span>{new Date(user.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => handleBan(user.id, user.isBanned)}
                      className={`px-2.5 py-1.5 rounded text-xs touch-target-sm ${
                        user.isBanned
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {user.isBanned ? '解封' : '封禁'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
