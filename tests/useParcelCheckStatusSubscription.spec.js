// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const parcelChecksStoreMock = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn()
}))

vi.mock('@/stores/parcel.checks.store.js', () => ({
  useParcelChecksStore: () => parcelChecksStoreMock
}))

import { useParcelCheckStatusSubscription } from '@/composables/useParcelCheckStatusSubscription.js'

describe('useParcelCheckStatusSubscription', () => {
  let wrapper = null
  let returnedStore = null

  function mountComposable(options) {
    const TestComponent = defineComponent({
      setup() {
        returnedStore = useParcelCheckStatusSubscription(options)
        return () => null
      }
    })

    wrapper = mount(TestComponent)
    return returnedStore
  }

  beforeEach(() => {
    parcelChecksStoreMock.start.mockReset().mockResolvedValue(true)
    parcelChecksStoreMock.stop.mockReset().mockResolvedValue(true)
    wrapper = null
    returnedStore = null
  })

  afterEach(async () => {
    wrapper?.unmount()
    wrapper = null
    await flushPromises()
  })

  it('starts immediately with normalized ref values and forwards callbacks', async () => {
    const refresh = vi.fn().mockResolvedValue()
    const onUpdates = vi.fn()

    const result = mountComposable({
      registerId: ref('7'),
      enabled: ref(1),
      refresh,
      onUpdates
    })
    await flushPromises()

    expect(result).toBe(parcelChecksStoreMock)
    expect(parcelChecksStoreMock.start).toHaveBeenCalledTimes(1)
    expect(parcelChecksStoreMock.start).toHaveBeenCalledWith(7, {
      onUpdates,
      onResync: expect.any(Function)
    })
    expect(parcelChecksStoreMock.stop).not.toHaveBeenCalled()

    await parcelChecksStoreMock.start.mock.calls[0][1].onResync()

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('resolves getter inputs and supports the default optional callbacks', async () => {
    const registerId = ref('8')
    const enabled = ref(true)

    mountComposable({
      registerId: () => registerId.value,
      enabled: () => enabled.value
    })
    await flushPromises()

    const options = parcelChecksStoreMock.start.mock.calls[0][1]
    expect(parcelChecksStoreMock.start).toHaveBeenCalledWith(8, {
      onUpdates: null,
      onResync: expect.any(Function)
    })
    await expect(options.onResync()).resolves.toBeUndefined()
  })

  it.each([
    ['the subscription is disabled', 7, false],
    ['the register id is not an integer', '7.5', true],
    ['the register id is not positive', 0, true]
  ])('stops instead of starting when %s', async (_case, registerId, enabled) => {
    mountComposable({ registerId, enabled })
    await flushPromises()

    expect(parcelChecksStoreMock.stop).toHaveBeenCalledTimes(1)
    expect(parcelChecksStoreMock.start).not.toHaveBeenCalled()
  })

  it('tracks reactive changes and ignores resync callbacks from stale subscriptions', async () => {
    const registerId = ref(7)
    const enabled = ref(true)
    const refresh = vi.fn().mockResolvedValue()

    mountComposable({ registerId, enabled, refresh })
    await flushPromises()
    const firstResync = parcelChecksStoreMock.start.mock.calls[0][1].onResync

    registerId.value = 8
    await nextTick()
    await flushPromises()
    const secondResync = parcelChecksStoreMock.start.mock.calls[1][1].onResync

    await firstResync()
    expect(refresh).not.toHaveBeenCalled()

    await secondResync()
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(parcelChecksStoreMock.start).toHaveBeenNthCalledWith(2, 8, expect.any(Object))

    enabled.value = false
    await nextTick()
    await flushPromises()

    expect(parcelChecksStoreMock.stop).toHaveBeenCalledTimes(1)

    registerId.value = 9
    await nextTick()
    await flushPromises()
    expect(parcelChecksStoreMock.stop).toHaveBeenCalledTimes(2)

    enabled.value = true
    await nextTick()
    await flushPromises()

    expect(parcelChecksStoreMock.start).toHaveBeenNthCalledWith(3, 9, expect.any(Object))
  })

  it('invalidates pending work, stops watching, and absorbs stop failures on unmount', async () => {
    let finishStart
    parcelChecksStoreMock.start.mockReturnValueOnce(new Promise(resolve => { finishStart = resolve }))
    parcelChecksStoreMock.stop.mockRejectedValueOnce(new Error('stop failed'))
    const registerId = ref(7)
    const refresh = vi.fn().mockResolvedValue()

    mountComposable({ registerId, enabled: true, refresh })
    const staleResync = parcelChecksStoreMock.start.mock.calls[0][1].onResync

    wrapper.unmount()
    wrapper = null
    await flushPromises()

    expect(parcelChecksStoreMock.stop).toHaveBeenCalledTimes(1)

    registerId.value = 8
    await nextTick()
    await flushPromises()
    expect(parcelChecksStoreMock.start).toHaveBeenCalledTimes(1)

    finishStart(true)
    await flushPromises()
    await staleResync()
    expect(refresh).not.toHaveBeenCalled()
  })
})
