/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import UnregisteredParcelsList from '@/lists/UnregisteredParcels_List.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const mockItems = ref([])
const mockLoading = ref(false)
const mockError = ref(null)
const getAll = vi.fn()
const alertError = vi.fn()

vi.mock('@/stores/unregistered.parcels.store.js', () => ({
  useUnregisteredParcelsStore: () => ({
    items: mockItems,
    loading: mockLoading,
    error: mockError,
    getAll
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    error: alertError
  })
}))

describe('UnregisteredParcels_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockItems.value = []
    mockLoading.value = false
    mockError.value = null
  })

  it('loads rows on mount with register id', () => {
    getAll.mockResolvedValue([])

    mount(UnregisteredParcelsList, {
      props: { registerId: 5 },
      global: { stubs: vuetifyStubs }
    })

    expect(getAll).toHaveBeenCalledWith(5)
  })

  it('reports invalid register id', () => {
    mount(UnregisteredParcelsList, {
      props: { registerId: 0 },
      global: { stubs: vuetifyStubs }
    })

    expect(getAll).not.toHaveBeenCalled()
    expect(alertError).toHaveBeenCalledWith('Некорректный идентификатор реестра')
  })

  it('reports store loading error when load fails', async () => {
    getAll.mockResolvedValue([])
    mockError.value = new Error('load error')

    mount(UnregisteredParcelsList, {
      props: { registerId: 12 },
      global: { stubs: vuetifyStubs }
    })

    await Promise.resolve()
    expect(alertError).toHaveBeenCalledWith('Ошибка при загрузке незарегистрированных посылок')
  })
})
