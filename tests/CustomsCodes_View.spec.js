/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomsCodesView from '@/views/CustomsCodes_View.vue'
import { defaultGlobalStubs } from './test-utils.js'

const getItems = vi.fn()
const getExceptions = vi.fn()
const parse = vi.fn()

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: (store) => store }
})

vi.mock('@/stores/alta.store.js', () => ({
  useAltaStore: () => ({
    items: [],
    exceptions: [],
    loading: false,
    error: null,
    getItems,
    getExceptions,
    parse
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    customs_codes_per_page: { value: 25 },
    customs_codes_search: { value: '' },
    customs_codes_sort_by: { value: [{ key: 'code', order: 'asc' }] },
    customs_codes_page: { value: 1 }
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    clear: vi.fn()
  })
}))

describe('CustomsCodes_View.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls store methods on mount', () => {
    mount(CustomsCodesView, { global: { stubs: defaultGlobalStubs } })
    expect(getItems).toHaveBeenCalled()
    expect(getExceptions).toHaveBeenCalled()
  })

  it('calls parse when button clicked', async () => {
    const wrapper = mount(CustomsCodesView, { global: { stubs: defaultGlobalStubs } })
    await wrapper.find('.link-crt a').trigger('click')
    expect(parse).toHaveBeenCalled()
  })
})
