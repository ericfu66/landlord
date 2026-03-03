'use client'

import { Suspense } from 'react'
import OnboardingContent from './OnboardingContent'

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-amber-400">加载中...</div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}