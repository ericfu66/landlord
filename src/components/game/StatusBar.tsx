'use client'

interface StatusBarProps {
  currency: number
  energy: number
  time?: string
  weather?: string
}

export default function StatusBar({
  currency = 1000,
  energy = 3,
  time = '08:00',
  weather = '晴'
}: StatusBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40">
      <div className="glass-card mx-4 mt-4 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">☀️</span>
              <span className="text-sm text-gray-200">{time}</span>
              <span className="text-xs text-gray-500">{weather}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">💰</span>
              <span className="font-semibold text-amber-300">{currency.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-amber-400">⚡</span>
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-4 rounded-sm transition-all duration-300 ${
                      i < energy
                        ? 'bg-gradient-to-t from-amber-500 to-amber-300 shadow-lg shadow-amber-500/50'
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
