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
  // Compact weather display for mobile
  const weatherEmoji: Record<string, string> = {
    '晴': '☀️',
    '多云': '⛅',
    '阴': '☁️',
    '雨': '🌧️',
    '雪': '❄️',
    '雾': '🌫️',
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-40 safe-area-inset-top">
      <div className="glass-card mx-2 sm:mx-4 mt-2 sm:mt-4 px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          {/* Left: Time & Weather */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-amber-400 text-sm sm:text-base">
                {weatherEmoji[weather] || '☀️'}
              </span>
              <span className="text-sm sm:text-base text-gray-200 font-medium">{time}</span>
              {/* Weather text hidden on smallest screens */}
              <span className="hidden sm:inline text-xs text-gray-500">{weather}</span>
            </div>
          </div>

          {/* Right: Currency & Energy */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Currency */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-amber-400">💰</span>
              <span className="font-semibold text-amber-300 text-sm sm:text-base">
                {currency.toLocaleString()}
              </span>
            </div>

            {/* Energy - Compact for mobile */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-amber-400">⚡</span>
              {/* Mobile: Show number only */}
              <span className="sm:hidden font-semibold text-amber-300 text-sm">
                {energy}/3
              </span>
              {/* Desktop: Show bars */}
              <div className="hidden sm:flex gap-1">
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
