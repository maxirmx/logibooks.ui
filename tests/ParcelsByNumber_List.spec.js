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
const parcelsBnPerPage = ref(100)
const parcelsBnPage = ref(1)
const parcelsBnSortBy = ref([{ key: 'id', order: 'asc' }])

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
    parcels_number: parcelsNumber,
    parcels_bn_per_page: parcelsBnPerPage,
    parcels_bn_page: parcelsBnPage,
    parcels_bn_sort_by: parcelsBnSortBy
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
    parcelsBnPerPage.value = 100
    parcelsBnPage.value = 1
    parcelsBnSortBy.value = [{ key: 'id', order: 'asc' }]
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

  it('resets page to 1 on mount', () => {
    parcelsBnPage.value = 5
    mockItems.value = []
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
    expect(parcelsBnPage.value).toBe(1)
  })

  it('resets page to 1 on mount even when page is within range', () => {
    parcelsBnPerPage.value = 1
    parcelsBnPage.value = 2
    mockItems.value = [
      { id: 1, registerId: 1, registerDealNumber: 'D1', number: 'N1', productName: 'P1', tnVed: 'T1', dTag: 'DT1', dTagComment: 'C1', previousDTagComment: 'PC1' },
      { id: 2, registerId: 2, registerDealNumber: 'D2', number: 'N2', productName: 'P2', tnVed: 'T2', dTag: 'DT2', dTagComment: 'C2', previousDTagComment: 'PC2' }
    ]
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
    expect(parcelsBnPage.value).toBe(1)
  })

  it('uses separate bn settings independent of shared parcels settings', () => {
    parcelsBnPerPage.value = 50
    parcelsBnPage.value = 3
    parcelsBnSortBy.value = [{ key: 'number', order: 'desc' }]

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

    // The bn settings remain at their own values, independent from shared parcels_* settings
    expect(parcelsBnPerPage.value).toBe(50)
    expect(parcelsBnSortBy.value).toEqual([{ key: 'number', order: 'desc' }])
  })

})
