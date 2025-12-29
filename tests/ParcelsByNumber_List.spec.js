/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ParcelsByNumberList from '@/lists/ParcelsByNumber_List.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

vi.mock('@/router', () => ({
  default: {
    push: vi.fn()
  }
}))

import router from '@/router'

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
    items_bn: mockItems,
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
    router.push.mockClear()
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

  it('routes to register view when register deal number is clicked', async () => {
    mockItems.value = [
      {
        id: 42,
        registerId: 7,
        registerDealNumber: 'D-777',
        number: 'N-777',
        productName: 'Product',
        tnVed: 'TN',
        dTag: 'DT',
        dTagComment: 'Comment',
        previousDTagComment: 'Prev'
      }
    ]

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

    await wrapper.find('[data-testid="parcels-by-number-cell-registerDealNumber-42"]').trigger('click')

    expect(router.push).toHaveBeenCalledWith('/register/edit/7')
  })

  it('routes to parcel view when any other column is clicked', async () => {
    mockItems.value = [
      {
        id: 11,
        registerId: 4,
        registerDealNumber: 'D-004',
        number: 'N-004',
        productName: 'Product B',
        tnVed: 'TN2',
        dTag: 'DT2',
        dTagComment: 'Comment2',
        previousDTagComment: 'Prev2'
      }
    ]

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

    await wrapper.find('[data-testid="parcels-by-number-cell-number-11"]').trigger('click')

    expect(router.push).toHaveBeenCalledWith({
      name: 'Редактирование посылки',
      params: {
        id: 11,
        registerId: 4
      },
      query: {}
    })
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
