import { describe, expect, it } from 'vitest'

describe('next config', () => {
  it('treats sql.js as a server external package', async () => {
    const configModule = await import('../../next.config.js')
    const nextConfig = configModule.default ?? configModule
    // Next.js 15: serverExternalPackages 已从 experimental 移至顶层
    const serverExternalPackages = nextConfig.serverExternalPackages ?? []

    expect(serverExternalPackages).toContain('sql.js')
  })
})
