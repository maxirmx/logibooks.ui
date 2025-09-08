/* @vitest-environment jsdom */

// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import FeacnInsertItemsList from '@/lists/FeacnInsertItems_List.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

// Hoisted mocks
const getAllItems = vi.hoisted(() => vi.fn())
const removeItem = vi.hoisted(() => vi.fn())
const mockPush = vi.hoisted(() => vi.fn())
const mockConfirm = vi.hoisted(() => vi.fn())
const mockError = vi.hoisted(() => vi.fn())
const mockSuccess = vi.hoisted(() => vi.fn())
const mockLoadTooltip = vi.hoisted(() => vi.fn())

const mockInsertItems = ref([
  { id: 1, code: '1234567890', insBefore: 'before1', insAfter: 'after1' },
  { id: 2, code: '0987654321', insBefore: 'before2', insAfter: 'after2' }
])

// Mock stores and modules
vi.mock('@/stores/feacn.insert.items.store.js', () => ({
  useFeacnInsertItemsStore: () => ({
    insertItems: mockInsertItems,
    loading: ref(false),
    getAll: getAllItems,
    remove: removeItem
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({ 
    isAdmin: ref(true),
    isSrLogist: ref(false),
    isLogist: ref(false),
    isAdminOrSrLogist: ref(true),
    isLogistOrSrLogist: ref(false),
    feacninsertitems_per_page: ref(10),
    feacninsertitems_search: ref(''),
    feacninsertitems_sort_by: ref([]),
    feacninsertitems_page: ref(1)
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: ref(null),
    clear: vi.fn(),
    success: mockSuccess,
    error: mockError
  })
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => mockConfirm
}))

vi.mock('@/router', () => ({
  default: { push: mockPush }
}))

vi.mock('@/helpers/feacn.info.helpers.js', () => ({
  loadFeacnTooltipOnHover: mockLoadTooltip,
  useFeacnTooltips: () => ref({
    '1234567890': { name: 'Test tooltip for 1234567890' },
    '0987654321': { name: 'Test tooltip for 0987654321' }
  })
}))

describe('FeacnInsertItems_List.vue', () => {
  let wrapper

  beforeEach(() => {
    getAllItems.mockClear()
    removeItem.mockClear()
    mockPush.mockClear()
    mockConfirm.mockClear()
    wrapper = mount(FeacnInsertItemsList, {
      global: {
        stubs: vuetifyStubs
      }
    })
  })

  it('fetches items on mount', () => {
    expect(getAllItems).toHaveBeenCalled()
  })

  it('renders heading and items', () => {
    expect(wrapper.text()).toContain('Правила для формирования описания продукта')
    const rows = wrapper.findAll('[data-testid="v-data-table"] .v-data-table-row')
    expect(rows.length).toBe(2)
    expect(rows[0].text()).toContain('1234567890')
  })

  it('navigates to create view on link click', async () => {
    const link = wrapper.find('a.link')
    await link.trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/feacninsertitem/create')
  })

  it('navigates to edit view via function', async () => {
    await wrapper.vm.openEditDialog(mockInsertItems.value[0])
    expect(mockPush).toHaveBeenCalledWith('/feacninsertitem/edit/1')
  })

  it('removes item when confirmed', async () => {
    mockConfirm.mockResolvedValue(true)
    await wrapper.vm.deleteInsertItem(mockInsertItems.value[0])
    expect(removeItem).toHaveBeenCalledWith(1)
  })

  it('does not remove item when cancelled', async () => {
    mockConfirm.mockResolvedValue(false)
    await wrapper.vm.deleteInsertItem(mockInsertItems.value[0])
    expect(removeItem).not.toHaveBeenCalled()
  })

  it('loads FEACN tooltip on hover', async () => {
    const codeCell = wrapper.find('.feacn-code-tooltip')
    await codeCell.trigger('mouseenter')
    expect(mockLoadTooltip).toHaveBeenCalledWith('1234567890')
  })

  describe('Filter Functionality', () => {
    it('filters insert items correctly', () => {
      const filterFn = wrapper.vm.filterInsertItems

      // Test filter by code
      expect(filterFn('123', '123', { raw: { code: '1234567890' } })).toBe(true)
      
      // Test filter by insBefore
      expect(filterFn('before', 'before', { raw: { insBefore: 'before1' } })).toBe(true)
      
      // Test filter by insAfter  
      expect(filterFn('after', 'after', { raw: { insAfter: 'after1' } })).toBe(true)
      
      // Test case insensitive
      expect(filterFn('BEFORE', 'BEFORE', { raw: { insBefore: 'before1' } })).toBe(true)
      
      // Test non-matching filter
      expect(filterFn('xyz', 'xyz', { raw: { code: '1234567890' } })).toBe(false)
      
      // Test null/undefined handling
      expect(filterFn(null, null, { raw: { code: '1234567890' } })).toBe(false)
      expect(filterFn('test', 'test', null)).toBe(false)
      expect(filterFn('test', 'test', { raw: null })).toBe(false)
      
      // Test empty object
      expect(filterFn('test', 'test', { raw: { } })).toBe(false)
    })
  })
})

