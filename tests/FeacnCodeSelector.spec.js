import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import FeacnCodeSelector from '@/components/FeacnCodeSelector.vue'

// Mock the store and helpers
vi.mock('@/stores/key.words.store.js', () => ({
  useKeyWordsStore: () => ({
    keyWords: [
      { id: 1, title: 'Keyword1', feacnCodes: ['1234567890', '0987654321'] },
      { id: 2, title: 'Keyword2', feacnCodes: ['2345678901'] }
    ]
  })
}))

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    updateTnVed: vi.fn().mockResolvedValue({ success: true })
  })
}))

// Mock helper functions - use individually named mocks for better control
const mockGetFeacnCodesForKeywords = vi.fn()
const mockGetFeacnCodeItemClass = vi.fn()
const mockUpdateParcelTnVed = vi.fn().mockResolvedValue({ success: true })

vi.mock('@/helpers/parcels.list.helpers.js', () => ({
  getFeacnCodesForKeywords: (keyWordIds) => mockGetFeacnCodesForKeywords(keyWordIds),
  getFeacnCodeItemClass: (code, selectedCode, codes) => mockGetFeacnCodeItemClass(code, selectedCode, codes),
  updateParcelTnVed: (...args) => mockUpdateParcelTnVed(...args)
}))

// Mock FontAwesome
vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :class="[icon]"></i>',
    props: ['icon', 'size', 'class']
  }
}))

// Global component registration
const globalComponents = {
  'font-awesome-icon': {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :class="[icon]"></i>',
    props: ['icon', 'size', 'class']
  }
}

const vuetify = createVuetify({
  components,
  directives
})

// Mock the inject value
const mockLoadOrders = vi.fn()

describe('FeacnCodeSelector', () => {
  const defaultProps = {
    item: { 
      id: 1, 
      keyWordIds: [1, 2], 
      tnVed: '1234567890'
    }
  }

  // Setup default mock implementations for each test
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Set up mock implementation for getFeacnCodesForKeywords
    mockGetFeacnCodesForKeywords.mockImplementation((keyWordIds) => {
      if (keyWordIds && keyWordIds.length > 0) {
        return ['1234567890', '0987654321']
      }
      return []
    })
    
    // Set up mock implementation for getFeacnCodeItemClass
    mockGetFeacnCodeItemClass.mockImplementation((code, selectedCode) => {
      return code === selectedCode ? 'selected-code' : 'unselected-code'
    })
  })

  function createWrapper(props = {}) {
    return mount(FeacnCodeSelector, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [vuetify],
        components: globalComponents,
        provide: {
          loadOrders: mockLoadOrders
        }
      }
    })
  }

  describe('rendering', () => {
    it('renders the component with FEACN codes', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.feacn-lookup-column').exists()).toBe(true)
      
      // Since we're mocking getFeacnCodesForKeywords to return 2 codes
      const codeElements = wrapper.findAll('.d-inline-flex.align-center')
      expect(codeElements.length).toBe(2)
      
      // Check that our mock codes are displayed
      expect(wrapper.text()).toContain('1234567890')
      expect(wrapper.text()).toContain('0987654321')
    })

    it('displays a check-double icon for the selected code', () => {
      const wrapper = createWrapper()
      
      // Our mock setup has '1234567890' as the selected code
      const iconElement = wrapper.find('.fa-check-double')
      expect(iconElement.exists()).toBe(true)
      
      // Verify it's in the same parent element as the selected code text
      const parentElement = wrapper.find('.d-inline-flex.align-center')
      expect(parentElement.text()).toContain('1234567890')
      expect(parentElement.find('.fa-check-double').exists()).toBe(true)
    })

    it('does not display check-double icon for unselected codes', () => {
      const wrapper = createWrapper()
      
      // Find all elements with the code text but not the selected one
      const unselectedElements = wrapper.findAll('.d-inline-flex.align-center')
        .filter(el => !el.text().includes('1234567890'))
      
      // There should be at least one unselected code
      expect(unselectedElements.length).toBeGreaterThan(0)
      
      // None of the unselected elements should have the check-double icon
      unselectedElements.forEach(el => {
        expect(el.find('.fa-check-double').exists()).toBe(false)
      })
    })

    it('applies correct CSS classes to codes', () => {
      const wrapper = createWrapper()
      
      // Selected code should have the 'selected-code' class
      const selectedCodeDiv = wrapper.find('.selected-code')
      expect(selectedCodeDiv.exists()).toBe(true)
      
      // Unselected codes should have the 'unselected-code' class
      const unselectedCodeDivs = wrapper.findAll('.unselected-code')
      expect(unselectedCodeDivs.length).toBe(1) // Since we have 2 codes total and 1 is selected
    })

    it('displays a fallback message when no codes are available', () => {
      // Setup mock to return empty array for this test
      mockGetFeacnCodesForKeywords.mockReturnValueOnce([])
      
      const wrapper = createWrapper({
        item: { id: 2, keyWordIds: [], tnVed: '' }
      })
      
      // Should not render the FEACN lookup column
      expect(wrapper.find('.feacn-lookup-column').exists()).toBe(false)
      
      // Should render a fallback dash
      expect(wrapper.text()).toBe('-')
    })
  })

  describe('interactions', () => {
    it('calls updateParcelTnVed when clicking an unselected code', async () => {
      const wrapper = createWrapper()
      
      // Find an unselected code element
      const unselectedCodeDiv = wrapper.find('.unselected-code')
      expect(unselectedCodeDiv.exists()).toBe(true)
      
      // Click it
      await unselectedCodeDiv.trigger('click')
      
      // Verify that updateParcelTnVed was called
      expect(mockUpdateParcelTnVed).toHaveBeenCalled()
    })

    it('does not call updateParcelTnVed when clicking the already selected code', async () => {
      const wrapper = createWrapper()
      
      // Find the selected code element
      const selectedCodeDiv = wrapper.find('.selected-code')
      expect(selectedCodeDiv.exists()).toBe(true)
      
      // Click it
      await selectedCodeDiv.trigger('click')
      
      // Verify that updateParcelTnVed was not called
      expect(mockUpdateParcelTnVed).not.toHaveBeenCalled()
    })
  })
})
