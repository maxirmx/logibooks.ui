/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ExportFeesList from '@/lists/ExportFees_List.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const mockFees = ref([
  { id: 1, code: '1000000000', description: 'First fee', fee: 1.25 },
  { id: 2, code: '4401000000', description: null, fee: 12 }
])
const mockLoading = ref(false)
const mockError = ref(null)
const feesPerPage = ref(10)
const feesSearch = ref('')
const feesSortBy = ref([{ key: 'code', order: 'asc' }])
const feesPage = ref(1)
const isSrLogistPlus = ref(false)
const mockAlert = ref(null)
let includeUpdateMethod = true

const getAll = vi.fn()
const update = vi.fn()
const alertError = vi.fn()
const alertClear = vi.fn()

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: vi.fn((store) => {
      if (store.fees) {
        return {
          fees: store.fees,
          loading: store.loading,
          error: store.error
        }
      }
      if (store.alert) {
        return {
          alert: store.alert
        }
      }

      return {
        exportfees_per_page: store.exportfees_per_page,
        exportfees_search: store.exportfees_search,
        exportfees_sort_by: store.exportfees_sort_by,
        exportfees_page: store.exportfees_page,
        isSrLogistPlus: store.isSrLogistPlus
      }
    })
  }
})

vi.mock('@/stores/export.fees.store.js', () => ({
  useExportFeesStore: () => {
    const store = {
      fees: mockFees,
      loading: mockLoading,
      error: mockError,
      getAll
    }
    if (includeUpdateMethod) {
      store.update = update
    }
    return store
  }
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    exportfees_per_page: feesPerPage,
    exportfees_search: feesSearch,
    exportfees_sort_by: feesSortBy,
    exportfees_page: feesPage,
    isSrLogistPlus
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: mockAlert,
    error: alertError,
    clear: alertClear
  })
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [{ value: 10, title: '10' }]
}))

describe('ExportFees_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFees.value = [
      { id: 1, code: '1000000000', description: 'First fee', fee: 1.25 },
      { id: 2, code: '4401000000', description: null, fee: 12 }
    ]
    mockLoading.value = false
    mockError.value = null
    mockAlert.value = null
    feesSearch.value = ''
    feesPage.value = 1
    isSrLogistPlus.value = false
    includeUpdateMethod = true
    update.mockResolvedValue()
  })

  function mountList() {
    return mount(ExportFeesList, {
      global: {
        stubs: {
          ...vuetifyStubs,
          ActionButton: {
            name: 'ActionButton',
            template: '<button data-testid="update-fees-button" :disabled="disabled" :title="tooltipText" @click="$emit(\'click\')"></button>',
            props: ['item', 'icon', 'tooltipText', 'disabled', 'iconSize'],
            emits: ['click']
          }
        }
      }
    })
  }

  it('calls getAll on mount', () => {
    mountList()

    expect(getAll).toHaveBeenCalledOnce()
  })

  it('defines a readonly table with all export fee fields', () => {
    const wrapper = mountList()

    expect(wrapper.vm.headers.map(h => h.key)).toEqual(['code', 'description', 'fee'])
    expect(wrapper.vm.headers.find(h => h.key === 'fee').title).toBe('Сбор, руб.')
    expect(wrapper.find('.primary-heading').text()).toBe('Сборы')
    expect(wrapper.findAll('[data-testid="v-data-table"]').length).toBe(1)
    expect(wrapper.text()).toContain('1000000000')
    expect(wrapper.text()).toContain('First fee')
    expect(wrapper.text()).toContain('1.25')
  })

  it('filterFees matches id, code, description, and fee', () => {
    const wrapper = mountList()
    const item = { raw: mockFees.value[0] }
    const f = wrapper.vm.filterFees

    expect(f(null, '', item)).toBe(true)
    expect(f(null, '1', item)).toBe(true)
    expect(f(null, '100000', item)).toBe(true)
    expect(f(null, 'first', item)).toBe(true)
    expect(f(null, '1.25', item)).toBe(true)
    expect(f(null, 'nomatch', item)).toBe(false)
  })

  it('filterFees handles null optional fields', () => {
    const wrapper = mountList()
    const item = { raw: mockFees.value[1] }

    expect(wrapper.vm.filterFees(null, '4401', item)).toBe(true)
    expect(wrapper.vm.filterFees(null, 'missing', item)).toBe(false)
  })

  it('sorts fee codes as strings', () => {
    const wrapper = mountList()

    expect(wrapper.vm.compareFeeCodesAsStrings('10', '2')).toBeLessThan(0)
    expect(wrapper.vm.compareFeeCodesAsStrings(10, 2)).toBeLessThan(0)
    expect(wrapper.vm.customKeySort.code).toBe(wrapper.vm.compareFeeCodesAsStrings)
  })

  it('shows empty message when no fees are available', () => {
    mockFees.value = []

    const wrapper = mountList()

    expect(wrapper.html()).toContain('Отсутствуют данные')
  })

  it('renders update button for senior logist plus users', () => {
    isSrLogistPlus.value = true

    const wrapper = mountList()
    const button = wrapper.find('[data-testid="update-fees-button"]')

    expect(button.exists()).toBe(true)
    expect(button.attributes('title')).toBe('Обновить информацию о сборах')
  })

  it('does not render update button for regular users', () => {
    const wrapper = mountList()

    expect(wrapper.find('[data-testid="update-fees-button"]').exists()).toBe(false)
  })

  it('updateFees calls update and reloads fees', async () => {
    const wrapper = mountList()
    getAll.mockClear()

    await wrapper.vm.updateFees()

    expect(update).toHaveBeenCalledOnce()
    expect(getAll).toHaveBeenCalledOnce()
  })

  it('updateFees displays alert when update fails', async () => {
    const err = new Error('bad update')
    update.mockRejectedValueOnce(err)
    const wrapper = mountList()
    getAll.mockClear()

    await wrapper.vm.updateFees()

    expect(alertError).toHaveBeenCalledWith(err.message)
    expect(getAll).not.toHaveBeenCalled()
  })

  it('updateFees displays alert when store instance is stale', async () => {
    includeUpdateMethod = false
    const wrapper = mountList()
    getAll.mockClear()

    await wrapper.vm.updateFees()

    expect(alertError).toHaveBeenCalledWith('Обновите страницу перед загрузкой информации о сборах')
    expect(getAll).not.toHaveBeenCalled()
  })

  it('shows spinner and reports store error through alertStore', async () => {
    mockLoading.value = true
    mockError.value = 'bad'

    const wrapper = mountList()
    await Promise.resolve()

    expect(wrapper.html()).toContain('spinner-border')
    expect(wrapper.html()).not.toContain('Ошибка при загрузке информации')
    expect(alertError).toHaveBeenCalledWith('bad')
  })

  it('reports Error object store error as message string through alertStore', async () => {
    mockError.value = new Error('load fees failed')

    mountList()
    await Promise.resolve()

    expect(alertError).toHaveBeenCalledWith('load fees failed')
  })
})
