/* @vitest-environment jsdom */

// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import FeacnLocalPrefixesList from '@/lists/FeacnLocalPrefixes_List.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

// Hoisted mocks
const getAllPrefixes = vi.hoisted(() => vi.fn())
const removePrefix = vi.hoisted(() => vi.fn())
const preloadFeacnInfo = vi.hoisted(() => vi.fn())
const loadFeacnTooltipOnHover = vi.hoisted(() => vi.fn())
const mockPush = vi.hoisted(() => vi.fn())
const mockConfirm = vi.hoisted(() => vi.fn())
const mockAlertError = vi.hoisted(() => vi.fn())
const mockAuthStore = vi.hoisted(() => ({
  isAdmin: true,
  isSrLogist: false,
  isLogist: false,
  isSrLogistPlus: true,
  hasLogistRole: false,
  feacnlocalprefixes_search: '',
  feacnlocalprefixes_procedure: 'all',
  feacnlocalprefixes_country: 'all',
  feacnlocalprefixes_per_page: 100,
  feacnlocalprefixes_sort_by: [],
  feacnlocalprefixes_page: 1
}))

const mockPrefixes = ref([
  {
    id: 1,
    code: '0101',
    description: 'd1',
    comment: 'legacy comment',
    scopes: [{ countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'export ban reason' }],
    exceptions: [{ id: 1, code: '111', feacnPrefixId: 1 }]
  },
  {
    id: 2,
    code: '0202',
    description: 'd2',
    scopes: [{ countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'import ban reason' }],
    exceptions: []
  },
  {
    id: 3,
    code: '0303',
    description: 'd3',
    scopes: [
      { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'dual export reason' },
      { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'dual import reason' }
    ],
    exceptions: ['333']
  },
  {
    id: 4,
    code: '0404',
    description: 'd4',
    scopes: [
      { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: null },
      { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'import only dual reason' }
    ],
    exceptions: []
  }
])

const mockFeacnInfo = ref({
  '0101': { name: 'Derived 0101' },
  '0202': { name: 'Derived 0202' },
  '0303': { name: 'Derived 0303' },
  '0404': { name: 'Derived 0404' },
  111: { name: 'Exception 111' },
  333: { name: 'Exception 333' }
})

vi.mock('@/stores/feacn.prefixes.store.js', () => ({
  useFeacnPrefixesStore: () => ({
    prefixes: mockPrefixes,
    loading: ref(false),
    getAll: getAllPrefixes,
    remove: removePrefix
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({
    countries: [
      { isoNumeric: 643, nameRuShort: 'Россия' },
      { isoNumeric: 860, nameRuShort: 'Узбекистан' }
    ],
    ensureLoaded: vi.fn().mockResolvedValue(undefined),
    getCountryShortName: vi.fn((code) => Number(code) === 643 ? 'Россия' : 'Узбекистан')
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: ref(null),
    clear: vi.fn(),
    error: mockAlertError
  })
}))

vi.mock('@/helpers/feacn.info.helpers.js', () => ({
  preloadFeacnInfo,
  loadFeacnTooltipOnHover,
  useFeacnTooltips: () => mockFeacnInfo
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => mockConfirm
}))

vi.mock('@/router', () => ({
  default: { push: mockPush }
}))

describe('FeacnLocalPrefixes_List.vue', () => {
  let wrapper
  const mountList = () =>
    mount(FeacnLocalPrefixesList, {
      global: {
        stubs: {
          ...vuetifyStubs,
          'v-autocomplete': {
            template: '<div class="v-autocomplete-stub"></div>',
            props: ['modelValue', 'items', 'label', 'disabled']
          },
          ActionButton: true
        }
      }
    })

  beforeEach(() => {
    getAllPrefixes.mockClear()
    removePrefix.mockClear()
    preloadFeacnInfo.mockClear()
    loadFeacnTooltipOnHover.mockClear()
    mockPush.mockClear()
    mockConfirm.mockClear()
    mockAlertError.mockClear()
    mockAuthStore.feacnlocalprefixes_search = ''
    mockAuthStore.feacnlocalprefixes_procedure = 'all'
    mockAuthStore.feacnlocalprefixes_country = 'all'
    mockAuthStore.feacnlocalprefixes_page = 1
    mockAuthStore.feacnlocalprefixes_sort_by = []
    wrapper = mountList()
  })

  it('uses requested procedure sort order from import and export flags', () => {
    const combinations = [
      { scopes: [] },
      { scopes: [{ countryIsoNumeric: 643, customsProcedureCode: 10 }] },
      { scopes: [
        { countryIsoNumeric: 643, customsProcedureCode: 10 },
        { countryIsoNumeric: 860, customsProcedureCode: 40 }
      ] },
      { scopes: [{ countryIsoNumeric: 860, customsProcedureCode: 40 }] }
    ]

    expect(combinations.map((item) => wrapper.vm.getProhibitionScopeSortOrder(item))).toEqual([
      '', '643:10', '643:10|860:40', '860:40'
    ])
    expect(wrapper.vm.tablePrefixes.map((item) => item.procedure)).toEqual([
      '643:10', '860:40', '643:10|860:40', '643:10|860:40'
    ])
  })

  it('renders export and import prohibition reasons on separate lines', () => {
    const rows = wrapper.findAll('[data-testid="v-data-table"] .v-data-table-row')
    const reasonCell = rows[2].findAll('.v-data-table-cell')[6]
    const lines = reasonCell.findAll('.reason-line')
    expect(lines.map((line) => line.text())).toEqual(['dual export reason', 'dual import reason'])
  })

  it('keeps import reason aligned with import procedure when export reason is empty', () => {
    const rows = wrapper.findAll('[data-testid="v-data-table"] .v-data-table-row')
    const procedureLines = rows[3].findAll('.v-data-table-cell')[5].findAll('.procedure-line')
    const reasonLines = rows[3].findAll('.v-data-table-cell')[6].findAll('.reason-line')

    expect(procedureLines.map((line) => line.text())).toEqual(['Экспорт', 'Импорт'])
    expect(reasonLines).toHaveLength(2)
    expect(reasonLines[0].text()).toBe('')
    expect(reasonLines[1].text()).toBe('import only dual reason')
  })

  it('does not call loadFeacnTooltipOnHover when hovering code', async () => {
    const codeSpan = wrapper
      .findAll('[data-testid="v-data-table"] .v-data-table-row')[0]
      .findAll('.v-data-table-cell')[1]
      .find('span')
    await codeSpan.trigger('mouseenter')
    expect(loadFeacnTooltipOnHover).not.toHaveBeenCalled()
  })

  it('calls loadFeacnTooltipOnHover for exceptions on hover', async () => {
    const exceptionSpan = wrapper
      .findAll('[data-testid="v-data-table"] .v-data-table-row')[0]
      .findAll('.v-data-table-cell')[3]
      .findAll('.feacn-code-tooltip')[0]
    await exceptionSpan.trigger('mouseenter')
    expect(loadFeacnTooltipOnHover).toHaveBeenCalledWith('111')
  })

  it('navigates to create view when action invoked', async () => {
    await wrapper.vm.openCreateDialog()
    expect(mockPush).toHaveBeenCalledWith('/feacn/prefix/create')
  })

  it('navigates to edit view via function', async () => {
    await wrapper.vm.openEditDialog(mockPrefixes.value[0])
    expect(mockPush).toHaveBeenCalledWith('/feacn/prefix/edit/1')
  })

  it('removes prefix when confirmed', async () => {
    mockConfirm.mockResolvedValue(true)
    await wrapper.vm.deletePrefix(mockPrefixes.value[0])
    expect(removePrefix).toHaveBeenCalledWith(1)
  })

  it('does not remove prefix when cancelled', async () => {
    mockConfirm.mockResolvedValue(false)
    await wrapper.vm.deletePrefix(mockPrefixes.value[0])
    expect(removePrefix).not.toHaveBeenCalled()
  })

  it('shows error when deletion fails after confirmation', async () => {
    mockConfirm.mockResolvedValue(true)
    removePrefix.mockRejectedValueOnce(new Error('remove failed'))
    await wrapper.vm.deletePrefix(mockPrefixes.value[0])
    expect(mockAlertError).toHaveBeenCalledWith('Ошибка при удалении префикса')
  })

  it('getExceptionCode handles string exceptions', () => {
    expect(wrapper.vm.getExceptionCode('123')).toBe('123')
  })

  it('getExceptionCode handles object exceptions', () => {
    const exception = { id: 1, code: '456', feacnPrefixId: 1 }
    expect(wrapper.vm.getExceptionCode(exception)).toBe('456')
  })

  it('getExceptionKey generates keys for string exceptions', () => {
    expect(wrapper.vm.getExceptionKey('123', 0)).toBe('123')
  })

  it('getExceptionKey generates keys for object exceptions', () => {
    const exception = { id: 1, code: '456', feacnPrefixId: 1 }
    expect(wrapper.vm.getExceptionKey(exception, 0)).toBe('1-456')
  })

  it('getExceptionKey handles object exceptions without id', () => {
    const exception = { code: '789', feacnPrefixId: 1 }
    expect(wrapper.vm.getExceptionKey(exception, 2)).toBe('2-789')
  })

  it('filters visible prefixes by selected procedure', async () => {
    expect(wrapper.vm.filteredPrefixes.map((p) => p.code)).toEqual(['0101', '0202', '0303', '0404'])

    wrapper.unmount()
    mockAuthStore.feacnlocalprefixes_procedure = 'export'
    wrapper = mountList()
    expect(wrapper.vm.filteredPrefixes.map((p) => p.code)).toEqual(['0101', '0303', '0404'])

    wrapper.unmount()
    mockAuthStore.feacnlocalprefixes_procedure = 'import'
    wrapper = mountList()
    expect(wrapper.vm.filteredPrefixes.map((p) => p.code)).toEqual(['0202', '0303', '0404'])
  })

  it('renders global procedure selector next to search field', () => {
    const filters = wrapper.find('.prefix-filter-row')
    expect(filters.find('[data-testid="v-text-field"]').exists()).toBe(true)
    expect(filters.find('[data-testid="v-select"]').exists()).toBe(true)
    expect(filters.element.firstElementChild).toBe(filters.find('[data-testid="v-select"]').element)
    expect(wrapper.vm.prohibitionScopeFilterItems).toEqual([
      { title: 'Любая', value: 'all' },
      { title: 'Экспорт', value: 'export' },
      { title: 'Импорт', value: 'import' }
    ])
  })

  it('searches by new DTO fields and translated procedure text', () => {
    const item = { raw: mockPrefixes.value[2] }
    expect(wrapper.vm.filterLocalPrefixes(null, 'dual export', item)).toBe(true)
    expect(wrapper.vm.filterLocalPrefixes(null, 'dual import', item)).toBe(true)
    expect(wrapper.vm.filterLocalPrefixes(null, 'Россия — Экспорт', item)).toBe(true)
    expect(wrapper.vm.filterLocalPrefixes(null, 'Узбекистан — Импорт', item)).toBe(true)
    expect(wrapper.vm.filterLocalPrefixes(null, 'd3', item)).toBe(true)
    expect(wrapper.vm.filterLocalPrefixes(null, 'Exception 333', item)).toBe(true)
    expect(wrapper.vm.filterLocalPrefixes(null, 'not-found', item)).toBe(false)
  })

  it('does not search by hidden legacy comment field', () => {
    const item = { raw: mockPrefixes.value[0] }
    expect(wrapper.vm.filterLocalPrefixes(null, 'legacy comment', item)).toBe(false)
  })

  it('filterLocalPrefixes handles null inputs', () => {
    expect(wrapper.vm.filterLocalPrefixes(null, null, { raw: mockPrefixes.value[0] })).toBe(false)
    expect(wrapper.vm.filterLocalPrefixes(null, '0101', null)).toBe(false)
    expect(wrapper.vm.filterLocalPrefixes(null, '0101', { raw: null })).toBe(false)
  })
})
