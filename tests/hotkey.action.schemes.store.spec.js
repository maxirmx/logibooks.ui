// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHotKeyActionSchemesStore } from '@/stores/hotkey.action.schemes.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

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

const mockSchemes = [
  { id: 1, name: 'Default' },
  { id: 2, name: 'Warehouse' }
]

const mockOps = {
  actions: [
    { value: 0, name: 'Действие 1', event: 'event1' },
    { value: 1, name: 'Действие 2', event: 'event2' }
  ]
}

describe('hotkey action schemes store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default values', () => {
    const store = useHotKeyActionSchemesStore()
    expect(store.hotKeyActionSchemes).toEqual([])
    expect(store.hotKeyActionScheme).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.ops).toEqual({
      actions: []
    })
    expect(store.opsLoading).toBe(false)
    expect(store.opsError).toBeNull()
  })

  it('getAll fetches schemes', async () => {
    fetchWrapper.get.mockResolvedValue(mockSchemes)
    const store = useHotKeyActionSchemesStore()

    await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/hotkeyactionschemes`)
    expect(store.hotKeyActionSchemes).toEqual(mockSchemes)
  })

  it('getById handles fetch error', async () => {
    const error = new Error('Not found')
    fetchWrapper.get.mockRejectedValue(error)
    const store = useHotKeyActionSchemesStore()

    const result = await store.getById(99)

    expect(result).toBeNull()
    expect(store.hotKeyActionScheme).toEqual({ error })
    expect(store.error).toBe(error)
  })

  it('create appends created scheme', async () => {
    const created = { id: 3, name: 'Ops' }
    fetchWrapper.post.mockResolvedValue(created)
    const store = useHotKeyActionSchemesStore()
    store.hotKeyActionSchemes = [...mockSchemes]

    const result = await store.create({ name: 'Ops' })

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/hotkeyactionschemes`, { name: 'Ops' })
    expect(store.hotKeyActionSchemes.at(-1)).toEqual(created)
    expect(result).toEqual(created)
  })

  it('update updates local list item', async () => {
    fetchWrapper.put.mockResolvedValue({})
    const store = useHotKeyActionSchemesStore()
    store.hotKeyActionSchemes = [...mockSchemes]

    await store.update(1, { name: 'Default v2' })

    expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/hotkeyactionschemes/1`, { name: 'Default v2' })
    expect(store.hotKeyActionSchemes[0]).toEqual({ id: 1, name: 'Default v2' })
  })

  it('remove deletes local list item', async () => {
    fetchWrapper.delete.mockResolvedValue({})
    const store = useHotKeyActionSchemesStore()
    store.hotKeyActionSchemes = [...mockSchemes]

    await store.remove(1)

    expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/hotkeyactionschemes/1`)
    expect(store.hotKeyActionSchemes).toEqual([{ id: 2, name: 'Warehouse' }])
  })

  it('getById returns item on success', async () => {
    fetchWrapper.get.mockResolvedValue({ id: 10, name: 'A' })
    const store = useHotKeyActionSchemesStore()

    const result = await store.getById(10)

    expect(result).toEqual({ id: 10, name: 'A' })
  })

  it('getAll stores error on failure', async () => {
    const error = new Error('boom')
    fetchWrapper.get.mockRejectedValue(error)
    const store = useHotKeyActionSchemesStore()

    await store.getAll()

    expect(store.error).toBe(error)
  })

  it('create throws and stores error on failure', async () => {
    const error = new Error('conflict')
    fetchWrapper.post.mockRejectedValue(error)
    const store = useHotKeyActionSchemesStore()

    await expect(store.create({ name: 'x' })).rejects.toThrow('conflict')
    expect(store.error).toBe(error)
  })

  it('update leaves list unchanged when id not found', async () => {
    fetchWrapper.put.mockResolvedValue({})
    const store = useHotKeyActionSchemesStore()
    store.hotKeyActionSchemes = [{ id: 1, name: 'A' }]

    await store.update(9, { name: 'B' })

    expect(store.hotKeyActionSchemes).toEqual([{ id: 1, name: 'A' }])
  })

  it('update throws and stores error on failure', async () => {
    const error = new Error('conflict')
    fetchWrapper.put.mockRejectedValue(error)
    const store = useHotKeyActionSchemesStore()

    await expect(store.update(1, { name: 'x' })).rejects.toThrow('conflict')
    expect(store.error).toBe(error)
  })

  it('remove throws and stores error on failure', async () => {
    const error = new Error('conflict')
    fetchWrapper.delete.mockRejectedValue(error)
    const store = useHotKeyActionSchemesStore()

    await expect(store.remove(1)).rejects.toThrow('conflict')
    expect(store.error).toBe(error)
  })

  describe('ops', () => {
    it('fetches ops successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockOps)
      const store = useHotKeyActionSchemesStore()

      const result = await store.getOps()

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/hotkeyactionschemes/ops`)
      expect(store.ops).toEqual(mockOps)
      expect(result).toEqual(mockOps)
      expect(store.opsLoading).toBe(false)
      expect(store.opsError).toBeNull()
    })

    it('handles ops error', async () => {
      const error = new Error('Ops error')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useHotKeyActionSchemesStore()

      const result = await store.getOps()

      expect(result).toBeNull()
      expect(store.opsLoading).toBe(false)
      expect(store.opsError).toBe(error)
    })

    it('ensureOpsLoaded only calls ops once', async () => {
      fetchWrapper.get.mockResolvedValue(mockOps)
      const store = useHotKeyActionSchemesStore()

      await store.ensureOpsLoaded()
      await store.ensureOpsLoaded()

      expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/hotkeyactionschemes/ops`)
      expect(store.ops).toEqual(mockOps)
    })

    it('ensureOpsLoaded returns cached value after initialization', async () => {
      fetchWrapper.get.mockResolvedValue(mockOps)
      const store = useHotKeyActionSchemesStore()

      // First call
      const result1 = await store.ensureOpsLoaded()
      expect(result1).toEqual(mockOps)

      // Second call should use cached value
      const result2 = await store.ensureOpsLoaded()
      expect(result2).toEqual(mockOps)

      // Fetch should only be called once
      expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    })

    it('ensureOpsLoaded handles concurrent calls', async () => {
      fetchWrapper.get.mockResolvedValue(mockOps)
      const store = useHotKeyActionSchemesStore()

      // Make multiple concurrent calls
      const [result1, result2, result3] = await Promise.all([
        store.ensureOpsLoaded(),
        store.ensureOpsLoaded(),
        store.ensureOpsLoaded()
      ])

      // All should return the same data
      expect(result1).toEqual(mockOps)
      expect(result2).toEqual(mockOps)
      expect(result3).toEqual(mockOps)

      // But fetch should only be called once
      expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    })

    it('getOpsLabel returns matching name and falls back to string when missing', () => {
      const store = useHotKeyActionSchemesStore()

      // set ops to known values
      store.ops = JSON.parse(JSON.stringify(mockOps))

      // matching numeric value
      expect(store.getOpsLabel(store.ops.actions, 0)).toBe('Действие 1')
      // matching when value is a string
      expect(store.getOpsLabel(store.ops.actions, '1')).toBe('Действие 2')
      // no match -> stringified fallback
      expect(store.getOpsLabel(store.ops.actions, 999)).toBe('999')
      // null/undefined list -> fallback
      expect(store.getOpsLabel(null, 5)).toBe('5')
      expect(store.getOpsLabel(undefined, 10)).toBe('10')
    })

    it('getOpsLabel handles empty list', () => {
      const store = useHotKeyActionSchemesStore()

      expect(store.getOpsLabel([], 1)).toBe('1')
    })
  })
})
