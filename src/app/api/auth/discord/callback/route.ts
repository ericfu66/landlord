import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb, safeInt, safeSqlString } from '@/lib/db'
import { createSession } from '@/lib/auth/session'

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1461367865608376400'
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || 'wQBUA7k0w6ULeSqTGR4gCLcnCxykUEu9'
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/discord/callback'

interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  email: string | null
}

async function exchangeCodeForToken(code: string): Promise<{ access_token: string; token_type: string }> {
  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: DISCORD_REDIRECT_URI,
    }),
  })

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    throw new Error(`Failed to exchange code for token: ${error}`)
  }

  return tokenResponse.json()
}

async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const userResponse = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!userResponse.ok) {
    throw new Error('Failed to fetch Discord user')
  }

  return userResponse.json()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // 检查是否有错误
    if (error) {
      console.error('Discord OAuth error:', error)
      return NextResponse.redirect(new URL('/?error=discord_auth_failed', request.url))
    }

    // 验证state参数
    const storedState = request.cookies.get('discord_oauth_state')?.value
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(new URL('/?error=invalid_state', request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/?error=no_code', request.url))
    }

    // 交换code获取token
    const tokenData = await exchangeCodeForToken(code)
    
    // 获取Discord用户信息
    const discordUser = await fetchDiscordUser(tokenData.access_token)

    const db = await getDb()

    // 检查是否已存在该Discord用户
    const safeDiscordId = safeSqlString(discordUser.id)
    const existingUser = db.exec(`
      SELECT id, username, role, is_banned, needs_onboarding, onboarding_step
      FROM users 
      WHERE discord_id = '${safeDiscordId}'
    `)

    let userId: number
    let needsOnboarding: boolean
    let onboardingStep: string

    if (existingUser && existingUser.length > 0 && existingUser[0].values?.length > 0) {
      // 用户已存在，更新信息
      const row = existingUser[0].values[0]
      userId = row[0] as number
      needsOnboarding = row[4] === 1
      onboardingStep = row[5] as string

      // 更新Discord信息
      const safeUserId = safeInt(userId)
      db.run(`
        UPDATE users 
        SET discord_username = '${safeSqlString(discordUser.username)}',
            discord_avatar = '${safeSqlString(discordUser.avatar || '')}',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${safeUserId}
      `)
    } else {
      // 创建新用户
      const username = `discord_${discordUser.username}_${discordUser.discriminator}`
      
      db.run(`
        INSERT INTO users (
          username, 
          discord_id, 
          discord_username, 
          discord_avatar,
          role,
          needs_onboarding,
          onboarding_step
        ) VALUES (
          '${safeSqlString(username)}',
          '${safeDiscordId}',
          '${safeSqlString(discordUser.username)}',
          '${safeSqlString(discordUser.avatar || '')}',
          'user',
          TRUE,
          'character'
        )
      `)

      // 获取新创建的用户ID
      const newUser = db.exec(`
        SELECT id, needs_onboarding, onboarding_step 
        FROM users 
        WHERE discord_id = '${safeDiscordId}'
      `)
      
      if (!newUser || !newUser[0].values || newUser[0].values.length === 0) {
        throw new Error('Failed to create user')
      }

      userId = newUser[0].values[0][0] as number
      needsOnboarding = true
      onboardingStep = 'character'
    }

    saveDb()

    // 创建session（包含onboarding状态）
    const sessionToken = await createSession(userId, needsOnboarding)

    // 构建重定向URL
    let redirectUrl: string
    if (needsOnboarding) {
      redirectUrl = `/onboarding?step=${onboardingStep}`
    } else {
      redirectUrl = '/game'
    }

    // 创建响应并设置session cookie
    const response = NextResponse.redirect(new URL(redirectUrl, request.url))
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/'
    })

    // 清除state cookie
    response.cookies.delete('discord_oauth_state')

    return response

  } catch (error) {
    console.error('Discord callback error:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }
}