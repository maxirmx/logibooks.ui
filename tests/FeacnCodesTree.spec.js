// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
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
    mockGetChildren.mockImplementation((id) => {
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

})
