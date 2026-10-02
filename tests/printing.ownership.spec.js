import { describe, expect, it, vi } from 'vitest'
import { createPrintingOwnership } from '@/services/printing.ownership.js'
describe('automatic printing ownership', () => {
  it('allows only one owner, reuses ownership and releases atomically', async () => {
    let held = false
    const locks = { request: vi.fn(async (_, options, callback) => {
      expect(options).toEqual({ ifAvailable: true })
      if (held) return callback(null)
      held = true
      try { return await callback({}) } finally { held = false }
    }) }
    const a = createPrintingOwnership(locks), b = createPrintingOwnership(locks)
    expect(await a.acquire()).toBe(true)
    expect(await a.acquire()).toBe(true)
    expect(await b.acquire()).toBe(false)
    await a.release()
    expect(await b.acquire()).toBe(true)
    await b.release()
    await a.release()
  })
  it('propagates unsupported and failed lock acquisition/cleanup', async () => {
    await expect(createPrintingOwnership(null).acquire()).rejects.toMatchObject({ code: 'OwnershipUnavailable' })
    const failed = createPrintingOwnership({ request: () => Promise.reject(new Error('locks')) })
    await expect(failed.acquire()).rejects.toThrow('locks')
    await expect(failed.release()).rejects.toThrow('locks')
  })
})
