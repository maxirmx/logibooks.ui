// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
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
    emits: ['update:modelValue', 'select'],
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
  const { getKeywordFeacnPairs, getFeacnCodeItemClass, getFeacnCodesForKeywords, getMatchingFeacnCodeItemClass } = await import('@/helpers/parcels.list.helpers.js')
    const { useFeacnTooltips, loadFeacnTooltipOnHover } = await import('@/helpers/feacn.info.helpers.js')
    
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

  it('renders correctly with empty keywords', async () => {
    const { getKeywordFeacnPairs } = await import('@/helpers/parcels.list.helpers.js')
    vi.mocked(getKeywordFeacnPairs).mockReturnValue([])
    
    wrapper = createWrapper()
    
    expect(wrapper.find('.form-group').exists()).toBe(true)
    expect(wrapper.find('label').text()).toBe('Подбор ТН ВЭД')
    expect(wrapper.text()).toContain('-')
  })

  it('renders keywords with quotes', async () => {
    const mockKeywords = [
      { id: 1, word: 'test keyword 1', feacnCode: '1234567890' },
      { id: 2, word: 'test keyword 2', feacnCode: '0987654321' }
    ]
    
    const { getKeywordFeacnPairs } = await import('@/helpers/parcels.list.helpers.js')
    vi.mocked(getKeywordFeacnPairs).mockReturnValue(mockKeywords)
    
    wrapper = createWrapper()
    
    expect(wrapper.text()).toContain('1234567890 - "test keyword 1"')
    expect(wrapper.text()).toContain('0987654321 - "test keyword 2"')
  })

  it('calls onSelect when keyword code is clicked', async () => {
    const mockKeywords = [
      { id: 1, word: 'test keyword 1', feacnCode: '1234567890' }
    ]
    
    const { getKeywordFeacnPairs } = await import('@/helpers/parcels.list.helpers.js')
    vi.mocked(getKeywordFeacnPairs).mockReturnValue(mockKeywords)
    
    wrapper = createWrapper()
    
    const keywordCode = wrapper.find('.keyword-code')
    await keywordCode.trigger('click')
    
    expect(mockOnSelect).toHaveBeenCalledWith('1234567890')
  })

  it('applies correct CSS classes to keyword items', async () => {
    const mockKeywords = [
      { id: 1, word: 'test keyword 1', feacnCode: '1234567890' }
    ]
    
    const { getKeywordFeacnPairs, getFeacnCodeItemClass } = await import('@/helpers/parcels.list.helpers.js')
    vi.mocked(getKeywordFeacnPairs).mockReturnValue(mockKeywords)
    vi.mocked(getFeacnCodeItemClass).mockReturnValue('selected-item')
    
    wrapper = createWrapper()
    
    const keywordCode = wrapper.find('.keyword-code')
    expect(keywordCode.classes()).toContain('keyword-code')
    expect(keywordCode.classes()).toContain('feacn-edit-dialog-item')
  })

  it('renders ActionButton for each keyword', async () => {
    const mockKeywords = [
      { id: 1, word: 'test keyword 1', feacnCode: '1234567890' },
      { id: 2, word: 'test keyword 2', feacnCode: '0987654321' }
    ]
    
    const { getKeywordFeacnPairs } = await import('@/helpers/parcels.list.helpers.js')
    vi.mocked(getKeywordFeacnPairs).mockReturnValue(mockKeywords)
    
    wrapper = createWrapper()
    
  // Count only ActionButton components that appear inside keyword items (exclude label toggle)
  const keywordActionButtons = wrapper.findAll('.keyword-item').map(item => item.findComponent({ name: 'ActionButton' }))
  const present = keywordActionButtons.filter(btn => btn.exists()).length
  expect(present).toBe(2)
  })

  it('has correct structure when keywords are present', async () => {
    const mockKeywords = [
      { id: 1, word: 'test keyword 1', feacnCode: '1234567890' }
    ]
    
    const { getKeywordFeacnPairs } = await import('@/helpers/parcels.list.helpers.js')
    vi.mocked(getKeywordFeacnPairs).mockReturnValue(mockKeywords)
    
    wrapper = createWrapper()
    
    expect(wrapper.find('.form-group').exists()).toBe(true)
    expect(wrapper.find('.feacn-lookup-column').exists()).toBe(true)
    expect(wrapper.find('.keyword-item').exists()).toBe(true)
  })

  it('passes correct props to computed property', async () => {
    const testItem = {
      keyWordIds: [3, 4],
      tnVed: '5555555555'
    }
    
    const { getKeywordFeacnPairs } = await import('@/helpers/parcels.list.helpers.js')
    const { useKeyWordsStore } = await import('@/stores/key.words.store.js')
    
    wrapper = createWrapper({ item: testItem })
    
    expect(getKeywordFeacnPairs).toHaveBeenCalledWith([3, 4], useKeyWordsStore())
  })

  it('loads tooltip on mouseenter using Vue tooltip system', async () => {
    const mockKeywords = [
      { id: 1, word: 'test keyword 1', feacnCode: '1234567890' }
    ]
    
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
    const mockKeywords = [
      { id: 1, word: 'keyword one', feacnCode: '11111111' }
    ]
    const { getKeywordFeacnPairs, getMatchingFeacnCodeItemClass } = await import('@/helpers/parcels.list.helpers.js')
    vi.mocked(getKeywordFeacnPairs).mockReturnValue(mockKeywords)
    vi.mocked(getMatchingFeacnCodeItemClass).mockReturnValue('feacn-code-item clickable matched matching-feacn-code-item')

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

  it('applies disabled state when matchingFC equals tnVed', async () => {
    const { getKeywordFeacnPairs } = await import('@/helpers/parcels.list.helpers.js')
    vi.mocked(getKeywordFeacnPairs).mockReturnValue([])

    wrapper = createWrapper({
      item: {
        keyWordIds: [],
        tnVed: '55555555',
        matchingFC: '55555555',
        matchingFCComment: 'Точный код'
      }
    })

  // Find ActionButton inside the first keyword-item (matchingFC should be the first item)
  const firstKeywordActionBtn = wrapper.find('.keyword-item').findComponent({ name: 'ActionButton' })
  expect(firstKeywordActionBtn.exists()).toBe(true)
  expect(firstKeywordActionBtn.props('disabled')).toBe(true)
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

  it('loads tooltip for matchingFC on mouseenter', async () => {
    const { loadFeacnTooltipOnHover } = await import('@/helpers/feacn.info.helpers.js')
    wrapper = createWrapper({
      item: {
        keyWordIds: [],
        tnVed: '10101010',
        matchingFC: '20202020',
        matchingFCComment: 'Tooltip код'
      }
    })
    const firstCodeDiv = wrapper.find('.keyword-item .keyword-code')
    await firstCodeDiv.trigger('mouseenter')
    await wrapper.vm.$nextTick()
    expect(loadFeacnTooltipOnHover).toHaveBeenCalledWith('20202020')
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

  wrapper.findComponent({ name: 'FeacnCodeSearchByKeyword' }).vm.$emit('select', '5555')

    expect(mockOnSelect).toHaveBeenCalledWith('5555')
  })
})
