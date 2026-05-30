/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ExportDutiesList from '@/lists/ExportDuties_List.vue'
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

const getAll = vi.fn()

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

      return {
        exportduties_per_page: store.exportduties_per_page,
        exportduties_search: store.exportduties_search,
        exportduties_sort_by: store.exportduties_sort_by,
        exportduties_page: store.exportduties_page
      }
    })
  }
})

vi.mock('@/stores/export.duties.store.js', () => ({
  useExportDutiesStore: () => ({
    duties: mockDuties,
    loading: mockLoading,
    error: mockError,
    getAll
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    exportduties_per_page: dutiesPerPage,
    exportduties_search: dutiesSearch,
    exportduties_sort_by: dutiesSortBy,
    exportduties_page: dutiesPage
  })
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [{ value: 10, title: '10' }]
}))

describe('ExportDuties_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDuties.value = [
      { id: 1, code: '1000000000', description: 'First duty', duty: 1.25 },
      { id: 2, code: '4401000000', description: null, duty: 12 }
    ]
    mockLoading.value = false
    mockError.value = null
    dutiesSearch.value = ''
    dutiesPage.value = 1
  })

  function mountList() {
    return mount(ExportDutiesList, {
      global: { stubs: vuetifyStubs }
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

  it('shows empty message when no duties are available', () => {
    mockDuties.value = []

    const wrapper = mountList()

    expect(wrapper.html()).toContain('Отсутствуют данные')
  })

  it('shows spinner and error message', () => {
    mockLoading.value = true
    mockError.value = 'bad'

    const wrapper = mountList()

    expect(wrapper.html()).toContain('spinner-border')
    expect(wrapper.html()).toContain('Ошибка при загрузке информации')
  })
})
