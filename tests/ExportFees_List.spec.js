/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ExportFeesList from '@/lists/ExportFees_List.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const mockDuties = ref([
  { id: 1, code: '1000000000', description: 'First duty', duty: 1.25 },
  { id: 2, code: '4401000000', description: null, duty: 12 }
])
const mockLoading = ref(false)
const mockError = ref(null)
const dutiesPerPage = ref(10)
const dutiesSearch = ref('')
const dutiesSortBy = ref([{ key: 'code', order: 'asc' }])
const dutiesPage = ref(1)
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
      if (store.duties) {
        return {
          duties: store.duties,
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
      duties: mockDuties,
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
    exportfees_per_page: dutiesPerPage,
    exportfees_search: dutiesSearch,
    exportfees_sort_by: dutiesSortBy,
    exportfees_page: dutiesPage,
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
    mockDuties.value = [
      { id: 1, code: '1000000000', description: 'First duty', duty: 1.25 },
      { id: 2, code: '4401000000', description: null, duty: 12 }
    ]
    mockLoading.value = false
    mockError.value = null
    mockAlert.value = null
    dutiesSearch.value = ''
    dutiesPage.value = 1
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
            template: '<button data-testid="update-duties-button" :disabled="disabled" :title="tooltipText" @click="$emit(\'click\')"></button>',
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

  it('defines a readonly table with all export duty fields', () => {
    const wrapper = mountList()

    expect(wrapper.vm.headers.map(h => h.key)).toEqual(['code', 'description', 'duty'])
    expect(wrapper.findAll('[data-testid="v-data-table"]').length).toBe(1)
    expect(wrapper.text()).toContain('1000000000')
    expect(wrapper.text()).toContain('First duty')
    expect(wrapper.text()).toContain('1.25')
  })

  it('filterDuties matches id, code, description, and duty', () => {
    const wrapper = mountList()
    const item = { raw: mockDuties.value[0] }
    const f = wrapper.vm.filterDuties

    expect(f(null, '', item)).toBe(true)
    expect(f(null, '1', item)).toBe(true)
    expect(f(null, '100000', item)).toBe(true)
    expect(f(null, 'first', item)).toBe(true)
    expect(f(null, '1.25', item)).toBe(true)
    expect(f(null, 'nomatch', item)).toBe(false)
  })

  it('filterDuties handles null optional fields', () => {
    const wrapper = mountList()
    const item = { raw: mockDuties.value[1] }

    expect(wrapper.vm.filterDuties(null, '4401', item)).toBe(true)
    expect(wrapper.vm.filterDuties(null, 'missing', item)).toBe(false)
  })

  it('sorts duty codes as strings', () => {
    const wrapper = mountList()

    expect(wrapper.vm.compareDutyCodesAsStrings('10', '2')).toBeLessThan(0)
    expect(wrapper.vm.compareDutyCodesAsStrings(10, 2)).toBeLessThan(0)
    expect(wrapper.vm.customKeySort.code).toBe(wrapper.vm.compareDutyCodesAsStrings)
  })

  it('shows empty message when no duties are available', () => {
    mockDuties.value = []

    const wrapper = mountList()

    expect(wrapper.html()).toContain('Отсутствуют данные')
  })

  it('renders update button for senior logist plus users', () => {
    isSrLogistPlus.value = true

    const wrapper = mountList()
    const button = wrapper.find('[data-testid="update-duties-button"]')

    expect(button.exists()).toBe(true)
    expect(button.attributes('title')).toBe('Обновить информацию о пошлинах')
  })

  it('does not render update button for regular users', () => {
    const wrapper = mountList()

    expect(wrapper.find('[data-testid="update-duties-button"]').exists()).toBe(false)
  })

  it('updateDuties calls update and reloads duties', async () => {
    const wrapper = mountList()
    getAll.mockClear()

    await wrapper.vm.updateDuties()

    expect(update).toHaveBeenCalledOnce()
    expect(getAll).toHaveBeenCalledOnce()
  })

  it('updateDuties displays alert when update fails', async () => {
    const err = new Error('bad update')
    update.mockRejectedValueOnce(err)
    const wrapper = mountList()
    getAll.mockClear()

    await wrapper.vm.updateDuties()

    expect(alertError).toHaveBeenCalledWith(err.message)
    expect(getAll).not.toHaveBeenCalled()
  })

  it('updateDuties displays alert when store instance is stale', async () => {
    includeUpdateMethod = false
    const wrapper = mountList()
    getAll.mockClear()

    await wrapper.vm.updateDuties()

    expect(alertError).toHaveBeenCalledWith('Обновите страницу перед загрузкой информации о пошлинах')
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
    mockError.value = new Error('load duties failed')

    mountList()
    await Promise.resolve()

    expect(alertError).toHaveBeenCalledWith('load duties failed')
  })
})
