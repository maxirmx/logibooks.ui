// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useScanjobHeading } from '@/composables/useScanjobHeading.js'

const getById = vi.hoisted(() => vi.fn())

vi.mock('@/stores/scanjobs.store.js', () => ({ useScanjobsStore: () => ({ getById }) }))

describe('useScanjobHeading', () => {
  beforeEach(() => getById.mockReset())

  it('keeps the heading empty until the current job loads and propagates load failure', async () => {
    const id = ref(1)
    const job = { id: 1, name: 'Задание на складе' }
    const error = new Error('Network error')
    getById.mockResolvedValueOnce(job).mockRejectedValueOnce(error)
    const { loadScanjob, scanjobHeading } = useScanjobHeading(id)
    expect(scanjobHeading.value).toBe('')
    await expect(loadScanjob()).resolves.toBe(job)
    expect(scanjobHeading.value).toBe(job.name)
    id.value = 2
    expect(scanjobHeading.value).toBe('')
    await expect(loadScanjob()).rejects.toBe(error)
    expect(scanjobHeading.value).toBe('')
  })

  it('omits an unavailable name and ignores a response after unmount', async () => {
    getById.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 1, name: 'Старое задание' })
    const isComponentMounted = ref(true)
    const { loadScanjob, scanjobHeading } = useScanjobHeading(ref(1), { isComponentMounted })

    await loadScanjob()
    expect(scanjobHeading.value).toBe('')
    isComponentMounted.value = false
    await loadScanjob()
    expect(scanjobHeading.value).toBe('')
  })
})
