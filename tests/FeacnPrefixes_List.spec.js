/* @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import FeacnPrefixesList from '@/components/FeacnPrefixes_List.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

// Hoisted mocks
const getAllPrefixes = vi.hoisted(() => vi.fn())
const removePrefix = vi.hoisted(() => vi.fn())
const preloadFeacnInfo = vi.hoisted(() => vi.fn())
const loadFeacnTooltipOnHover = vi.hoisted(() => vi.fn())
const mockPush = vi.hoisted(() => vi.fn())
const mockConfirm = vi.hoisted(() => vi.fn())

const mockPrefixes = ref([
  { 
    id: 1, 
    code: '0101', 
    description: 'd1', 
    exceptions: [{ id: 1, code: '111', feacnPrefixId: 1 }] 
  },
  { 
    id: 2, 
    code: '0202', 
    description: 'd2', 
    exceptions: []
  }
])

const mockFeacnInfo = ref({
  '0101': { name: 'Derived 0101' },
  '0202': { name: 'Derived 0202' },
  '111': { name: 'Exception 111' }
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
  useAuthStore: () => ({ isAdmin: ref(true) })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: ref(null),
    clear: vi.fn(),
    error: vi.fn()
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

describe('FeacnPrefixes_List.vue', () => {
  let wrapper

  beforeEach(() => {
    getAllPrefixes.mockClear()
    removePrefix.mockClear()
    preloadFeacnInfo.mockClear()
    loadFeacnTooltipOnHover.mockClear()
    mockPush.mockClear()
    mockConfirm.mockClear()
    wrapper = mount(FeacnPrefixesList, { global: { stubs: vuetifyStubs } })
  })

  it('fetches prefixes and preloads FEACN info on mount', () => {
    expect(getAllPrefixes).toHaveBeenCalled()
    expect(preloadFeacnInfo).toHaveBeenCalledWith(['0101', '0202', '111'])
  })

  it('renders prefixes using derived description', () => {
    const rows = wrapper.findAll('[data-testid="v-data-table"] .v-data-table-row')
    expect(rows.length).toBe(2)
    const firstRowCells = rows[0].findAll('.v-data-table-cell')
    expect(firstRowCells[2].text()).toBe('Derived 0101')
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

  it('navigates to create view on link click', async () => {
    const link = wrapper.find('a.link')
    await link.trigger('click')
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
})
