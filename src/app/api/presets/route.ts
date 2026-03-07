import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getPreset, savePreset } from '@/lib/services/preset-service'
import { InteractionMode, PresetEntry, PersonaPosition } from '@/types/preset'

const VALID_MODES: InteractionMode[] = ['daily', 'date', 'flirt', 'free']

function isInteractionMode(value: unknown): value is InteractionMode {
  return typeof value === 'string' && VALID_MODES.includes(value as InteractionMode)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const presetType = request.nextUrl.searchParams.get('presetType')
    if (!isInteractionMode(presetType)) {
      return NextResponse.json({ error: '无效的预设类型' }, { status: 400 })
    }

    const preset = await getPreset(session.userId, presetType)
    return NextResponse.json({
      entries: preset?.presetData?.entries || [],
      personaPosition: preset?.presetData?.personaPosition || 'after_worldview'
    })
  } catch (error) {
    console.error('Get preset error:', error)
    return NextResponse.json({ error: '获取预设失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { presetType, entries, personaPosition } = body as {
      presetType: unknown
      entries: PresetEntry[]
      personaPosition?: PersonaPosition
    }

    if (!isInteractionMode(presetType) || !Array.isArray(entries)) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 })
    }

    const normalizedEntries: PresetEntry[] = entries
      .filter((entry) => entry && !entry.isFixed)
      .map((entry, index) => ({
        id: entry.id,
        role: entry.role,
        content: (entry.content || '').trim(),
        order: index,
        isFixed: false,
        type: entry.type || 'custom'
      }))
      .filter((entry) => entry.content.length > 0)

    const position: PersonaPosition = personaPosition || 'after_worldview'
    const saved = await savePreset(session.userId, presetType, normalizedEntries, position)
    return NextResponse.json({ 
      success: true, 
      entries: normalizedEntries,
      personaPosition: saved.presetData.personaPosition 
    })
  } catch (error) {
    console.error('Save preset error:', error)
    return NextResponse.json({ error: '保存预设失败' }, { status: 500 })
  }
}
