import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  const session = await getSession()
  
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isGamePage = pathname.startsWith('/game')
  const isAdminPage = pathname.startsWith('/admin')
  const isApiAuth = pathname.startsWith('/api/auth')
  const isOnboardingPage = pathname.startsWith('/onboarding')
  const isLandingPage = pathname === '/'
  
  // 从 session 获取 onboarding 状态
  const needsOnboarding = session?.needsOnboarding ?? false
  
  // 如果需要onboarding，强制跳转到onboarding页面（除了onboarding和landing页面）
  if (session && needsOnboarding && !isOnboardingPage && !isLandingPage && !isApiAuth) {
    return NextResponse.redirect(new URL('/onboarding?step=character', request.url))
  }
  
  // 如果不需要onboarding，禁止访问onboarding页面
  if (session && !needsOnboarding && isOnboardingPage) {
    return NextResponse.redirect(new URL('/game', request.url))
  }
  
  if (!session && isGamePage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (!session && isAdminPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (session && isAdminPage && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/game', request.url))
  }
  
  if (session && isAuthPage && !isApiAuth && !needsOnboarding) {
    return NextResponse.redirect(new URL('/game', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/game/:path*',
    '/admin/:path*',
    '/login',
    '/register',
    '/onboarding/:path*',
    '/'
  ]
}