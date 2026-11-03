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

  it('shows error alert and returns null when getById throws', async () => {
    getById.mockRejectedValue(new Error('Network error'))

    const { loadScanjob } = useScanjobHeading(ref(1))

    const result = await loadScanjob()

    expect(result).toBeNull()
    expect(alertError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Network error' }),
      expect.objectContaining({
        fallback: 'Ошибка при загрузке данных'
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

})
