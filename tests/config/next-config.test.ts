import { describe, expect, it } from 'vitest'

describe('next config', () => {
  it('treats sql.js as a server external package', async () => {
    const configModule = await import('../../next.config.js')
    const nextConfig = configModule.default ?? configModule
    const serverExternalPackages = nextConfig.experimental?.serverComponentsExternalPackages ?? []

    expect(serverExternalPackages).toContain('sql.js')
  })
})
