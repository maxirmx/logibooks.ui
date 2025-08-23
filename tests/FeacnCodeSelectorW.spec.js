import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FeacnCodeSelectorW from '@/components/FeacnCodeSelectorW.vue'
import ActionButton from '@/components/ActionButton.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

// Mock the helper functions before importing
vi.mock('@/helpers/parcels.list.helpers.js', () => ({
  getFeacnCodesForKeywords: vi.fn(() => []),
  getFeacnCodeItemClass: vi.fn(() => 'test-class'),
  getKeywordFeacnPairs: vi.fn(() => [])
}))

// Mock the tooltip helper
vi.mock('@/helpers/feacn.tooltip.helpers.js', () => ({
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
    const { getKeywordFeacnPairs, getFeacnCodeItemClass, getFeacnCodesForKeywords } = await import('@/helpers/parcels.list.helpers.js')
    const { useFeacnTooltips, loadFeacnTooltipOnHover } = await import('@/helpers/feacn.tooltip.helpers.js')
    
    // Reset mocks
    vi.mocked(getKeywordFeacnPairs).mockClear()
    vi.mocked(getFeacnCodeItemClass).mockClear()
    vi.mocked(getFeacnCodesForKeywords).mockClear()
    vi.mocked(useFeacnTooltips).mockClear()
    vi.mocked(loadFeacnTooltipOnHover).mockClear()
    
    // Default mock implementations
    vi.mocked(getFeacnCodesForKeywords).mockReturnValue([])
    vi.mocked(getFeacnCodeItemClass).mockReturnValue('test-class')
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
    expect(wrapper.find('label').text()).toBe('Подбор ТН ВЭД:')
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
    
    const actionButtons = wrapper.findAllComponents({ name: 'ActionButton' })
    expect(actionButtons).toHaveLength(2)
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
    const { loadFeacnTooltipOnHover } = await import('@/helpers/feacn.tooltip.helpers.js')
    
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
})
