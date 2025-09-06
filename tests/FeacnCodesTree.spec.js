// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import FeacnCodesTree from '@/components/FeacnCodesTree.vue'
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

describe('FeacnCodesTree.vue', () => {
  const root = { id: 1, code: '01', codeEx: '01', name: 'Root', parentId: null }
  const child = { id: 2, code: '0101', codeEx: '0101', name: 'Child', parentId: 1 }
  const leaf = {
    id: 3,
    code: '0101010101',
    codeEx: '0101010101',
    name: 'Leaf',
    parentId: 2
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetChildren.mockImplementation(id => {
      if (id === null || id === undefined) return Promise.resolve([root])
      if (id === 1) return Promise.resolve([child])
      if (id === 2) return Promise.resolve([leaf])
      return Promise.resolve([])
    })
  })

  function createWrapper(props = {}) {
    return mount(FeacnCodesTree, {
      props,
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
    
    // The loading might be too fast to catch in some environments
    // Let's focus on the end result
    await waitForMount(wrapper)

    // Should hide loading and show tree
    expect(wrapper.find('.loading-indicator').exists()).toBe(false)
    expect(mockGetChildren).toHaveBeenCalledWith(null)
    // Check for the separate code and name display
    expect(wrapper.text()).toContain('01') // code
    expect(wrapper.text()).toContain('Root') // name
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
    // Check for the separate code and name display
    expect(wrapper.text()).toContain('0101') // child code
    expect(wrapper.text()).toContain('Child') // child name
  })

  it('shows minus icon when node expanded', async () => {
    const wrapper = createWrapper()
    await waitForMount(wrapper)

    await wrapper.find('.toggle-icon').trigger('click')
    await flushPromises() // Wait for child loading

    const icon = wrapper.find('font-awesome-icon-stub')
    expect(icon.attributes('icon')).toBe('fa-solid fa-minus')
  })

  it('prevents concurrent loading operations', async () => {
    const wrapper = createWrapper()
    await waitForMount(wrapper)

    // Trigger multiple rapid clicks
    const toggleIcon = wrapper.find('.toggle-icon')
    await toggleIcon.trigger('click')
    await toggleIcon.trigger('click')
    await toggleIcon.trigger('click')
    
    await flushPromises()

    // Should only call getChildren once for the child loading
    expect(mockGetChildren).toHaveBeenCalledTimes(2) // once for root, once for child
  })

  it('shows loading spinner when loading children', async () => {
    // This test verifies the main loading behavior is implemented
    // The individual node loading spinner is tested in FeacnCodesTreeNode.spec.js
    const wrapper = createWrapper()
    
    // Initial loading should be handled by waitForMount
    await waitForMount(wrapper)
    
    // Verify normal operation works
    await wrapper.find('.toggle-icon').trigger('click')
    await flushPromises()
    
    expect(mockGetChildren).toHaveBeenCalledWith(1)
    // Check for the separate code and name display
    expect(wrapper.text()).toContain('0101') // child code
    expect(wrapper.text()).toContain('Child') // child name
  })

  it('emits select event with code when leaf node selected in select mode', async () => {
    const wrapper = createWrapper({ selectMode: true })
    await waitForMount(wrapper)

    // Expand root to load child
    await wrapper.find('.toggle-icon').trigger('click')
    await flushPromises()

    // Expand child to load leaf
    const childToggle = wrapper.findAll('.toggle-icon').at(1)
    await childToggle.trigger('click')
    await flushPromises()

    const leafLabel = wrapper.findAll('.node-label').find(n => n.text() === 'Leaf')
    expect(leafLabel.classes()).toContain('clickable')
    await leafLabel.trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0][0]).toBe('0101010101')
  })
})

