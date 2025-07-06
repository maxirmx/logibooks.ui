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
    getItems,
    getExceptions,
    parse
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
