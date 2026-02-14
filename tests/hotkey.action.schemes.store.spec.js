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

  it('remove throws and stores error on failure', async () => {
    const error = new Error('conflict')
    fetchWrapper.delete.mockRejectedValue(error)
    const store = useHotKeyActionSchemesStore()

    await expect(store.remove(1)).rejects.toThrow('conflict')
    expect(store.error).toBe(error)
  })
})
