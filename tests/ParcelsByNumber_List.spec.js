/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ParcelsByNumberList from '@/lists/ParcelsByNumber_List.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const mockItems = ref([])
const mockLoading = ref(false)
const mockError = ref(null)

const getByNumber = vi.fn()

const parcelsNumber = ref('')

const mockAlert = ref(null)
const alertError = vi.fn()
const alertClear = vi.fn()

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    items: mockItems,
    loading: mockLoading,
    error: mockError,
    getByNumber
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    parcels_number: parcelsNumber
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: mockAlert,
    error: alertError,
    clear: alertClear
  })
}))

describe('ParcelsByNumber_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockItems.value = []
    mockLoading.value = false
    mockError.value = null
    parcelsNumber.value = ''
  })

  const actionButtonStub = {
    template: '<button data-testid="parcels-by-number-search" @click="$emit(\'click\')"></button>'
  }

  it('calls getByNumber on mount when number is set', () => {
    parcelsNumber.value = 'TEST-001'
    mount(ParcelsByNumberList, {
      global: {
        stubs: {
          ...vuetifyStubs,
          ActionButton: actionButtonStub,
          TruncateTooltipCell: {
            template: '<span data-testid="truncate-cell"></span>'
          }
        }
      }
    })
    expect(getByNumber).toHaveBeenCalledWith('TEST-001')
  })

  it('triggers load when search button is clicked', async () => {
    parcelsNumber.value = '  P-123  '
    const wrapper = mount(ParcelsByNumberList, {
      global: {
        stubs: {
          ...vuetifyStubs,
          ActionButton: actionButtonStub,
          TruncateTooltipCell: {
            template: '<span data-testid="truncate-cell"></span>'
          }
        }
      }
    })

    await wrapper.find('[data-testid="parcels-by-number-search"]').trigger('click')

    expect(getByNumber).toHaveBeenCalledWith('P-123')
  })

  it('shows alert when number is empty', async () => {
    const wrapper = mount(ParcelsByNumberList, {
      global: {
        stubs: {
          ...vuetifyStubs,
          ActionButton: actionButtonStub,
          TruncateTooltipCell: {
            template: '<span data-testid="truncate-cell"></span>'
          }
        }
      }
    })

    await wrapper.find('[data-testid="parcels-by-number-search"]').trigger('click')

    expect(alertError).toHaveBeenCalledWith('Введите номер посылки')
    expect(getByNumber).not.toHaveBeenCalled()
  })

})
