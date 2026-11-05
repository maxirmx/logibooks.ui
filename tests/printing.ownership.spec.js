// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it, vi } from 'vitest'
import { createPrintingOwnership } from '@/services/printing.ownership.js'
describe('automatic printing ownership', () => {
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
})
