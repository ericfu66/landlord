'use client'

interface VariableDisplayProps {
  favorability: number
  obedience: number
  corruption: number
  mood: string
  updating?: boolean
}

export default function VariableDisplay({
  favorability,
  obedience,
  corruption,
  mood,
  updating = false
}: VariableDisplayProps) {
  const getBarColor = (value: number, type: 'fav' | 'obey' | 'corrupt') => {
    if (type === 'fav') {
      return value >= 50 ? 'bg-pink-500' : value >= 0 ? 'bg-blue-500' : 'bg-red-500'
    }
    if (type === 'obey') {
      return value >= 0 ? 'bg-green-500' : 'bg-red-500'
    }
    return value >= 0 ? 'bg-purple-500' : 'bg-gray-500'
  }

  const getValueLabel = (value: number) => {
    if (value >= 80) return '极高'
    if (value >= 50) return '高'
    if (value >= 20) return '中等'
    if (value >= 0) return '低'
    if (value >= -50) return '负面'
    return '极低'
  }

  return (
    <div className={`glass-card p-4 ${updating ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">角色状态</h3>
        {updating && (
          <span className="text-xs text-yellow-400 animate-pulse">变量更新中...</span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-pink-400">❤️ 好感度</span>
            <span>{favorability} ({getValueLabel(favorability)})</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getBarColor(favorability, 'fav')} transition-all duration-300`}
              style={{ width: `${Math.abs(favorability)}%`, marginLeft: favorability < 0 ? 'auto' : 0 }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-green-400">🕊️ 顺从度</span>
            <span>{obedience} ({getValueLabel(obedience)})</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getBarColor(obedience, 'obey')} transition-all duration-300`}
              style={{ width: `${Math.abs(obedience)}%`, marginLeft: obedience < 0 ? 'auto' : 0 }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-purple-400">💜 堕落度</span>
            <span>{corruption} ({getValueLabel(corruption)})</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getBarColor(corruption, 'corrupt')} transition-all duration-300`}
              style={{ width: `${Math.abs(corruption)}%`, marginLeft: corruption < 0 ? 'auto' : 0 }}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">心情：</span>
            <span className="text-gray-200">{mood}</span>
          </div>
        </div>
      </div>
    </div>
  )
}