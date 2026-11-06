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
const alertError = vi.hoisted(() => vi.fn())

vi.mock('@/stores/parcel.checks.store.js', () => ({
  useParcelChecksStore: () => parcelChecksStoreMock
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ error: alertError })
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
    alertError.mockReset()
    wrapper = null
    returnedStore = null
  })

  afterEach(async () => {
    wrapper?.unmount()
    wrapper = null
    await flushPromises()
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
      onError: expect.any(Function),
      onResync: expect.any(Function)
    })
    await expect(options.onResync()).resolves.toBeUndefined()
  })

  it('invalidates pending work, stops watching, and absorbs stop failures on unmount', async () => {
    let finishStart
    const stopError = new Error('stop failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    parcelChecksStoreMock.start.mockReturnValueOnce(
      new Promise((resolve) => {
        finishStart = resolve
      })
    )
    parcelChecksStoreMock.stop.mockRejectedValueOnce(stopError)
    const registerId = ref(7)
    const refresh = vi.fn().mockResolvedValue()

    mountComposable({ registerId, enabled: true, refresh })
    const staleResync = parcelChecksStoreMock.start.mock.calls[0][1].onResync

    wrapper.unmount()
    wrapper = null
    await flushPromises()

    expect(parcelChecksStoreMock.stop).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalledWith('[parcel check subscription cleanup]', stopError)

    registerId.value = 8
    await nextTick()
    await flushPromises()
    expect(parcelChecksStoreMock.start).toHaveBeenCalledTimes(1)

    finishStart(true)
    await flushPromises()
    await staleResync()
    expect(refresh).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('publishes an observable error when the initial subscription fails', async () => {
    const failure = new Error('offline')
    parcelChecksStoreMock.start.mockRejectedValueOnce(failure)

    mountComposable({ registerId: 7, enabled: true })
    await flushPromises()

    expect(alertError).toHaveBeenCalledWith(failure, {
      fallback: 'Не удалось обновить статусы проверок посылок'
    })
  })
})
