// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useScanjobHeading } from '@/composables/useScanjobHeading.js'

const getById = vi.hoisted(() => vi.fn())
const alertError = vi.hoisted(() => vi.fn())
const mockScanjob = vi.hoisted(() => ({ __v_isRef: true, value: null }))

vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanjobsStore: () => ({
    scanjob: mockScanjob,
    getById
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    error: alertError
  })
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      const refs = {}
      Object.keys(store).forEach((key) => {
        const value = store[key]
        if (value && typeof value === 'object' && 'value' in value) {
          refs[key] = value
        }
      })
      return refs
    }
  }
})

describe('useScanjobHeading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockScanjob.value = null
  })

  it('returns loading heading while scanjob is not yet loaded', () => {
    const { scanjobHeading, scanjobLoading } = useScanjobHeading(ref(1))
    expect(scanjobLoading.value).toBe(true)
    expect(scanjobHeading.value).toBe('Загрузка задания на сканирование...')
  })

  it('returns scanjob name after successful load', async () => {
    mockScanjob.value = { id: 1, name: 'Test Job' }
    getById.mockResolvedValue({ id: 1, name: 'Test Job' })

    const { scanjobHeading, scanjobLoading, loadScanjob } = useScanjobHeading(ref(1))

    await loadScanjob()

    expect(scanjobLoading.value).toBe(false)
    expect(scanjobHeading.value).toBe('Test Job')
  })

  it('returns fallback heading when scanjob has no name', async () => {
    mockScanjob.value = { id: 1 }
    getById.mockResolvedValue({ id: 1 })

    const { scanjobHeading, scanjobLoading, loadScanjob } = useScanjobHeading(ref(1))

    await loadScanjob()

    expect(scanjobLoading.value).toBe(false)
    expect(scanjobHeading.value).toBe('Результаты сканирования')
  })

  it('shows error alert and returns null when getById returns null/falsy', async () => {
    getById.mockResolvedValue(null)

    const { loadScanjob } = useScanjobHeading(ref(1))

    const result = await loadScanjob()

    expect(result).toBeNull()
    expect(alertError).toHaveBeenCalledWith('Не удалось загрузить задание на сканирование')
  })

  it('shows error alert and returns null when getById throws', async () => {
    getById.mockRejectedValue(new Error('Network error'))

    const { loadScanjob } = useScanjobHeading(ref(1))

    const result = await loadScanjob()

    expect(result).toBeNull()
    expect(alertError).toHaveBeenCalledWith('Ошибка при загрузке данных')
  })

  it('suppresses error alert when component is not mounted and getById returns null', async () => {
    getById.mockResolvedValue(null)
    const isComponentMounted = ref(false)

    const { loadScanjob } = useScanjobHeading(ref(1), { isComponentMounted })

    await loadScanjob()

    expect(alertError).not.toHaveBeenCalled()
  })

  it('suppresses error alert when component is not mounted and getById throws', async () => {
    getById.mockRejectedValue(new Error('err'))
    const isComponentMounted = ref(false)

    const { loadScanjob } = useScanjobHeading(ref(1), { isComponentMounted })

    await loadScanjob()

    expect(alertError).not.toHaveBeenCalled()
  })

  it('updates scanjobLoading when component is mounted via explicit isComponentMounted ref', async () => {
    getById.mockResolvedValue(null)
    const isComponentMounted = ref(true)

    const { scanjobLoading, loadScanjob } = useScanjobHeading(ref(1), { isComponentMounted })

    await loadScanjob()

    expect(scanjobLoading.value).toBe(false)
    expect(alertError).toHaveBeenCalledWith('Не удалось загрузить задание на сканирование')
  })

  it('does not update scanjobLoading when component is not mounted', async () => {
    getById.mockResolvedValue(null)
    const isComponentMounted = ref(false)

    const { scanjobLoading, loadScanjob } = useScanjobHeading(ref(1), { isComponentMounted })

    await loadScanjob()

    // scanjobLoading should remain true since component is not mounted
    expect(scanjobLoading.value).toBe(true)
  })

  it('returns the loaded scanjob on success', async () => {
    const mockResult = { id: 5, name: 'Job Five' }
    mockScanjob.value = mockResult
    getById.mockResolvedValue(mockResult)

    const { loadScanjob } = useScanjobHeading(ref(5))

    const result = await loadScanjob()

    expect(result).toEqual(mockResult)
  })
})
