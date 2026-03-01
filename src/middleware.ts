import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  const session = await getSession()
  
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isGamePage = pathname.startsWith('/game')
  const isAdminPage = pathname.startsWith('/admin')
  const isApiAuth = pathname.startsWith('/api/auth')
  
  if (!session && isGamePage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (!session && isAdminPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (session && isAdminPage && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/game', request.url))
  }
  
  if (session && isAuthPage && !isApiAuth) {
    return NextResponse.redirect(new URL('/game', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/game/:path*',
    '/admin/:path*',
    '/login',
    '/register'
  ]
}