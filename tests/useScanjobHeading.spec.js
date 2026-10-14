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

  it('shows error alert and returns null when getById throws', async () => {
    getById.mockRejectedValue(new Error('Network error'))

    const { loadScanjob } = useScanjobHeading(ref(1))

    const result = await loadScanjob()

    expect(result).toBeNull()
    expect(alertError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Network error' }),
      expect.objectContaining({
        fallback: 'Ошибка при загрузке данных',
        action: expect.objectContaining({ label: 'Повторить', handler: expect.any(Function) })
      })
    )
  })

  it('suppresses error alert when component is not mounted and getById throws', async () => {
    getById.mockRejectedValue(new Error('err'))
    const isComponentMounted = ref(false)

    const { loadScanjob } = useScanjobHeading(ref(1), { isComponentMounted })

    await loadScanjob()

    expect(alertError).not.toHaveBeenCalled()
  })

  it('resets loading state before a subsequent load finishes', async () => {
    const firstResult = { id: 5, name: 'Job Five' }
    mockScanjob.value = firstResult
    getById.mockResolvedValueOnce(firstResult)

    const { scanjobHeading, scanjobLoading, loadScanjob } = useScanjobHeading(ref(5))

    await loadScanjob()
    expect(scanjobLoading.value).toBe(false)
    expect(scanjobHeading.value).toBe('Job Five')

    let resolveScanjob
    getById.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveScanjob = resolve
      })
    )

    const pendingLoad = loadScanjob()

    expect(scanjobLoading.value).toBe(true)
    expect(scanjobHeading.value).toBe('Загрузка задания на сканирование...')

    resolveScanjob({ id: 6, name: 'Job Six' })
    mockScanjob.value = { id: 6, name: 'Job Six' }
    await pendingLoad

    expect(scanjobLoading.value).toBe(false)
    expect(scanjobHeading.value).toBe('Job Six')
  })
})
