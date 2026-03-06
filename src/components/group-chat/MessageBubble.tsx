import React from 'react'
import { GroupChatMessage } from '@/types/group-chat'

interface MessageBubbleProps {
  message: GroupChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isPlayer = message.senderType === 'player'
  const isSystem = message.senderType === 'system'
  
  // 根据消息类型选择样式
  const getBubbleStyle = () => {
    if (isSystem) {
      return 'bg-slate-700/50 border-slate-600 mx-12 text-center'
    }
    if (isPlayer) {
      return 'bg-amber-500/20 border-amber-500/40 ml-8'
    }
    
    // 根据消息类型调整角色消息样式
    switch (message.messageType) {
      case 'transfer':
        return 'bg-green-500/20 border-green-500/40 mr-8'
      case 'sticker':
        return 'bg-pink-500/20 border-pink-500/40 mr-8'
      case 'summary':
        return 'bg-blue-500/20 border-blue-500/40 mx-8'
      default:
        return 'bg-slate-800/70 border-slate-700 mr-8'
    }
  }

  // 渲染消息内容
  const renderContent = () => {
    switch (message.messageType) {
      case 'transfer':
        return (
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-lg">💰</span>
            <div>
              <div className="text-green-300 font-medium">
                转账 {message.transferAmount} 金币
              </div>
              <div className="text-xs text-green-200/70">
                {message.content.replace('[转账] ', '')}
              </div>
            </div>
          </div>
        )
      
      case 'sticker':
        return (
          <div className="flex items-center gap-2">
            {message.stickerUrl ? (
              <img 
                src={message.stickerUrl} 
                alt={message.stickerEmotion || '表情包'}
                className="w-20 h-20 object-cover rounded-lg"
                loading="lazy"
              />
            ) : (
              <span className="text-2xl">
                {getStickerEmoji(message.stickerEmotion)}
              </span>
            )}
            <span className="text-pink-200 text-sm">
              {message.stickerEmotion || '表情包'}
            </span>
          </div>
        )
      
      case 'summary':
        return (
          <div className="text-xs text-blue-200">
            <div className="font-medium mb-1">📋 话题总结</div>
            {message.content}
          </div>
        )
      
      default:
        return <div className="text-sm text-white break-words">{message.content}</div>
    }
  }

  // 获取发送者显示名称
  const getSenderName = () => {
    if (isPlayer) return '房东'
    if (isSystem) return '系统'
    return message.senderName
  }

  // 获取发送者名称颜色
  const getSenderColor = () => {
    if (isPlayer) return 'text-amber-400'
    if (isSystem) return 'text-slate-400'
    
    switch (message.messageType) {
      case 'transfer':
        return 'text-green-400'
      case 'sticker':
        return 'text-pink-400'
      case 'summary':
        return 'text-blue-400'
      default:
        return 'text-slate-400'
    }
  }

  return (
    <div className={`rounded-xl border px-3 py-2 ${getBubbleStyle()}`}>
      <div className={`text-xs mb-1 ${getSenderColor()}`}>{getSenderName()}</div>
      {renderContent()}
    </div>
  )
}

/**
 * 根据情绪获取表情符号（作为图片加载失败时的fallback）
 */
function getStickerEmoji(emotion?: string): string {
  if (!emotion) return '😊'
  
  const emojiMap: Record<string, string> = {
    '开心': '😄',
    '高兴': '😄',
    '快乐': '😆',
    '生气': '😠',
    '愤怒': '😡',
    '尴尬': '😅',
    '无语': '😑',
    '惊讶': '😲',
    '震惊': '😱',
    '害羞': '😳',
    '难过': '😢',
    '伤心': '😭',
    '困惑': '😕',
    '思考': '🤔',
    '调皮': '😏',
    '爱心': '😍',
    '点赞': '👍',
    '加油': '💪',
    'OK': '👌',
    '晚安': '😴',
    '再见': '👋',
    '谢谢': '🙏',
    '抱歉': '🙇',
    '委屈': '🥺',
    '酷': '😎',
    '哭': '😭',
    '笑': '😂',
    '晕': '😵',
    '害怕': '😨',
    '恶心': '🤢'
  }
  
  return emojiMap[emotion] || '😊'
}
