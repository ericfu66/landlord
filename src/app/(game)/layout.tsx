'use client'

import { ReactNode } from 'react'
import BottomNav from '@/components/game/BottomNav'
import StatusBar from '@/components/game/StatusBar'
import Link from 'next/link'

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `url(${process.env.NEXT_PUBLIC_DEFAULT_BG_URL || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      <div className="relative z-10">
        <StatusBar currency={1000} energy={3} />
        
        <main className="pt-24 pb-32 px-4 min-h-screen">
          {children}
        </main>
        
        <div className="fixed top-4 right-4 z-50">
          <Link
            href="/game/settings"
            className="glass-card px-4 py-2 text-sm hover:bg-amber-500/20 transition-all duration-300 group"
          >
            <span className="group-hover:rotate-90 transition-transform duration-300 inline-block">⚙️</span>
            <span className="ml-1">设置</span>
          </Link>
        </div>
        
        <BottomNav />
      </div>
    </div>
  )
}