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
  it('releases a delayed acquisition and permits another acquisition after cancellation', async () => {
    let grant, held = false
    const locks = { request: vi.fn(async (_, options, callback) => {
      await new Promise((resolve) => { grant = resolve })
      held = true
      try { return await callback({}) } finally { held = false }
    }) }
    const owner = createPrintingOwnership(locks)
    const acquiring = owner.acquire()
    const releasing = owner.release()
    const releasingAgain = owner.release()
    const reacquiring = owner.acquire()
    grant()
    await expect(acquiring).resolves.toBe(false)
    await Promise.all([releasing, releasingAgain])
    expect(held).toBe(false)
    expect(locks.request).toHaveBeenCalledTimes(2)
    grant()
    await expect(reacquiring).resolves.toBe(true)
    expect(held).toBe(true)
    await owner.release()
    expect(held).toBe(false)
  })
  it('shares a pending acquisition instead of requesting competing locks', async () => {
    let grant
    const locks = { request: vi.fn(async (_, options, callback) => {
      await new Promise((resolve) => { grant = resolve })
      return callback({})
    }) }
    const owner = createPrintingOwnership(locks)
    const first = owner.acquire(), second = owner.acquire()
    expect(locks.request).toHaveBeenCalledOnce()
    grant()
    await expect(Promise.all([first, second])).resolves.toEqual([true, true])
    await owner.release()
  })
  it('propagates rejection during pending release and permits retry after cleanup', async () => {
    let fail
    const locks = { request: vi.fn().mockImplementationOnce(() => new Promise((resolve, reject) => { fail = reject })) }
    const owner = createPrintingOwnership(locks)
    const acquiring = expect(owner.acquire()).rejects.toThrow('lock request failed')
    const releasing = expect(owner.release()).rejects.toThrow('lock request failed')
    fail(new Error('lock request failed'))
    await Promise.all([acquiring, releasing])
    locks.request.mockImplementationOnce(async (_, options, callback) => callback({}))
    await expect(owner.acquire()).resolves.toBe(true)
    await owner.release()
  })
})
