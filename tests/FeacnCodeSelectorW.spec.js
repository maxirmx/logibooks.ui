// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FeacnCodeSelectorW from '@/components/FeacnCodeSelectorW.vue'
import ActionButton from '@/components/ActionButton.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

vi.mock('@/components/FeacnCodeSearchByKeyword.vue', () => ({
  default: {
    name: 'FeacnCodeSearchByKeyword',
    props: ['modelValue'],
    emits: ['update:modelValue', 'select', 'refocus'],
    template: '<div class="feacn-keyword-lookup-stub" :data-open="modelValue"></div>'
  }
}))

// Mock the helper functions before importing
vi.mock('@/helpers/parcels.list.helpers.js', () => ({
  getFeacnCodesForKeywords: vi.fn(() => []),
  getFeacnCodeItemClass: vi.fn(() => 'test-class'),
  getKeywordFeacnPairs: vi.fn(() => []),
  getMatchingFeacnCodeItemClass: vi.fn(() => 'test-class matching-feacn-code-item')
}))

// Mock the tooltip helper
vi.mock('@/helpers/feacn.info.helpers.js', () => ({
  useFeacnTooltips: vi.fn(() => ({ value: {} })),
  loadFeacnTooltipOnHover: vi.fn(() => Promise.resolve('Test tooltip'))
}))

// Mock the store
vi.mock('@/stores/key.words.store.js', () => ({
  useKeyWordsStore: vi.fn(() => ({}))
}))

describe('FeacnCodeSelectorW', () => {
  let wrapper
  let mockOnSelect

  beforeEach(async () => {
    setActivePinia(createPinia())
    mockOnSelect = vi.fn()

    // Import the mocked functions
    const {
      getKeywordFeacnPairs,
      getFeacnCodeItemClass,
      getFeacnCodesForKeywords,
      getMatchingFeacnCodeItemClass
    } = await import('@/helpers/parcels.list.helpers.js')
    const { useFeacnTooltips, loadFeacnTooltipOnHover } = await import(
      '@/helpers/feacn.info.helpers.js'
    )

    // Reset mocks
    vi.mocked(getKeywordFeacnPairs).mockClear()
    vi.mocked(getFeacnCodeItemClass).mockClear()
    vi.mocked(getMatchingFeacnCodeItemClass).mockClear()
    vi.mocked(getFeacnCodesForKeywords).mockClear()
    vi.mocked(useFeacnTooltips).mockClear()
    vi.mocked(loadFeacnTooltipOnHover).mockClear()

    // Default mock implementations
    vi.mocked(getFeacnCodesForKeywords).mockReturnValue([])
    vi.mocked(getFeacnCodeItemClass).mockReturnValue('test-class')
    vi.mocked(getMatchingFeacnCodeItemClass).mockReturnValue('test-class matching-feacn-code-item')
    vi.mocked(getKeywordFeacnPairs).mockReturnValue([])
    vi.mocked(useFeacnTooltips).mockReturnValue({ value: {} })
    vi.mocked(loadFeacnTooltipOnHover).mockResolvedValue('Test tooltip')
  })

  const defaultProps = {
    item: {
      keyWordIds: [1, 2],
      tnVed: '1234567890'
    },
    onSelect: mockOnSelect
  }

  const createWrapper = (props = {}) => {
    const finalProps = { ...defaultProps, ...props }
    // Ensure onSelect is always a function
    if (!finalProps.onSelect || typeof finalProps.onSelect !== 'function') {
      finalProps.onSelect = mockOnSelect
    }

    return mount(FeacnCodeSelectorW, {
      props: finalProps,
      global: {
        components: {
          ActionButton
        },
        stubs: {
          ActionButton: true,
          ...vuetifyStubs
        }
      }
    })
  }

  it('renders ActionButton for each keyword', async () => {
    const mockKeywords = [
      { id: 1, word: 'test keyword 1', feacnCode: '1234567890' },
      { id: 2, word: 'test keyword 2', feacnCode: '0987654321' }
    ]

    const { getKeywordFeacnPairs } = await import('@/helpers/parcels.list.helpers.js')
    vi.mocked(getKeywordFeacnPairs).mockReturnValue(mockKeywords)

    wrapper = createWrapper()

    // Count only ActionButton components that appear inside keyword items (exclude label toggle)
    const keywordActionButtons = wrapper
      .findAll('.keyword-item')
      .map((item) => item.findComponent({ name: 'ActionButton' }))
    const present = keywordActionButtons.filter((btn) => btn.exists()).length
    expect(present).toBe(2)
  })

  it('loads tooltip on mouseenter using Vue tooltip system', async () => {
    const mockKeywords = [{ id: 1, word: 'test keyword 1', feacnCode: '1234567890' }]

    const { getKeywordFeacnPairs } = await import('@/helpers/parcels.list.helpers.js')
    const { loadFeacnTooltipOnHover } = await import('@/helpers/feacn.info.helpers.js')

    vi.mocked(getKeywordFeacnPairs).mockReturnValue(mockKeywords)
    vi.mocked(loadFeacnTooltipOnHover).mockResolvedValue('Test FEACN tooltip')

    wrapper = createWrapper()

    const keywordCode = wrapper.find('.keyword-code')
    await keywordCode.trigger('mouseenter')

    // Wait for async tooltip loading
    await wrapper.vm.$nextTick()

    expect(loadFeacnTooltipOnHover).toHaveBeenCalledWith('1234567890')

    // Check that v-tooltip component is rendered
    expect(wrapper.find('[data-testid="v-tooltip"]').exists()).toBe(true)
  })

  it('renders matchingFC above keywords when provided', async () => {
    const mockKeywords = [{ id: 1, word: 'keyword one', feacnCode: '11111111' }]
    const { getKeywordFeacnPairs, getMatchingFeacnCodeItemClass } = await import(
      '@/helpers/parcels.list.helpers.js'
    )
    vi.mocked(getKeywordFeacnPairs).mockReturnValue(mockKeywords)
    vi.mocked(getMatchingFeacnCodeItemClass).mockReturnValue(
      'feacn-code-item clickable matched matching-feacn-code-item'
    )

    wrapper = createWrapper({
      item: {
        keyWordIds: [1],
        tnVed: '22222222',
        matchingFC: '33333333',
        matchingFCComment: 'Лучшее совпадение'
      }
    })

    const allItems = wrapper.findAll('.keyword-item')
    expect(allItems.length).toBeGreaterThan(0)
    // First item should contain matchingFC pattern
    const firstText = allItems[0].text()
    expect(firstText).toContain('33333333 - Лучшее совпадение')
    // Ensure matching class applied
    const firstCodeDiv = allItems[0].find('.keyword-code')
    expect(firstCodeDiv.classes()).toContain('matching-feacn-code-item')
  })

  it('calls onSelect when matchingFC clicked', async () => {
    const mockKeywords = []
    const { getKeywordFeacnPairs } = await import('@/helpers/parcels.list.helpers.js')
    vi.mocked(getKeywordFeacnPairs).mockReturnValue(mockKeywords)

    wrapper = createWrapper({
      item: {
        keyWordIds: [],
        tnVed: '99999999',
        matchingFC: '88888888',
        matchingFCComment: 'Особый код'
      }
    })

    // After refactor, matchingFC is rendered as the first keyword-item without a wrapper class
    const firstCodeDiv = wrapper.find('.keyword-item .keyword-code')
    expect(firstCodeDiv.exists()).toBe(true)
    await firstCodeDiv.trigger('click')
    expect(mockOnSelect).toHaveBeenCalledWith('88888888')
  })

  it('opens keyword lookup on label click', async () => {
    const { getKeywordFeacnPairs } = await import('@/helpers/parcels.list.helpers.js')
    vi.mocked(getKeywordFeacnPairs).mockReturnValue([])

    wrapper = createWrapper()

    const label = wrapper.find('label')
    await label.trigger('click')

    const lookup = wrapper.find('.feacn-keyword-lookup-stub')
    expect(lookup.exists()).toBe(true)
    expect(lookup.attributes('data-open')).toBe('true')
  })

  it('handles code selection from keyword lookup', async () => {
    const { getKeywordFeacnPairs } = await import('@/helpers/parcels.list.helpers.js')
    vi.mocked(getKeywordFeacnPairs).mockReturnValue([])

    wrapper = createWrapper()

    // Open the keyword lookup so the component is mounted (v-if)
    const label = wrapper.find('label')
    await label.trigger('click')
    await wrapper.vm.$nextTick()

    const { default: StubComponent } = await import('@/components/FeacnCodeSearchByKeyword.vue')
    const lookup = wrapper.findComponent(StubComponent)
    expect(lookup.exists()).toBe(true)
    await lookup.vm.$emit('select', '5555')
    await wrapper.vm.$nextTick()
    expect(mockOnSelect).toHaveBeenCalledWith('5555')
  })
})
