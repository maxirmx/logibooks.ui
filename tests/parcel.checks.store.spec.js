// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useParcelChecksStore } from '@/stores/parcel.checks.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'

const signalRState = vi.hoisted(() => ({
  connections: [],
  withUrl: vi.fn(),
  withAutomaticReconnect: vi.fn(),
  nextStartError: null
}))

vi.mock('@microsoft/signalr', () => {
  class HubConnectionBuilder {
    withUrl(...args) {
      signalRState.withUrl(...args)
      return this
    }

    withAutomaticReconnect(...args) {
      signalRState.withAutomaticReconnect(...args)
      return this
    }

    build() {
      const connection = {
        state: 'Disconnected',
        handlers: {},
        start: vi.fn(async () => {
          if (signalRState.nextStartError) {
            const error = signalRState.nextStartError
            signalRState.nextStartError = null
            throw error
          }
          connection.state = 'Connected'
        }),
        invoke: vi.fn(async () => {}),
        stop: vi.fn(async () => { connection.state = 'Disconnected' }),
        on: vi.fn((name, handler) => { connection.handlers[name] = handler }),
        onclose: vi.fn(handler => { connection.handlers.onclose = handler }),
        onreconnected: vi.fn(handler => { connection.handlers.onreconnected = handler })
      }
      signalRState.connections.push(connection)
      return connection
    }
  }

  return {
    HubConnectionBuilder,
    HubConnectionState: { Connected: 'Connected' }
  }
})

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

const authStore = { user: { token: 'jwt-token' } }
vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

describe('parcel checks subscription store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    signalRState.connections.length = 0
    signalRState.withUrl.mockClear()
    signalRState.withAutomaticReconnect.mockClear()
    signalRState.nextStartError = null
  })

  it('subscribes to a register, applies updates, and clears the connection', async () => {
    const parcelsStore = useParcelsStore()
    parcelsStore.items = [{ id: 12, registerId: 7, passportCheckStatus: 0 }]
    const onUpdates = vi.fn()
    const onResync = vi.fn()
    const store = useParcelChecksStore()

    expect(await store.start(7, { onUpdates, onResync })).toBe(true)

    const connection = signalRState.connections[0]
    expect(signalRState.withUrl).toHaveBeenCalledWith(
      'http://localhost:8080/hubs/parcel-checks',
      expect.objectContaining({ withCredentials: false })
    )
    expect(signalRState.withUrl.mock.calls[0][1].accessTokenFactory()).toBe('jwt-token')
    expect(connection.invoke).toHaveBeenCalledWith('ObserveRegister', 7)
    expect(onResync).toHaveBeenCalledTimes(1)

    connection.handlers.ParcelCheckStatusesChanged({
      registerId: 7,
      updates: [{ parcelId: 12, checkCode: 'passport', status: 30, revision: 1 }]
    })
    connection.handlers.ParcelCheckStatusesChanged({
      registerId: 7,
      updates: [{ parcelId: 12, checkCode: 'passport', status: 10, revision: 1 }]
    })

    expect(parcelsStore.items[0].passportCheckStatus).toBe(30)
    expect(onUpdates).toHaveBeenCalledTimes(1)

    expect(await store.stop()).toBe(true)
    expect(connection.invoke).toHaveBeenCalledWith('ClearRegister')
    expect(connection.stop).toHaveBeenCalled()
  })

  it('re-observes and reconciles after automatic reconnect', async () => {
    const onResync = vi.fn()
    const store = useParcelChecksStore()
    await store.start(9, { onResync })
    const connection = signalRState.connections[0]
    connection.invoke.mockClear()
    onResync.mockClear()

    await connection.handlers.onreconnected()

    expect(connection.invoke).toHaveBeenCalledWith('ObserveRegister', 9)
    expect(onResync).toHaveBeenCalledTimes(1)
  })

  it('keeps initial connection failures non-blocking', async () => {
    signalRState.nextStartError = new Error('offline')
    const store = useParcelChecksStore()

    expect(await store.start(7)).toBe(false)
    expect(store.error?.message).toBe('offline')
  })
})
