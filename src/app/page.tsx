'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Gamepad2, Save, Settings, LogIn, UserPlus, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const menuItems = [
    { id: 'start', label: '开始游戏', sublabel: 'NEW GAME', icon: Gamepad2, href: '/login' },
    { id: 'load', label: '载入进度', sublabel: 'LOAD GAME', icon: Save, href: '/login' },
    { id: 'settings', label: '系统设置', sublabel: 'CONFIG', icon: Settings, href: '/settings' },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.8,
        ease: [0.215, 0.61, 0.355, 1],
      },
    },
  }

  const titleVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 1,
        ease: [0.215, 0.61, 0.355, 1],
      },
    },
  }

  if (!mounted) return null

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a12]">
      {/* 背景图层 */}
      <div className="absolute inset-0">
        {/* 主背景图 */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2568&auto=format&fit=crop')`,
          }}
        />
        {/* 暗角效果 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40" />
        {/* 雾气效果 */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-amber-900/20 to-transparent animate-pulse" 
               style={{ animationDuration: '4s' }} />
        </div>
        {/* 窗户灯光效果 */}
        <div className="absolute top-[30%] left-[20%] w-16 h-24 bg-amber-500/20 blur-xl animate-pulse" 
             style={{ animationDuration: '3s' }} />
        <div className="absolute top-[35%] left-[35%] w-12 h-20 bg-amber-400/15 blur-lg animate-pulse" 
             style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
        <div className="absolute top-[25%] right-[30%] w-20 h-32 bg-amber-500/10 blur-2xl animate-pulse" 
             style={{ animationDuration: '5s', animationDelay: '1s' }} />
      </div>

      {/* 粒子效果 */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-400/40 rounded-full"
            initial={{ 
              x: Math.random() * 100 + '%', 
              y: '100%',
              opacity: 0 
            }}
            animate={{ 
              y: '-10%',
              opacity: [0, 1, 0],
            }}
            transition={{ 
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'linear'
            }}
          />
        ))}
      </div>

      {/* 主内容 */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-12">
        {/* 左上角 Logo 区域 */}
        <motion.div 
          className="flex flex-col pt-safe"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Logo */}
          <motion.div variants={titleVariants} className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="relative">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" />
              <div className="absolute inset-0 w-6 h-6 sm:w-8 sm:h-8 bg-amber-400/30 blur-lg" />
            </div>
            <span className="text-amber-500/60 text-xs sm:text-sm font-medium tracking-widest">
              Ver. 0.1.0
            </span>
          </motion.div>

          {/* 主标题 - 响应式字体大小 */}
          <motion.h1 
            variants={titleVariants}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-1"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            Landlord
          </motion.h1>
          <motion.h2 
            variants={titleVariants}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-amber-400 mb-3 sm:mb-4"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            Simulator
          </motion.h2>

          {/* 副标题 */}
          <motion.div variants={titleVariants} className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 sm:w-12 h-px bg-gradient-to-r from-amber-500/60 to-transparent" />
            <p className="text-amber-200/70 text-sm sm:text-base md:text-lg tracking-wide" style={{ fontFamily: 'Noto Serif SC, serif' }}>
              AI驱动的房东模拟器
            </p>
          </motion.div>
        </motion.div>

        {/* 右下角菜单 - 移动端移到下方居中 */}
        <motion.div 
          className="absolute bottom-20 sm:bottom-12 right-4 sm:right-8 md:right-16 
                     flex flex-col items-end gap-2 sm:gap-3
                     w-auto max-w-[calc(100%-2rem)]"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Discord 登录按钮 */}
          <motion.a
            href="/api/auth/discord"
            variants={itemVariants}
            className="group flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 mb-4 sm:mb-6 
                       bg-[#5865F2]/20 hover:bg-[#5865F2]/30 
                       border border-[#5865F2]/50 rounded-xl transition-all duration-300"
            whileHover={{ x: -5 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span className="text-white/90 font-medium text-sm sm:text-base">使用 Discord 登录</span>
          </motion.a>

          {menuItems.map((item, index) => (
            <motion.a
              key={item.id}
              href={item.href}
              variants={itemVariants}
              className="group relative flex items-center justify-end gap-2 sm:gap-4"
              onMouseEnter={() => setHoveredButton(item.id)}
              onMouseLeave={() => setHoveredButton(null)}
              whileHover={{ x: -10 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* 按钮背景 */}
              <div 
                className={`absolute inset-0 bg-gradient-to-l from-black/80 via-black/50 to-transparent 
                           transition-all duration-500 rounded-lg ${
                             hoveredButton === item.id ? 'opacity-100' : 'opacity-60'
                           }`}
                style={{
                  width: hoveredButton === item.id ? '120%' : '100%',
                }}
              />
              
              {/* 装饰线条 */}
              <div 
                className={`h-px bg-gradient-to-r from-transparent to-amber-500/60 transition-all duration-500 ${
                  hoveredButton === item.id ? 'w-8 sm:w-16 opacity-100' : 'w-4 sm:w-8 opacity-40'
                }`}
              />
              
              {/* 按钮内容 */}
              <div className="relative flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4">
                <div className="text-right">
                  <div 
                    className={`text-lg sm:text-2xl font-bold transition-colors duration-300 ${
                      hoveredButton === item.id ? 'text-amber-400' : 'text-white/90'
                    }`}
                    style={{ fontFamily: 'Noto Serif SC, serif' }}
                  >
                    {item.label}
                  </div>
                  <div className="text-[10px] sm:text-xs text-amber-500/50 tracking-widest font-medium">
                    {item.sublabel}
                  </div>
                </div>
                
                {/* 箭头图标 */}
                <motion.div
                  animate={{ 
                    x: hoveredButton === item.id ? 5 : 0,
                    opacity: hoveredButton === item.id ? 1 : 0.5,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400/80" />
                </motion.div>
              </div>
            </motion.a>
          ))}

          {/* 传统登录入口 */}
          <motion.div variants={itemVariants} className="mt-3 sm:mt-4 flex items-center gap-2 sm:gap-4">
            <a 
              href="/login" 
              className="text-amber-500/60 hover:text-amber-400 text-xs sm:text-sm transition-colors flex items-center gap-1"
            >
              <LogIn className="w-3 h-3 sm:w-4 sm:h-4" />
              账号登录
            </a>
            <span className="text-amber-500/30">|</span>
            <a 
              href="/register" 
              className="text-amber-500/60 hover:text-amber-400 text-xs sm:text-sm transition-colors flex items-center gap-1"
            >
              <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
              注册
            </a>
          </motion.div>
        </motion.div>

        {/* 底部版权信息 */}
        <motion.div 
          className="absolute bottom-2 sm:bottom-4 left-4 sm:left-8 text-white/20 text-[10px] sm:text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
        >
          Powered by AI · 房东模拟器 2026
        </motion.div>

        {/* 右上角装饰 */}
        <motion.div 
          className="absolute top-4 sm:top-8 right-4 sm:right-8 flex flex-col items-end gap-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-transparent border border-amber-500/30 
                          flex items-center justify-center backdrop-blur-sm">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-amber-400 rounded-full animate-pulse" />
          </div>
        </motion.div>
      </div>

      {/* 全局样式 */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
