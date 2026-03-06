import { NextRequest, NextResponse } from 'next/server'

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/discord/callback'
const DISCORD_SCOPE = 'identify'

export async function GET(request: NextRequest) {
  // 验证 Discord OAuth 配置
  if (!DISCORD_CLIENT_ID) {
    console.error('[Discord OAuth] DISCORD_CLIENT_ID not configured')
    return NextResponse.redirect(
      new URL('/?error=oauth_not_configured', request.url)
    )
  }

  // 生成状态参数防止CSRF
  const state = Buffer.from(JSON.stringify({
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(7)
  })).toString('base64')

  // 构建Discord OAuth URL
  const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize')
  discordAuthUrl.searchParams.set('client_id', DISCORD_CLIENT_ID)
  discordAuthUrl.searchParams.set('redirect_uri', DISCORD_REDIRECT_URI)
  discordAuthUrl.searchParams.set('response_type', 'code')
  discordAuthUrl.searchParams.set('scope', DISCORD_SCOPE)
  discordAuthUrl.searchParams.set('state', state)

  // 创建响应并设置cookie
  const response = NextResponse.redirect(discordAuthUrl.toString())
  response.cookies.set('discord_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10分钟
    path: '/'
  })

  return response
}