// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

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

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ error: vi.fn() })
}))

// Mock helper functions - use individually named mocks for better control
const mockGetFeacnCodesForKeywords = vi.fn()
const mockGetFeacnCodeItemClass = vi.fn()
const mockGetMatchingFeacnCodeItemClass = vi.fn()
const mockUpdateParcelTnVed = vi.fn().mockResolvedValue({ success: true })
const mockGetMatchType = vi.fn()

vi.mock('@/helpers/parcels.list.helpers.js', () => ({
  getFeacnCodesForKeywords: (keyWordIds) => mockGetFeacnCodesForKeywords(keyWordIds),
  getFeacnCodeItemClass: (code, selectedCode, codes) =>
    mockGetFeacnCodeItemClass(code, selectedCode, codes),
  getMatchingFeacnCodeItemClass: (code, selectedCode, codes) =>
    mockGetMatchingFeacnCodeItemClass(code, selectedCode, codes),
  updateParcelTnVed: (...args) => mockUpdateParcelTnVed(...args),
  getMatchType: (code, tnVed) => mockGetMatchType(code, tnVed)
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
const mockLoadParcels = vi.fn()

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
    // Matching FC inherits selected/unselected logic plus border class
    mockGetMatchingFeacnCodeItemClass.mockImplementation((code, selectedCode) => {
      const base = code === selectedCode ? 'selected-code' : 'unselected-code'
      return base + ' matching-feacn-code-item'
    })

    // Set up mock implementation for getMatchType
    mockGetMatchType.mockImplementation((code, tnVed) => {
      if (!code || !tnVed) {
        return 'none'
      }
      if (code === tnVed) {
        return 'exact'
      }
      if (code.substring(0, 6) === tnVed.substring(0, 6)) {
        return 'weak'
      }
      return 'none'
    })
  })

  function createWrapper(props = {}) {
    return mount(FeacnCodeSelector, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [vuetify],
        components: globalComponents,
        provide: {
          loadParcels: mockLoadParcels
        }
      }
    })
  }

  describe('rendering', () => {

    it('does not display check-double icon for unselected codes', () => {
      const wrapper = createWrapper()

      // Find all elements with the code text but not the selected one
      const unselectedElements = wrapper
        .findAll('.d-inline-flex.align-center')
        .filter((el) => !el.text().includes('1234567890'))

      // There should be at least one unselected code
      expect(unselectedElements.length).toBeGreaterThan(0)

      // None of the unselected elements should have the check-double icon
      unselectedElements.forEach((el) => {
        expect(el.find('.fa-check-double').exists()).toBe(false)
      })
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

    it('calls updateParcelTnVed when clicking matchingFC if not selected', async () => {
      const wrapper = createWrapper({
        item: {
          id: 5,
          keyWordIds: [1],
          tnVed: '1234567890',
          matchingFC: '8888888888',
          matchingFCComment: 'Особый'
        }
      })
      const matchingDiv = wrapper.find('.matching-feacn-code-item')
      expect(matchingDiv.exists()).toBe(true)
      await matchingDiv.trigger('click')
      expect(mockUpdateParcelTnVed).toHaveBeenCalled()
    })

    it('does not call updateParcelTnVed when clicking matchingFC if it equals tnVed', async () => {
      const wrapper = createWrapper({
        item: {
          id: 6,
          keyWordIds: [1],
          tnVed: '7777777777',
          matchingFC: '7777777777',
          matchingFCComment: 'Точный'
        }
      })
      const matchingDiv = wrapper.find('.matching-feacn-code-item')
      expect(matchingDiv.exists()).toBe(true)
      await matchingDiv.trigger('click')
      expect(mockUpdateParcelTnVed).not.toHaveBeenCalled()
    })

    it('does not call updateParcelTnVed when shift is pressed', async () => {
      const wrapper = createWrapper()
      const unselectedCodeDiv = wrapper.find('.unselected-code')
      expect(unselectedCodeDiv.exists()).toBe(true)
      await unselectedCodeDiv.trigger('click', { shiftKey: true })
      expect(mockUpdateParcelTnVed).not.toHaveBeenCalled()
    })

    it('does not call updateParcelTnVed when control is pressed', async () => {
      const wrapper = createWrapper()
      const unselectedCodeDiv = wrapper.find('.unselected-code')
      expect(unselectedCodeDiv.exists()).toBe(true)
      await unselectedCodeDiv.trigger('click', { ctrlKey: true })
      expect(mockUpdateParcelTnVed).not.toHaveBeenCalled()
    })

    it('does not call updateParcelTnVed when command is pressed', async () => {
      const wrapper = createWrapper()
      const unselectedCodeDiv = wrapper.find('.unselected-code')
      expect(unselectedCodeDiv.exists()).toBe(true)
      await unselectedCodeDiv.trigger('click', { metaKey: true })
      expect(mockUpdateParcelTnVed).not.toHaveBeenCalled()
    })
  })
})
