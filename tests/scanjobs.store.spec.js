// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const signalRTestState = vi.hoisted(() => {
  const handlers = {}
  const connections = []

  function createConnection(mirrorHandlers = null) {
    const connection = {
      state: 'Disconnected',
      handlers: mirrorHandlers ?? {},
      start: vi.fn(() => {
        connection.state = 'Connected'
        return Promise.resolve()
      }),
      invoke: vi.fn(() => Promise.resolve()),
      stop: vi.fn(() => {
        connection.state = 'Disconnected'
        return Promise.resolve()
      }),
      on: vi.fn((eventName, handler) => {
        connection.handlers[eventName] = handler
      }),
      onclose: vi.fn((handler) => {
        connection.handlers.onclose = handler
      }),
      onreconnected: vi.fn((handler) => {
        connection.handlers.onreconnected = handler
      })
    }
    return connection
  }

  const firstConnection = createConnection(handlers)
  const build = vi.fn(() => {
    const connection = connections.length === 0 || firstConnection.state === 'Disconnected'
      ? firstConnection
      : createConnection()
    connections.push(connection)
    return connection
  })

  return {
    handlers,
    connections,
    firstConnection,
    build
  }
})
const signalRHandlers = signalRTestState.handlers
const signalRConnections = signalRTestState.connections
const signalRConnection = signalRTestState.firstConnection
const signalRBuild = signalRTestState.build
const signalRWithUrl = vi.hoisted(() => vi.fn(function withUrl() { return this }))
const signalRWithAutomaticReconnect = vi.hoisted(() => vi.fn(function withAutomaticReconnect() { return this }))
const signalRBuilder = vi.hoisted(() => vi.fn(() => ({
  withUrl: signalRWithUrl,
  withAutomaticReconnect: signalRWithAutomaticReconnect,
  build: signalRBuild
})))

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: signalRBuilder,
  HubConnectionState: {
    Connected: 'Connected',
    Disconnected: 'Disconnected'
  }
}))

const mockScanjobs = [
  {
    id: 1,
    name: 'Сканирование приемки',
    type: 0,
    operation: 1,
    mode: 2,
    status: 3,
    warehouseId: 10
  },
  {
    id: 2,
    name: 'Сканирование отбора',
    type: 1,
    operation: 2,
    mode: 1,
    status: 0,
    warehouseId: 11
  }
]

const mockScanjob = mockScanjobs[0]

const mockOps = {
  types: [{ value: 0, name: 'Тип 1' }],
  operations: [{ value: 1, name: 'Операция 1' }],
  modes: [{ value: 2, name: 'Режим 1' }],
  statuses: [{ value: 3, name: 'Статус 1' }]
}

describe('scanjobs store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    Object.keys(signalRHandlers).forEach((key) => delete signalRHandlers[key])
    signalRConnections.length = 0
    signalRConnection.state = 'Disconnected'
  })

  it('initializes with default values', () => {
    const store = useScanjobsStore()
    expect(store.items).toEqual([])
    expect(store.scanjob).toBeNull()
    expect(store.totalCount).toBe(0)
    expect(store.ops).toEqual({
      types: [],
      operations: [],
      modes: [],
      statuses: []
    })
    expect(store.monitorSnapshot).toBeNull()
    expect(store.monitorLoading).toBe(false)
    expect(store.monitorError).toBeNull()
    expect(store.monitorClosed).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('getAll', () => {
    it('fetches scanjobs successfully with pagination', async () => {
      const paginatedResponse = {
        items: mockScanjobs,
        pagination: {
          totalCount: 2,
          hasNextPage: false,
          hasPreviousPage: false
        }
      }
      fetchWrapper.get.mockResolvedValue(paginatedResponse)
      const store = useScanjobsStore()

      await store.getAll()

      expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining(`${apiUrl}/scanjobs?`))
      expect(store.items).toEqual(mockScanjobs)
      expect(store.totalCount).toBe(2)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('falls back to empty items array and 0 totalCount when response has no items/pagination', async () => {
      fetchWrapper.get.mockResolvedValue({})
      const store = useScanjobsStore()

      await store.getAll()

      expect(store.items).toEqual([])
      expect(store.totalCount).toBe(0)
    })

    it('uses id/desc fallbacks when sort_by is empty', async () => {
      fetchWrapper.get.mockResolvedValue({ items: [], pagination: { totalCount: 0 } })
      const store = useScanjobsStore()
      const authStore = useAuthStore()
      authStore.scanjobs_sort_by = []

      await store.getAll()

      const calledUrl = fetchWrapper.get.mock.calls[0][0]
      const urlParams = new URL(calledUrl).searchParams
      expect(urlParams.get('sortBy')).toBe('id')
      expect(urlParams.get('sortOrder')).toBe('desc')
    })

    it('appends search param when scanjobs_search is set', async () => {
      const paginatedResponse = { items: mockScanjobs, pagination: { totalCount: 2 } }
      fetchWrapper.get.mockResolvedValue(paginatedResponse)
      const store = useScanjobsStore()
      const authStore = useAuthStore()
      authStore.scanjobs_search = 'Приемка'

      await store.getAll()

      const calledUrl = fetchWrapper.get.mock.calls[0][0]
      const urlParams = new URL(calledUrl).searchParams
      expect(urlParams.has('search')).toBe(true)
      expect(decodeURIComponent(urlParams.get('search'))).toBe('Приемка')
    })

    it('handles fetch error', async () => {
      const error = new Error('Network error')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useScanjobsStore()

      await store.getAll()

      expect(store.items).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('getById', () => {
    it('fetches scanjob by id successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockScanjob)
      const store = useScanjobsStore()

      const result = await store.getById(1)

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1`)
      expect(store.scanjob).toEqual(mockScanjob)
      expect(result).toEqual(mockScanjob)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles fetch error and returns null', async () => {
      const error = new Error('Not found')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useScanjobsStore()

      const result = await store.getById(999)

      expect(result).toBeNull()
      expect(store.scanjob).toBeNull() // scanjob should remain null, not set to { error }
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })

    it('preserves previous scanjob value on fetch error', async () => {
      const error = new Error('Not found')
      fetchWrapper.get.mockResolvedValueOnce(mockScanjob).mockRejectedValueOnce(error)
      const store = useScanjobsStore()

      // First call succeeds
      await store.getById(1)
      expect(store.scanjob).toEqual(mockScanjob)

      // Second call fails - should preserve previous value
      const result = await store.getById(999)
      expect(result).toBeNull()
      expect(store.scanjob).toEqual(mockScanjob) // Previous value preserved
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('create', () => {
    it('creates scanjob successfully', async () => {
      const newScanjob = { ...mockScanjob, id: 3 }
      fetchWrapper.post.mockResolvedValue(newScanjob)
      const store = useScanjobsStore()
      store.items = [...mockScanjobs]

      const result = await store.create(mockScanjob)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/scanjobs`, mockScanjob)
      expect(store.items).toHaveLength(3)
      expect(store.items[2]).toEqual(newScanjob)
      expect(result).toEqual(newScanjob)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles create error', async () => {
      const error = new Error('Conflict')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.create(mockScanjob)).rejects.toThrow('Conflict')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('update', () => {
    it('updates scanjob successfully', async () => {
      fetchWrapper.put.mockResolvedValue({})
      const store = useScanjobsStore()
      store.items = [...mockScanjobs]
      store.scanjob = { ...mockScanjob }

      const updateData = { status: 0, mode: 1 }
      const result = await store.update(1, updateData)

      expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1`, updateData)
      expect(store.items[0]).toEqual({ ...mockScanjobs[0], ...updateData })
      expect(store.scanjob).toEqual({ ...mockScanjob, ...updateData })
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles update error', async () => {
      const error = new Error('Not found')
      fetchWrapper.put.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.update(999, {})).rejects.toThrow('Not found')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('remove', () => {
    it('removes scanjob successfully', async () => {
      fetchWrapper.delete.mockResolvedValue({})
      const store = useScanjobsStore()
      store.items = [...mockScanjobs]

      const result = await store.remove(1)

      expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1`)
      expect(store.items).not.toContain(mockScanjobs[0])
      expect(store.items.length).toBe(1)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles remove error', async () => {
      const error = new Error('Conflict')
      fetchWrapper.delete.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.remove(1)).rejects.toThrow('Conflict')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('start', () => {
    it('starts scanjob successfully', async () => {
      fetchWrapper.post.mockResolvedValue({})
      const store = useScanjobsStore()

      const result = await store.start(1)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1/start`)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles start error 403 Forbidden', async () => {
      const error = new Error('403 Forbidden')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.start(1)).rejects.toThrow('403 Forbidden')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })

    it('handles start error 404 Not Found', async () => {
      const error = new Error('404 Not Found')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.start(999)).rejects.toThrow('404 Not Found')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('finish', () => {
    it('finishes scanjob successfully', async () => {
      fetchWrapper.post.mockResolvedValue({})
      const store = useScanjobsStore()

      const result = await store.finish(1)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1/finish`)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles finish error 403 Forbidden', async () => {
      const error = new Error('403 Forbidden')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.finish(1)).rejects.toThrow('403 Forbidden')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })

    it('handles finish error 404 Not Found', async () => {
      const error = new Error('404 Not Found')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.finish(999)).rejects.toThrow('404 Not Found')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('pause', () => {
    it('pauses scanjob successfully', async () => {
      fetchWrapper.post.mockResolvedValue({})
      const store = useScanjobsStore()

      const result = await store.pause(1)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1/pause`)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles pause error 403 Forbidden', async () => {
      const error = new Error('403 Forbidden')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.pause(1)).rejects.toThrow('403 Forbidden')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })

    it('handles pause error 404 Not Found', async () => {
      const error = new Error('404 Not Found')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.pause(999)).rejects.toThrow('404 Not Found')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('ops', () => {
    it('fetches ops successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockOps)
      const store = useScanjobsStore()

      const result = await store.getOps()

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/scanjobs/ops`)
      expect(store.ops).toEqual(mockOps)
      expect(result).toEqual(mockOps)
      expect(store.opsLoading).toBe(false)
      expect(store.opsError).toBeNull()
    })

    it('handles ops error', async () => {
      const error = new Error('Ops error')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useScanjobsStore()

      const result = await store.getOps()

      expect(result).toBeNull()
      expect(store.opsLoading).toBe(false)
      expect(store.opsError).toBe(error)
    })

    it('ensureOpsLoaded only calls ops once', async () => {
      fetchWrapper.get.mockResolvedValue(mockOps)
      const store = useScanjobsStore()

      await store.ensureOpsLoaded()
      await store.ensureOpsLoaded()

      expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/scanjobs/ops`)
      expect(store.ops).toEqual(mockOps)
    })

    it('getOpsLabel returns matching name and falls back to string when missing', () => {
      const store = useScanjobsStore()

      // set ops to known values
      store.ops = JSON.parse(JSON.stringify(mockOps))

      // matching numeric value
      expect(store.getOpsLabel(store.ops.types, 0)).toBe('Тип 1')
      // matching when value is a string
      expect(store.getOpsLabel(store.ops.operations, '1')).toBe('Операция 1')
      // no match -> stringified fallback
      expect(store.getOpsLabel(store.ops.modes, 999)).toBe('999')
      // null/undefined list -> fallback
      expect(store.getOpsLabel(null, 5)).toBe('5')
    })
  })

  describe('monitor', () => {
    const monitorSnapshot = {
      scanJobId: 42,
      area: 0,
      boxes: [],
      box: null
    }

    it('loads monitor snapshot', async () => {
      fetchWrapper.get.mockResolvedValue(monitorSnapshot)
      const store = useScanjobsStore()

      const result = await store.loadMonitorSnapshot(42, { area: 0 })

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/scanjobs/42/monitor?area=0`)
      expect(result).toEqual(monitorSnapshot)
      expect(store.monitorSnapshot).toEqual(monitorSnapshot)
      expect(store.monitorLoading).toBe(false)
      expect(store.monitorError).toBeNull()
    })

    it('loads box monitor snapshot with box id', async () => {
      fetchWrapper.get.mockResolvedValue({ ...monitorSnapshot, area: 1 })
      const store = useScanjobsStore()

      await store.loadMonitorSnapshot(42, { area: 1, boxId: 7 })

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/scanjobs/42/monitor?area=1&boxId=7`)
    })

    it('loads unassigned monitor snapshot with bucket index', async () => {
      fetchWrapper.get.mockResolvedValue({ ...monitorSnapshot, area: 2 })
      const store = useScanjobsStore()

      await store.loadMonitorSnapshot(42, { area: 2, bucketIndex: 3 })

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/scanjobs/42/monitor?area=2&bucketIndex=3`)
    })

    it('starts SignalR monitor and forwards snapshots', async () => {
      const onSnapshot = vi.fn()
      const store = useScanjobsStore()

      await store.startMonitor(42, { area: 1, boxId: 7, onSnapshot })

      expect(signalRWithUrl).toHaveBeenCalledWith('http://localhost:8080/hubs/scan-jobs', {
        accessTokenFactory: expect.any(Function),
        withCredentials: false
      })
      expect(signalRConnection.start).toHaveBeenCalled()
      expect(signalRConnection.invoke).toHaveBeenCalledWith('ObserveScanJob', {
        scanJobId: 42,
        area: 1,
        boxId: 7
      })

      signalRHandlers.ScanJobMonitorSnapshot(monitorSnapshot)

      expect(store.monitorSnapshot).toEqual(monitorSnapshot)
      expect(onSnapshot).toHaveBeenCalledWith(monitorSnapshot)
    })

    it('starts autofollow monitor on a separate connection without replacing the visible snapshot', async () => {
      const onSnapshot = vi.fn()
      const store = useScanjobsStore()
      const visibleSnapshot = { ...monitorSnapshot, area: 1, box: { boxId: 7 } }
      const autoFollowSnapshot = { ...monitorSnapshot, area: 0, boxes: [{ boxId: 8 }] }

      await store.startMonitor(42, { area: 1, boxId: 7 })
      signalRConnections[0].handlers.ScanJobMonitorSnapshot(visibleSnapshot)

      await store.startMonitorAutoFollow(42, { onSnapshot })

      expect(signalRConnections).toHaveLength(2)
      expect(signalRConnections[1].start).toHaveBeenCalled()
      expect(signalRConnections[1].invoke).toHaveBeenCalledWith('ObserveScanJob', {
        scanJobId: 42,
        area: 0
      })

      signalRConnections[1].handlers.ScanJobMonitorSnapshot(autoFollowSnapshot)

      expect(onSnapshot).toHaveBeenCalledWith(autoFollowSnapshot)
      expect(store.monitorSnapshot).toEqual(visibleSnapshot)
    })

    it('stops autofollow monitor independently from the visible monitor', async () => {
      const store = useScanjobsStore()

      await store.startMonitor(42, { area: 1, boxId: 7 })
      await store.startMonitorAutoFollow(42)

      await store.stopMonitorAutoFollow()

      expect(signalRConnections[1].invoke).toHaveBeenCalledWith('ClearScanJobMonitor')
      expect(signalRConnections[1].stop).toHaveBeenCalled()
      expect(signalRConnections[0].stop).not.toHaveBeenCalled()

      await store.stopMonitor()

      expect(signalRConnections[0].stop).toHaveBeenCalled()
    })

    it('getMonitorAccessToken returns user token via accessTokenFactory', async () => {
      const store = useScanjobsStore()
      const authStore = useAuthStore()
      authStore.user = { token: 'test-token-xyz' }

      await store.startMonitor(42, { area: 0 })

      const accessTokenFactory = signalRWithUrl.mock.calls[0][1].accessTokenFactory
      expect(typeof accessTokenFactory).toBe('function')
      expect(accessTokenFactory()).toBe('test-token-xyz')
    })

    it('getMonitorAccessToken returns empty string when user has no token', async () => {
      const store = useScanjobsStore()
      const authStore = useAuthStore()
      authStore.user = null

      await store.startMonitor(42, { area: 0 })

      const accessTokenFactory = signalRWithUrl.mock.calls[0][1].accessTokenFactory
      expect(accessTokenFactory()).toBe('')
    })

    it('startMonitor throws and sets monitorError when invoke fails', async () => {
      const invokeError = new Error('Invoke ObserveScanJob failed')
      signalRConnection.invoke.mockRejectedValueOnce(invokeError)

      const store = useScanjobsStore()

      await expect(store.startMonitor(42, { area: 0 })).rejects.toThrow('Invoke ObserveScanJob failed')
      expect(store.monitorError).toBe(invokeError)
      expect(store.monitorLoading).toBe(false)
    })

    it('records closed monitor event', async () => {
      const onClosed = vi.fn()
      const store = useScanjobsStore()

      await store.startMonitor(42, { area: 0, onClosed })
      signalRHandlers.ScanJobMonitorClosed(42, 2)

      expect(store.monitorClosed).toEqual({ scanJobId: 42, status: 2 })
      expect(onClosed).toHaveBeenCalledWith(42, 2)
    })

    it('re-observes monitor on reconnect with the last request', async () => {
      const store = useScanjobsStore()

      await store.startMonitor(42, { area: 1, boxId: 7 })
      signalRConnection.invoke.mockClear()

      signalRHandlers.onreconnected()
      await Promise.resolve()

      expect(signalRConnection.invoke).toHaveBeenCalledWith('ObserveScanJob', {
        scanJobId: 42,
        area: 1,
        boxId: 7
      })
    })

    it('does not re-observe monitor on reconnect after clearMonitor', async () => {
      const store = useScanjobsStore()

      await store.startMonitor(42, { area: 0 })
      await store.clearMonitor()
      signalRConnection.invoke.mockClear()

      signalRHandlers.onreconnected()

      expect(signalRConnection.invoke).not.toHaveBeenCalledWith('ObserveScanJob', expect.anything())
    })

    it('clears and stops monitor connection', async () => {
      const store = useScanjobsStore()

      await store.startMonitor(42, { area: 0 })
      await store.clearMonitor()
      await store.stopMonitor()

      expect(signalRConnection.invoke).toHaveBeenCalledWith('ClearScanJobMonitor')
      expect(signalRConnection.stop).toHaveBeenCalled()
    })

    it('clearMonitor returns false when no connection exists', async () => {
      const store = useScanjobsStore()

      const result = await store.clearMonitor()
      expect(result).toBe(false)
    })

    it('clearMonitor returns false when connection is disconnected', async () => {
      const store = useScanjobsStore()

      // Build connection without connecting
      await store.startMonitor(42, { area: 0 })
      await store.stopMonitor()

      // A new store instance has no connection
      setActivePinia(createPinia())
      const freshStore = useScanjobsStore()
      const result = await freshStore.clearMonitor()
      expect(result).toBe(false)
    })

    it('stopMonitor returns false when there is no connection', async () => {
      const store = useScanjobsStore()

      const result = await store.stopMonitor()
      expect(result).toBe(false)
    })

    it('stopMonitor throws and sets monitorError when stop fails', async () => {
      const stopError = new Error('Stop failed')
      signalRConnection.stop.mockRejectedValueOnce(stopError)

      const store = useScanjobsStore()
      await store.startMonitor(42, { area: 0 })

      await expect(store.stopMonitor()).rejects.toThrow('Stop failed')
      expect(store.monitorError).toBe(stopError)
    })

    it('stopMonitor retains monitorConnection reference when stop throws (allows retry)', async () => {
      const stopError = new Error('Stop failed')
      signalRConnection.stop.mockRejectedValueOnce(stopError)
      signalRConnection.stop.mockResolvedValueOnce(undefined)

      const store = useScanjobsStore()
      await store.startMonitor(42, { area: 0 })

      // First attempt fails — connection should still be accessible for a retry
      await expect(store.stopMonitor()).rejects.toThrow('Stop failed')

      // Second attempt should succeed now that stop resolves
      const result = await store.stopMonitor()
      expect(result).toBe(true)
    })

    it('allows an in-flight monitor start to finish after stopMonitor clears the shared start reference', async () => {
      let resolveStart
      signalRConnection.start.mockImplementationOnce(() => new Promise((resolve) => {
        resolveStart = () => {
          signalRConnection.state = 'Connected'
          resolve()
        }
      }))

      const store = useScanjobsStore()
      const startPromise = store.startMonitor(42, { area: 0 })
      await Promise.resolve()

      const stopPromise = store.stopMonitor()
      resolveStart()

      await expect(startPromise).resolves.toBe(true)
      await expect(stopPromise).resolves.toBe(true)
    })

    it('ensureMonitorStarted reuses existing Connected connection without calling start again', async () => {
      const store = useScanjobsStore()

      await store.startMonitor(42, { area: 0 })
      expect(signalRConnection.start).toHaveBeenCalledTimes(1)

      await store.startMonitor(42, { area: 1, boxId: 5 })
      expect(signalRConnection.start).toHaveBeenCalledTimes(1)
    })

    it('loadMonitorSnapshot throws and sets monitorError on failure', async () => {
      const fetchError = new Error('Snapshot error')
      fetchWrapper.get.mockRejectedValue(fetchError)

      const store = useScanjobsStore()

      await expect(store.loadMonitorSnapshot(42, { area: 0 })).rejects.toThrow('Snapshot error')
      expect(store.monitorError).toBe(fetchError)
      expect(store.monitorLoading).toBe(false)
    })

    it('clearMonitor throws and sets monitorError when invoke fails', async () => {
      const invokeError = new Error('Invoke failed')

      const store = useScanjobsStore()
      await store.startMonitor(42, { area: 0 })

      signalRConnection.invoke.mockRejectedValueOnce(invokeError)

      await expect(store.clearMonitor()).rejects.toThrow('Invoke failed')
      expect(store.monitorError).toBe(invokeError)
    })

    it('sets monitorError when connection closes with an error', async () => {
      const store = useScanjobsStore()
      await store.startMonitor(42, { area: 0 })

      const closeError = new Error('Connection dropped')
      signalRHandlers.onclose(closeError)

      expect(store.monitorError).toBe(closeError)
    })

    it('does not set monitorError when connection closes cleanly', async () => {
      const store = useScanjobsStore()
      await store.startMonitor(42, { area: 0 })

      signalRHandlers.onclose(null)

      expect(store.monitorError).toBeNull()
    })

    it('buildMonitorRequest omits boxId for Boxes area', async () => {
      const store = useScanjobsStore()
      await store.startMonitor(42, { area: 0, boxId: 7 })

      expect(signalRConnection.invoke).toHaveBeenCalledWith('ObserveScanJob', {
        scanJobId: 42,
        area: 0
      })
    })

    it('buildMonitorRequest includes bucketIndex for Unassigned area', async () => {
      const store = useScanjobsStore()
      await store.startMonitor(42, { area: 2, bucketIndex: 4 })

      expect(signalRConnection.invoke).toHaveBeenCalledWith('ObserveScanJob', {
        scanJobId: 42,
        area: 2,
        bucketIndex: 4
      })
    })

    it('stopMonitor does not invoke ClearScanJobMonitor when connection is disconnected', async () => {
      const store = useScanjobsStore()
      await store.startMonitor(42, { area: 0 })

      // Manually set the state to Disconnected
      signalRConnection.state = 'Disconnected'
      signalRConnection.invoke.mockClear()

      const result = await store.stopMonitor()

      expect(result).toBe(true)
      // ClearScanJobMonitor should not be invoked when disconnected
      expect(signalRConnection.invoke).not.toHaveBeenCalledWith('ClearScanJobMonitor')
      expect(signalRConnection.stop).toHaveBeenCalled()
    })

    it('starts scan jobs list monitor and forwards change notifications', async () => {
      const onChanged = vi.fn()
      const store = useScanjobsStore()

      await store.startScanJobsListMonitor({ onChanged })

      expect(signalRWithUrl).toHaveBeenCalledWith('http://localhost:8080/hubs/scan-jobs', {
        accessTokenFactory: expect.any(Function),
        withCredentials: false
      })
      expect(signalRConnection.start).toHaveBeenCalled()
      expect(signalRConnection.invoke).toHaveBeenCalledWith('ObserveScanJobs')

      signalRHandlers.ScanJobsChanged()

      expect(onChanged).toHaveBeenCalledTimes(1)
    })

    it('stops scan jobs list monitor', async () => {
      const store = useScanjobsStore()

      await store.startScanJobsListMonitor({ onChanged: vi.fn() })
      const result = await store.stopScanJobsListMonitor()

      expect(result).toBe(true)
      expect(signalRConnection.invoke).toHaveBeenCalledWith('ClearScanJobs')
      expect(signalRConnection.stop).toHaveBeenCalled()
    })

    it('reuses existing scan jobs list connection and skips restart when already connected', async () => {
      const store = useScanjobsStore()
      const firstChangedHandler = vi.fn()
      const secondChangedHandler = vi.fn()

      await store.startScanJobsListMonitor({ onChanged: firstChangedHandler })
      signalRConnection.start.mockClear()
      signalRConnection.invoke.mockClear()

      await store.startScanJobsListMonitor({ onChanged: secondChangedHandler })
      signalRHandlers.ScanJobsChanged()

      expect(signalRConnection.start).not.toHaveBeenCalled()
      expect(signalRConnection.invoke).not.toHaveBeenCalledWith('ObserveScanJobs')
      expect(signalRWithUrl).toHaveBeenCalledTimes(1)
      expect(firstChangedHandler).not.toHaveBeenCalled()
      expect(secondChangedHandler).toHaveBeenCalledTimes(1)
    })

    it('observes scan jobs list again after stop and restart', async () => {
      const store = useScanjobsStore()
      await store.startScanJobsListMonitor({ onChanged: vi.fn() })
      await store.stopScanJobsListMonitor()
      signalRConnection.invoke.mockClear()

      await store.startScanJobsListMonitor({ onChanged: vi.fn() })

      expect(signalRConnection.invoke).toHaveBeenCalledWith('ObserveScanJobs')
    })

    it('forwards scan jobs list close notifications', async () => {
      const onClosed = vi.fn()
      const closeError = new Error('List monitor disconnected')
      const store = useScanjobsStore()

      await store.startScanJobsListMonitor({ onClosed })
      signalRHandlers.onclose(closeError)

      expect(onClosed).toHaveBeenCalledWith(closeError)
    })

    it('stores error when re-observing list monitor fails on reconnect', async () => {
      const reconnectError = new Error('Observe on reconnect failed')
      const store = useScanjobsStore()
      await store.startScanJobsListMonitor({ onChanged: vi.fn() })
      signalRConnection.invoke.mockRejectedValueOnce(reconnectError)

      signalRHandlers.onreconnected()
      await Promise.resolve()

      expect(signalRConnection.invoke).toHaveBeenCalledWith('ObserveScanJobs')
      expect(store.error).toBe(reconnectError)
    })

    it('does not re-observe list monitor on reconnect when observation is inactive', async () => {
      const store = useScanjobsStore()
      await store.startScanJobsListMonitor({ onChanged: vi.fn() })
      await store.stopScanJobsListMonitor()
      signalRConnection.invoke.mockClear()

      signalRHandlers.onreconnected()

      expect(signalRConnection.invoke).not.toHaveBeenCalledWith('ObserveScanJobs')
    })

    it('stopScanJobsListMonitor returns false when list monitor was never started', async () => {
      const store = useScanjobsStore()

      const result = await store.stopScanJobsListMonitor()

      expect(result).toBe(false)
    })

    it('stopScanJobsListMonitor throws and stores error when stop fails', async () => {
      const stopError = new Error('Stop list monitor failed')
      const store = useScanjobsStore()
      await store.startScanJobsListMonitor({ onChanged: vi.fn() })
      signalRConnection.stop.mockRejectedValueOnce(stopError)

      await expect(store.stopScanJobsListMonitor()).rejects.toThrow('Stop list monitor failed')
      expect(store.error).toBe(stopError)
    })
  })
})
