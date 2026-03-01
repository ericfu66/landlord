'use client'

import Link from 'next/link'

export default function GamePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="glass-card p-8 text-center">
        <h1 className="text-4xl font-bold mb-4 gradient-text">房东模拟器</h1>
        <p className="text-gray-300 mb-8">欢迎来到房东模拟器，开始你的房东生涯！</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/game/recruit" className="glass-card p-6 hover:bg-white/20 transition-colors">
            <div className="text-3xl mb-2">👥</div>
            <div className="font-medium">招募租客</div>
            <div className="text-sm text-gray-400 mt-1">AI生成角色</div>
          </Link>
          
          <Link href="/game/building" className="glass-card p-6 hover:bg-white/20 transition-colors">
            <div className="text-3xl mb-2">🏢</div>
            <div className="font-medium">基建管理</div>
            <div className="text-sm text-gray-400 mt-1">建造房间</div>
          </Link>
          
          <Link href="/game/work" className="glass-card p-6 hover:bg-white/20 transition-colors">
            <div className="text-3xl mb-2">💼</div>
            <div className="font-medium">打工赚钱</div>
            <div className="text-sm text-gray-400 mt-1">获取收入</div>
          </Link>
          
          <Link href="/game/saves" className="glass-card p-6 hover:bg-white/20 transition-colors">
            <div className="text-3xl mb-2">💾</div>
            <div className="font-medium">存档管理</div>
            <div className="text-sm text-gray-400 mt-1">保存进度</div>
          </Link>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4">📊 当前状态</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">货币</span>
              <span className="font-medium">💰 1,000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">体力</span>
              <span className="font-medium">⚡ 3/3</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">租客</span>
              <span className="font-medium">👥 0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">楼层</span>
              <span className="font-medium">🏢 1</span>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4">📋 待办事项</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-gray-300">
              <span>→</span>
              <span>配置AI API设置</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <span>→</span>
              <span>招募第一位租客</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <span>→</span>
              <span>建造或装修房间</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}