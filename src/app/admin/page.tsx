'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-purple-600 rounded-lg"
          >
            返回登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">管理员面板</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
          >
            退出登录
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-purple-400">{stats.totalUsers}</div>
              <div className="text-sm text-gray-400 mt-1">总用户数</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-green-400">{stats.activeUsers}</div>
              <div className="text-sm text-gray-400 mt-1">活跃用户</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-red-400">{stats.bannedUsers}</div>
              <div className="text-sm text-gray-400 mt-1">封禁用户</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">{stats.totalApiCalls}</div>
              <div className="text-sm text-gray-400 mt-1">API调用次数</div>
            </div>
          </div>
        )}

        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-white mb-4">用户列表</h2>
          
          <div className="overflow-x-auto">
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
                          className={`px-3 py-1 rounded text-xs ${
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
        </div>
      </div>
    </div>
  )
}