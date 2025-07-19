/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import FeacnCodesList from '@/components/FeacnCodes_List.vue'
import { vuetifyStubs } from './test-utils.js'

const mockOrders = ref([
  { id: 1, title: 'Doc1', url: 'http://a' },
  { id: 2, title: 'Doc2', url: 'http://b' }
])
const mockPrefixes = ref([])
const mockLoading = ref(false)
const mockError = ref(null)
const perPage1 = ref(10)
const search1 = ref('')
const sortBy1 = ref([])
const page1 = ref(1)
const perPage2 = ref(10)
const search2 = ref('')
const sortBy2 = ref([])
const page2 = ref(1)
const mockIsAdmin = ref(false)
const mockAlert = ref(null)

const getOrders = vi.fn()
const getPrefixes = vi.fn()
const update = vi.fn()
const success = vi.fn()
const error = vi.fn()
const clear = vi.fn()

vi.mock('@/stores/feacn.codes.store.js', () => ({
  useFeacnCodesStore: () => ({
    orders: mockOrders,
    prefixes: mockPrefixes,
    loading: mockLoading,
    error: mockError,
    getOrders,
    getPrefixes,
    update
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: mockAlert,
    success,
    error,
    clear
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    feacnorders_per_page: perPage1,
    feacnorders_search: search1,
    feacnorders_sort_by: sortBy1,
    feacnorders_page: page1,
    feacnprefixes_per_page: perPage2,
    feacnprefixes_search: search2,
    feacnprefixes_sort_by: sortBy2,
    feacnprefixes_page: page2,
    isAdmin: mockIsAdmin
  })
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [{ value: 10, title: '10' }]
}))

describe('FeacnCodes_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOrders.value = [
      { id: 1, title: 'Doc1', url: 'http://a' },
      { id: 2, title: 'Doc2', url: 'http://b' }
    ]
    mockLoading.value = false
    mockError.value = null
    mockPrefixes.value = []
    search1.value = ''
    mockIsAdmin.value = false
  })

  it('calls getOrders on mount', () => {
    mount(FeacnCodesList, { global: { stubs: vuetifyStubs } })
    expect(getOrders).toHaveBeenCalled()
  })

  it('updateCodes calls store and alerts on success', async () => {
    update.mockResolvedValue()
    const wrapper = mount(FeacnCodesList, { global: { stubs: vuetifyStubs } })
    await wrapper.vm.updateCodes()
    expect(update).toHaveBeenCalled()
    expect(getOrders).toHaveBeenCalledTimes(2)
  })

  it('shows empty message when no orders', () => {
    mockOrders.value = []
    const wrapper = mount(FeacnCodesList, { global: { stubs: vuetifyStubs } })
    expect(wrapper.text()).toContain('Список документов пуст')
  })

  it('renders admin update button when user is admin', () => {
    mockIsAdmin.value = true
    const wrapper = mount(FeacnCodesList, { global: { stubs: vuetifyStubs } })
    expect(wrapper.text()).toContain('Обновить информацию о кодах')
  })

  it('shows spinner and error message', () => {
    mockLoading.value = true
    mockError.value = 'bad'
    const wrapper = mount(FeacnCodesList, { global: { stubs: vuetifyStubs } })
    expect(wrapper.html()).toContain('spinner-border')
    expect(wrapper.html()).toContain('Ошибка при загрузке информации')
  })

  describe('filterOrders function', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(FeacnCodesList, { global: { stubs: vuetifyStubs } })
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
      wrapper = mount(FeacnCodesList, { global: { stubs: vuetifyStubs } })
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
