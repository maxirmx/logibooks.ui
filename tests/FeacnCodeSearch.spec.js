// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
const mockFormatFeacnName = vi.hoisted(() => vi.fn())
const mockFormatFeacnNameFromItem = vi.hoisted(() => vi.fn())
vi.mock('@/helpers/feacn.info.helpers.js', () => ({
  formatFeacnName: mockFormatFeacnName,
  formatFeacnNameFromItem: mockFormatFeacnNameFromItem
}))
import FeacnCodeSearch from '@/components/FeacnCodeSearch.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const mockLookup = vi.fn()
const mockGetById = vi.fn()
const mockGetChildren = vi.fn()

vi.mock('@/stores/feacn.codes.store.js', () => ({
  useFeacnCodesStore: () => ({
    lookup: mockLookup,
    getById: mockGetById,
    getChildren: mockGetChildren
  })
}))

const globalStubs = {
  ...defaultGlobalStubs,
  'font-awesome-icon': true
}

function createWrapper() {
  return mount(FeacnCodeSearch, {
    global: { stubs: globalStubs }
  })
}

async function waitForUpdates(wrapper) {
  await flushPromises()
  await wrapper.vm.$nextTick()
}

describe('FeacnCodeSearch.vue', () => {
  const root = { id: 1, code: '01', codeEx: '01', name: 'Root', parentId: null }
  const child = { id: 2, code: '0101', codeEx: '0101', name: 'Child', parentId: 1 }
  const leaf = { id: 3, code: '0101010101', codeEx: '0101010101', name: 'Leaf', parentId: 2 }

  beforeEach(() => {
    vi.clearAllMocks()
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
    mockLookup.mockResolvedValue([])
    mockGetById.mockImplementation((id) => {
      if (id === 3) return Promise.resolve(leaf)
      if (id === 2) return Promise.resolve(child)
      if (id === 1) return Promise.resolve(root)
      return Promise.resolve(null)
    })
    mockGetChildren.mockImplementation((id) => {
      if (id === null || id === undefined) return Promise.resolve([root])
      if (id === 1) return Promise.resolve([child])
      if (id === 2) return Promise.resolve([leaf])
      return Promise.resolve([])
    })
    mockFormatFeacnName.mockImplementation((code) =>
      Promise.resolve({ name: `Name ${code}`, found: true })
    )
    mockFormatFeacnNameFromItem.mockImplementation((item) => `Name ${item?.code || ''}`)
  })

  it('re-emits select event from tree', async () => {
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    await wrapper.find('.toggle-icon').trigger('click')
    await waitForUpdates(wrapper)
    const childToggle = wrapper.findAll('.toggle-icon').at(1)
    await childToggle.trigger('click')
    await waitForUpdates(wrapper)

    const leafLabel = wrapper.findAll('.node-label').find((n) => n.text() === 'Leaf')
    await leafLabel.trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0][0]).toBe('0101010101')
  })

  it('has placeholder text', () => {
    const wrapper = createWrapper()
    const input = wrapper.find('.search-input')
    expect(input.attributes('placeholder')).toBe('Код ТН ВЭД или слово для поиска')
  })

  it('uses formatFeacnNameFromItem for search results', async () => {
    mockLookup.mockResolvedValueOnce([{ id: 1, code: '0101' }])
    mockFormatFeacnNameFromItem.mockReturnValueOnce('Formatted Name')

    const wrapper = createWrapper()
    await waitForUpdates(wrapper)
    const input = wrapper.find('.search-input')
    await input.setValue('test')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    expect(mockFormatFeacnNameFromItem).toHaveBeenCalledWith({ id: 1, code: '0101' })
    expect(wrapper.find('.result-name').text()).toBe('Formatted Name')
  })

  it('searches and opens path from non-leaf result', async () => {
    mockLookup.mockResolvedValueOnce([{ id: 2, code: '0101', name: 'Child' }])
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    const input = wrapper.find('.search-input')
    await input.setValue('child')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    expect(searchButton.exists()).toBe(true)
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    expect(mockLookup).toHaveBeenCalledWith('child')
    const resultItem = wrapper.find('.search-result-item')
    expect(resultItem.exists()).toBe(true)

    await resultItem.trigger('click')
    await waitForUpdates(wrapper)

    expect(mockGetById).toHaveBeenCalledWith(2)
    expect(mockGetById).toHaveBeenCalledWith(1)
    expect(wrapper.find('.search-results').exists()).toBe(false)
    expect(wrapper.findAll('.node-label').some((node) => node.text() === 'Leaf')).toBe(true)
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('navigates to a complete TN VED search result without selecting it', async () => {
    mockLookup.mockResolvedValueOnce([{ id: 3, code: leaf.code, name: 'Leaf' }])
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    await wrapper.find('.search-input').setValue(leaf.code)
    await wrapper.findComponent({ name: 'ActionButton' }).find('button').trigger('click')
    await waitForUpdates(wrapper)
    await wrapper.find('.search-result-item').trigger('mouseenter')
    await waitForUpdates(wrapper)
    expect(wrapper.find('.search-result-item').classes()).not.toContain('unavailable')
    await wrapper.find('.search-result-item').trigger('click')
    await waitForUpdates(wrapper)

    expect(mockGetById).toHaveBeenCalledWith(3)
    expect(mockGetById.mock.calls.filter(([id]) => id === 3)).toHaveLength(1)
    expect(mockGetById).toHaveBeenCalledWith(2)
    expect(mockGetById).toHaveBeenCalledWith(1)
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.find('.search-results').exists()).toBe(false)
    expect(wrapper.findAll('.node-label').some((node) => node.text() === 'Leaf')).toBe(true)
  })

  it('navigates by result ID even when its displayed code differs from the tree node', async () => {
    mockLookup.mockResolvedValueOnce([{ id: 3, code: '84A350', name: 'Result' }])
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    await wrapper.find('.search-input').setValue('result')
    await wrapper.findComponent({ name: 'ActionButton' }).find('button').trigger('click')
    await waitForUpdates(wrapper)
    await wrapper.find('.search-result-item').trigger('click')
    await waitForUpdates(wrapper)

    expect(mockGetById).toHaveBeenCalledWith(3)
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.find('.search-results').exists()).toBe(false)
    expect(wrapper.findAll('.node-label').some((node) => node.text() === 'Leaf')).toBe(true)
  })

  it('closes dropdown on Escape key', async () => {
    mockLookup.mockResolvedValueOnce([{ id: 2, code: '0101', name: 'Child' }])
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    const input = wrapper.find('.search-input')
    await input.setValue('child')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)
    expect(wrapper.find('.search-results').exists()).toBe(true)

    // Trigger the Escape key event
    await input.trigger('keydown.esc')
    await nextTick()

    expect(wrapper.find('.search-results').exists()).toBe(false)
  })

  it('closes dropdown when search input clicked', async () => {
    mockLookup.mockResolvedValueOnce([{ id: 2, code: '0101', name: 'Child' }])
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    const input = wrapper.find('.search-input')
    await input.setValue('child')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)
    expect(wrapper.find('.search-results').exists()).toBe(true)

    // Trigger a click on the input
    await input.trigger('click')
    await nextTick()

    expect(wrapper.find('.search-results').exists()).toBe(false)
  })

  it('shows message when lookup returns no results', async () => {
    mockLookup.mockResolvedValueOnce([])
    const wrapper = createWrapper()

    const input = wrapper.find('.search-input')
    await input.setValue('none')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    expect(searchButton.exists()).toBe(true)
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    expect(wrapper.find('.no-results').exists()).toBe(true)
  })

  it('shows error message when lookup fails', async () => {
    mockLookup.mockRejectedValueOnce(new Error('fail'))
    const wrapper = createWrapper()

    const input = wrapper.find('.search-input')
    await input.setValue('err')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    expect(wrapper.find('.search-error').exists()).toBe(true)
  })

  it('shows a lookup error and lets navigation to a tree node be retried', async () => {
    mockLookup.mockResolvedValueOnce([{ id: 3, code: '0101010101', name: 'Leaf' }])
    mockGetById.mockRejectedValueOnce(new Error('fail'))
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    const input = wrapper.find('.search-input')
    await input.setValue('leaf')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    const resultItem = wrapper.find('.search-result-item')
    await resultItem.trigger('click')
    await waitForUpdates(wrapper)

    expect(mockGetById).toHaveBeenCalledWith(3)
    expect(wrapper.find('.search-error').exists()).toBe(true)
    expect(wrapper.emitted('select')).toBeUndefined()

    mockLookup.mockResolvedValueOnce([{ id: 3, code: leaf.code, name: 'Leaf' }])
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)
    await wrapper.find('.search-result-item').trigger('click')
    await waitForUpdates(wrapper)

    expect(wrapper.find('.search-error').exists()).toBe(false)
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.findAll('.node-label').some((node) => node.text() === 'Leaf')).toBe(true)
  })

  it('does not perform lookup when search key is empty or whitespace', async () => {
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    const input = wrapper.find('.search-input')
    await input.setValue('   ')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    expect(mockLookup).not.toHaveBeenCalled()
    expect(wrapper.find('.search-results').exists()).toBe(false)
  })

  it('ignores search result without id', async () => {
    mockLookup.mockResolvedValueOnce([{ code: '0000', name: 'No ID' }])
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    const input = wrapper.find('.search-input')
    await input.setValue('noid')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    const resultItem = wrapper.find('.search-result-item')
    await resultItem.trigger('click')
    await waitForUpdates(wrapper)

    expect(mockGetById).not.toHaveBeenCalled()
    expect(wrapper.find('.search-results').exists()).toBe(true)
    expect(wrapper.find('.search-result-item').classes()).toContain('unavailable')
    expect(wrapper.find('.search-result-item').attributes('aria-disabled')).toBe('true')
  })

  it('does nothing when a search result has no matching tree node', async () => {
    mockLookup.mockResolvedValueOnce([{ id: 99, code: '847350', name: 'Missing' }])
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    await wrapper.find('.search-input').setValue('missing')
    await wrapper.findComponent({ name: 'ActionButton' }).find('button').trigger('click')
    await waitForUpdates(wrapper)
    await wrapper.find('.search-result-item').trigger('mouseenter')
    await waitForUpdates(wrapper)

    expect(mockGetById).toHaveBeenCalledWith(99)
    expect(wrapper.find('.search-results').exists()).toBe(true)
    expect(wrapper.findAll('.node-label').some((node) => node.text() === 'Child')).toBe(false)
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.find('.search-error').exists()).toBe(false)
    expect(wrapper.find('.search-result-item').classes()).toContain('unavailable')
    expect(wrapper.find('.search-result-item').attributes('aria-disabled')).toBe('true')

    await wrapper.find('.search-result-item').trigger('click')
    await waitForUpdates(wrapper)
    expect(mockGetById).toHaveBeenCalledTimes(1)

    mockLookup.mockResolvedValueOnce([{ id: 99, code: '847350', name: 'Missing' }])
    await wrapper.findComponent({ name: 'ActionButton' }).find('button').trigger('click')
    await waitForUpdates(wrapper)
    expect(wrapper.find('.search-result-item').classes()).not.toContain('unavailable')

    await wrapper.find('.search-result-item').trigger('click')
    await waitForUpdates(wrapper)
    expect(mockGetById).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.search-result-item').classes()).toContain('unavailable')
  })

  it('shows a lookup error if checking a result on hover fails', async () => {
    mockLookup.mockResolvedValueOnce([{ id: 3, code: leaf.code, name: 'Leaf' }])
    mockGetById.mockRejectedValueOnce(new Error('lookup failed'))
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    await wrapper.find('.search-input').setValue('leaf')
    await wrapper.findComponent({ name: 'ActionButton' }).find('button').trigger('click')
    await waitForUpdates(wrapper)
    await wrapper.find('.search-result-item').trigger('mouseenter')
    await waitForUpdates(wrapper)

    expect(wrapper.find('.search-error').exists()).toBe(true)
    expect(wrapper.find('.search-result-item').classes()).not.toContain('unavailable')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('ignores an old node lookup after a new search starts', async () => {
    let resolveNode
    mockGetById.mockReturnValueOnce(new Promise((resolve) => { resolveNode = resolve }))
    mockLookup
      .mockResolvedValueOnce([{ id: 3, code: leaf.code, name: 'Leaf' }])
      .mockResolvedValueOnce([{ id: 3, code: leaf.code, name: 'Leaf' }])
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    await wrapper.find('.search-input').setValue('leaf')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)
    await wrapper.find('.search-result-item').trigger('mouseenter')
    await wrapper.find('.search-result-item').trigger('click')

    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)
    resolveNode(null)
    await waitForUpdates(wrapper)

    expect(wrapper.find('.search-results').exists()).toBe(true)
    expect(wrapper.find('.search-result-item').classes()).not.toContain('unavailable')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('gracefully aborts opening path when a parent node is missing', async () => {
    mockLookup.mockResolvedValueOnce([{ id: 2, code: '0101', name: 'Child' }])
    mockGetById.mockImplementation((id) => {
      if (id === 2) return Promise.resolve(child)
      if (id === 1) return Promise.resolve(null)
      return Promise.resolve(null)
    })
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)

    const input = wrapper.find('.search-input')
    await input.setValue('child')
    const searchButton = wrapper.findComponent({ name: 'ActionButton' })
    await searchButton.find('button').trigger('click')
    await waitForUpdates(wrapper)

    const resultItem = wrapper.find('.search-result-item')
    await resultItem.trigger('click')
    await waitForUpdates(wrapper)

    expect(mockGetById).toHaveBeenCalledWith(2)
    expect(mockGetById).toHaveBeenCalledWith(1)
    expect(wrapper.find('.search-error').exists()).toBe(false)
  })

  it('focuses search input on mount', async () => {
    const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus')
    try {
      createWrapper()
      await flushPromises()
      expect(focusSpy).toHaveBeenCalled()
    } finally {
      focusSpy.mockRestore()
    }
  })

  it('emits refocus event on unmount', async () => {
    const wrapper = createWrapper()
    await waitForUpdates(wrapper)
    wrapper.unmount()
    expect(wrapper.emitted('refocus')).toBeTruthy()
  })
})
