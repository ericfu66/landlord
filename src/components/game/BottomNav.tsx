'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/game', label: '首页', icon: '🏠' },
  { href: '/game/characters', label: '租客', icon: '👥' },
  { href: '/game/recruit', label: '招募', icon: '✨' },
  { href: '/game/building', label: '基建', icon: '🏢' },
  { href: '/game/work', label: '打工', icon: '💼' },
  { href: '/game/saves', label: '存档', icon: '💾' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-card flex items-center gap-1 px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/game' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/20 text-amber-300 shadow-lg shadow-amber-500/20'
                  : 'text-gray-400 hover:text-amber-100 hover:bg-white/10'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
