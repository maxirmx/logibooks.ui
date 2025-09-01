/* @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import FeacnPrefixesList from '@/components/FeacnPrefixes_List.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

// Hoisted mocks
const getAllPrefixes = vi.hoisted(() => vi.fn())
const preloadFeacnInfo = vi.hoisted(() => vi.fn())
const loadFeacnTooltipOnHover = vi.hoisted(() => vi.fn())

const mockPrefixes = ref([
  { id: 1, code: '0101', description: 'd1', exceptions: ['111'] },
  { id: 2, code: '0202', description: 'd2', exceptions: [] }
])

const mockFeacnInfo = ref({
  '0101': { name: 'Derived 0101' },
  '0202': { name: 'Derived 0202' },
  '111': { name: 'Exception 111' }
})

vi.mock('@/stores/feacn.prefix.store.js', () => ({
  useFeacnPrefixesStore: () => ({
    prefixes: mockPrefixes,
    loading: ref(false),
    getAll: getAllPrefixes
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({ isAdmin: ref(true) })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: ref(null),
    clear: vi.fn()
  })
}))

vi.mock('@/helpers/feacn.info.helpers.js', () => ({
  preloadFeacnInfo,
  loadFeacnTooltipOnHover,
  useFeacnTooltips: () => mockFeacnInfo
}))

describe('FeacnPrefixes_List.vue', () => {
  let wrapper

  beforeEach(() => {
    getAllPrefixes.mockClear()
    preloadFeacnInfo.mockClear()
    loadFeacnTooltipOnHover.mockClear()
    wrapper = mount(FeacnPrefixesList, { global: { stubs: vuetifyStubs } })
  })

  it('fetches prefixes and preloads FEACN info on mount', () => {
    expect(getAllPrefixes).toHaveBeenCalled()
    expect(preloadFeacnInfo).toHaveBeenCalledWith(['0101', '0202'])
  })

  it('renders prefixes using derived description', () => {
    const rows = wrapper.findAll('[data-testid="v-data-table"] .v-data-table-row')
    expect(rows.length).toBe(2)
    const firstRowCells = rows[0].findAll('.v-data-table-cell')
    expect(firstRowCells[2].text()).toBe('Derived 0101')
  })

  it('calls loadFeacnTooltipOnHover for exceptions on hover', async () => {
    const exceptionSpan = wrapper
      .findAll('[data-testid="v-data-table"] .v-data-table-row')[0]
      .findAll('.v-data-table-cell')[3]
      .findAll('.feacn-code-tooltip')[0]
    await exceptionSpan.trigger('mouseenter')
    expect(loadFeacnTooltipOnHover).toHaveBeenCalledWith('111')
  })

  it('provides stub action handlers', () => {
    expect(typeof wrapper.vm.openCreateDialog).toBe('function')
    expect(typeof wrapper.vm.openEditDialog).toBe('function')
    expect(typeof wrapper.vm.deletePrefix).toBe('function')

    const firstRowButtons = wrapper
      .findAll('[data-testid="v-data-table"] .v-data-table-row')[0]
      .findAll('.anti-btn')
    expect(firstRowButtons.length).toBe(2)
  })
})

