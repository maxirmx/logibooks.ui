import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import FeacnCodes_Tree from '@/components/FeacnCodes_Tree.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const mockGetChildren = vi.fn()

vi.mock('@/stores/feacn.codes.store.js', () => ({
  useFeacnCodesStore: () => ({
    getChildren: mockGetChildren
  })
}))

const globalStubs = {
  ...defaultGlobalStubs,
  'font-awesome-icon': true
}

describe('FeacnCodes_Tree.vue', () => {
  const root = { id: 1, code: '01', codeEx: '01', name: 'Root', parentId: null }
  const child = { id: 2, code: '0101', codeEx: '0101', name: 'Child', parentId: 1 }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetChildren.mockImplementation(id => {
      if (id === null || id === undefined) return Promise.resolve([root])
      if (id === 1) return Promise.resolve([child])
      return Promise.resolve([])
    })
  })

  function createWrapper() {
    return mount(FeacnCodes_Tree, {
      global: { stubs: globalStubs }
    })
  }

  // Helper to wait for all async operations and DOM updates
  async function waitForMount(wrapper) {
    await flushPromises() // Wait for store operations
    await wrapper.vm.$nextTick() // Wait for DOM updates
  }

  it('loads root nodes on mount', async () => {
    const wrapper = createWrapper()
    await waitForMount(wrapper)

    expect(mockGetChildren).toHaveBeenCalledWith(null)
    expect(wrapper.text()).toContain('01 : Root')
    const icon = wrapper.find('font-awesome-icon-stub')
    expect(icon.exists()).toBe(true)
    expect(icon.attributes('icon')).toBe('fa-solid fa-plus')
  })

  it('loads children when node expanded', async () => {
    const wrapper = createWrapper()
    await waitForMount(wrapper)

    await wrapper.find('.toggle-icon').trigger('click')
    await flushPromises() // Wait for child loading

    expect(mockGetChildren).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('0101 : Child')
  })

  it('shows minus icon when node expanded', async () => {
    const wrapper = createWrapper()
    await waitForMount(wrapper)

    await wrapper.find('.toggle-icon').trigger('click')
    await flushPromises() // Wait for child loading

    const icon = wrapper.find('font-awesome-icon-stub')
    expect(icon.attributes('icon')).toBe('fa-solid fa-minus')
  })
})

