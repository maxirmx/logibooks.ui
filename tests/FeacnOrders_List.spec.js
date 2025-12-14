/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import FeacnOrdersList from '@/lists/FeacnOrders_List.vue'
import { vuetifyStubs, createMockStore } from './helpers/test-utils.js'


// Mock Pinia's storeToRefs to return the mock values
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: vi.fn((store) => {
      if (store.orders) {
        return { 
          orders: store.orders,
          prefixes: store.prefixes,
          loading: store.loading,
          error: store.error,
          isInitialized: store.isInitialized
        }
      }
      if (store.feacnorders_per_page) {
        return {
          feacnorders_per_page: store.feacnorders_per_page,
          feacnorders_search: store.feacnorders_search,
          feacnorders_sort_by: store.feacnorders_sort_by,
          feacnorders_page: store.feacnorders_page,
          feacnprefixes_per_page: store.feacnprefixes_per_page,
          feacnprefixes_search: store.feacnprefixes_search,
          feacnprefixes_sort_by: store.feacnprefixes_sort_by,
          feacnprefixes_page: store.feacnprefixes_page,
          selectedOrderId: store.selectedOrderId,
          isAdmin: store.isAdmin,
          isSrLogistPlus: store.isSrLogistPlus
        }
      }
      if (store.alert) {
        return { alert: store.alert }
      }
      return {}
    })
  }
})

const mockFeacnOrdersStore = createMockStore({
  orders: ref([
    { id: 1, title: 'Doc1', url: 'http://a' },
    { id: 2, title: 'Doc2', url: 'http://b' }
  ]),
  prefixes: ref([]),
  loading: ref(false),
  error: ref(null),
  isInitialized: ref(true),
  getOrders: vi.fn(),
  getPrefixes: vi.fn(),
  update: vi.fn(),
  ensureLoaded: vi.fn(),
  enable: vi.fn().mockResolvedValue(),
  disable: vi.fn().mockResolvedValue()
})

const mockAlertStore = createMockStore({
  alert: ref(null),
  loading: false,
  error: null,
  success: vi.fn(),
  clear: vi.fn()
})

const mockAuthStore = createMockStore({
  feacnorders_per_page: ref(10),
  feacnorders_search: ref(''),
  feacnorders_sort_by: ref([]),
  feacnorders_page: ref(1),
  feacnprefixes_per_page: ref(10),
  feacnprefixes_search: ref(''),
  feacnprefixes_sort_by: ref([]),
  feacnprefixes_page: ref(1),
  selectedOrderId: ref(null),
  isAdmin: ref(false),
  isSrLogist: ref(false),
  isLogist: ref(false),
  isSrLogistPlus: ref(false),
  hasLogistRole: ref(false)
})

vi.mock('@/stores/feacn.orders.store.js', () => ({
  useFeacnOrdersStore: vi.fn(() => mockFeacnOrdersStore)
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: vi.fn(() => mockAlertStore)
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: vi.fn(() => mockAuthStore)
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [{ value: 10, title: '10' }]
}))

const mountOptions = {
  global: {
    stubs: {
      ...vuetifyStubs,
      ActionButton: {
        template: '<button @click="$emit(\'click\')"><slot></slot></button>',
        props: ['item', 'icon', 'tooltipText', 'disabled', 'iconSize']
      }
    }
  }
}

describe('FeacnOrders_List.vue', () => {
  beforeEach(() => {
    // Create and set a new pinia instance before each test
    setActivePinia(createPinia())
    
    vi.clearAllMocks()
    mockFeacnOrdersStore.orders.value = [
      { id: 1, title: 'Doc1', url: 'http://a' },
      { id: 2, title: 'Doc2', url: 'http://b' }
    ]
    mockFeacnOrdersStore.loading.value = false
    mockFeacnOrdersStore.error.value = null
    mockFeacnOrdersStore.prefixes.value = []
    mockAuthStore.feacnorders_search.value = ''
    mockAuthStore.isAdmin.value = false
  })

  it('calls ensureLoaded on mount', () => {
    mount(FeacnOrdersList, mountOptions)
    expect(mockFeacnOrdersStore.ensureLoaded).toHaveBeenCalled()
  })

  it('updateCodes calls store update', async () => {
    mockFeacnOrdersStore.update.mockResolvedValue()
    const wrapper = mount(FeacnOrdersList, mountOptions)
    await wrapper.vm.updateCodes()
    expect(mockFeacnOrdersStore.update).toHaveBeenCalled()
  })

  it('always renders data tables even when empty', () => {
    mockFeacnOrdersStore.orders.value = []
    const wrapper = mount(FeacnOrdersList, mountOptions)
    expect(wrapper.find('.header-with-actions').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="v-data-table"]').length).toBe(2)
  })

  it('renders admin update button when user is admin', () => {
    mockAuthStore.isAdmin.value = true
    mockAuthStore.isSrLogistPlus.value = true
    const wrapper = mount(FeacnOrdersList, mountOptions)
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
  })

  it('shows spinner in header when loading', () => {
    mockFeacnOrdersStore.loading.value = true
    const wrapper = mount(FeacnOrdersList, mountOptions)
    expect(wrapper.find('.header-actions .spinner-border').exists()).toBe(true)
  })

  describe('filterOrders function', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(FeacnOrdersList, mountOptions)
    })

    it('returns true when no query is provided', () => {
      const result = wrapper.vm.filterOrders(null, '', { raw: { title: 'Test', url: 'http://test.com' } })
      expect(result).toBe(true)
    })

    it('returns true when query is null', () => {
      const result = wrapper.vm.filterOrders(null, null, { raw: { title: 'Test', url: 'http://test.com' } })
      expect(result).toBe(true)
    })

    it('filters by title case-insensitive', () => {
      const item = { raw: { title: 'Test Document', url: 'http://test.com' } }
      
      expect(wrapper.vm.filterOrders(null, 'test', item)).toBe(true)
      expect(wrapper.vm.filterOrders(null, 'TEST', item)).toBe(true)
      expect(wrapper.vm.filterOrders(null, 'document', item)).toBe(true)
      expect(wrapper.vm.filterOrders(null, 'xyz', item)).toBe(false)
    })

    it('filters by url case-insensitive', () => {
      const item = { raw: { title: 'Test Document', url: 'http://example.com' } }
      
      expect(wrapper.vm.filterOrders(null, 'example', item)).toBe(true)
      expect(wrapper.vm.filterOrders(null, 'EXAMPLE', item)).toBe(true)
      expect(wrapper.vm.filterOrders(null, 'http', item)).toBe(true)
      expect(wrapper.vm.filterOrders(null, 'xyz', item)).toBe(false)
    })

    it('handles missing url field', () => {
      const item = { raw: { title: 'Test Document' } }
      
      expect(wrapper.vm.filterOrders(null, 'test', item)).toBe(true)
      expect(wrapper.vm.filterOrders(null, 'xyz', item)).toBe(false)
    })

    it('handles null url field', () => {
      const item = { raw: { title: 'Test Document', url: null } }
      
      expect(wrapper.vm.filterOrders(null, 'test', item)).toBe(true)
      expect(wrapper.vm.filterOrders(null, 'xyz', item)).toBe(false)
    })
  })

  describe('filterPrefixes function', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(FeacnOrdersList, mountOptions)
    })

    it('returns true when no query is provided', () => {
      const result = wrapper.vm.filterPrefixes(null, '', { 
        raw: { code: '1234', description: 'Test desc', comment: 'Test comment', exceptions: 'exc1,exc2' } 
      })
      expect(result).toBe(true)
    })

    it('returns true when query is null', () => {
      const result = wrapper.vm.filterPrefixes(null, null, { 
        raw: { code: '1234', description: 'Test desc', comment: 'Test comment', exceptions: 'exc1,exc2' } 
      })
      expect(result).toBe(true)
    })

    it('filters by code case-insensitive', () => {
      const item = { raw: { code: '1234.56', description: 'Test', comment: 'Test', exceptions: 'Test' } }
      
      expect(wrapper.vm.filterPrefixes(null, '1234', item)).toBe(true)
      expect(wrapper.vm.filterPrefixes(null, '56', item)).toBe(true)
      expect(wrapper.vm.filterPrefixes(null, '9999', item)).toBe(false)
    })

    it('filters by description case-insensitive', () => {
      const item = { raw: { code: '1234', description: 'Test Description', comment: 'Test', exceptions: 'Test' } }
      
      expect(wrapper.vm.filterPrefixes(null, 'description', item)).toBe(true)
      expect(wrapper.vm.filterPrefixes(null, 'DESCRIPTION', item)).toBe(true)
      expect(wrapper.vm.filterPrefixes(null, 'test', item)).toBe(true)
      expect(wrapper.vm.filterPrefixes(null, 'xyz', item)).toBe(false)
    })

    it('filters by comment case-insensitive', () => {
      const item = { raw: { code: '1234', description: 'Test', comment: 'Important Comment', exceptions: 'Test' } }
      
      expect(wrapper.vm.filterPrefixes(null, 'important', item)).toBe(true)
      expect(wrapper.vm.filterPrefixes(null, 'COMMENT', item)).toBe(true)
      expect(wrapper.vm.filterPrefixes(null, 'xyz', item)).toBe(false)
    })

    it('filters by exceptions case-insensitive', () => {
      const item = { raw: { code: '1234', description: 'Test', comment: 'Test', exceptions: 'Exception List' } }
      
      expect(wrapper.vm.filterPrefixes(null, 'exception', item)).toBe(true)
      expect(wrapper.vm.filterPrefixes(null, 'LIST', item)).toBe(true)
      expect(wrapper.vm.filterPrefixes(null, 'xyz', item)).toBe(false)
    })

    it('handles missing optional fields', () => {
      const item = { raw: { code: '1234' } }
      
      expect(wrapper.vm.filterPrefixes(null, '1234', item)).toBe(true)
      expect(wrapper.vm.filterPrefixes(null, 'xyz', item)).toBe(false)
    })

    it('handles null optional fields', () => {
      const item = { raw: { code: '1234', description: null, comment: null, exceptions: null } }
      
      expect(wrapper.vm.filterPrefixes(null, '1234', item)).toBe(true)
      expect(wrapper.vm.filterPrefixes(null, 'xyz', item)).toBe(false)
    })

    it('matches across multiple fields', () => {
      const item = { raw: { 
        code: '1234', 
        description: 'Leather goods', 
        comment: 'Special handling', 
        exceptions: 'Children items' 
      } }
      
      // Should match any of the fields
      expect(wrapper.vm.filterPrefixes(null, '1234', item)).toBe(true)      // code
      expect(wrapper.vm.filterPrefixes(null, 'leather', item)).toBe(true)   // description
      expect(wrapper.vm.filterPrefixes(null, 'special', item)).toBe(true)   // comment
      expect(wrapper.vm.filterPrefixes(null, 'children', item)).toBe(true)  // exceptions
      expect(wrapper.vm.filterPrefixes(null, 'notfound', item)).toBe(false) // no match
    })
  })
})

