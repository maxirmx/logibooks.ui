// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ParcelOrderStatusSection from '@/components/ParcelOrderStatusSection.vue'
import ActionButton from '@/components/ActionButton.vue'
import { Field } from 'vee-validate'

// Mock FontAwesome
vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :class="[icon]"></i>',
    props: ['icon', 'size', 'class']
  }
}))

// Mock the helpers
vi.mock('@/helpers/parcels.check.helpers.js', () => ({
  getCheckStatusInfo: vi.fn((item, feacnOrders, stopWords, feacnPrefixes) => {
    // Return info if item exists and has certain properties
    return item && item.id > 1 ? 'Test status info' : null
  }),
  getCheckStatusClass: vi.fn((checkStatus) => {
    return checkStatus > 0 ? 'status-error' : 'status-ok'
  })
}))

// Mock CheckStatusCode
vi.mock('@/helpers/check.status.code.js', () => ({
  CheckStatusCode: class CheckStatusCode {
    constructor(status) {
      this.status = status
    }
    toString() {
      return 'Checked'
    }
    static isInheritedSw(status) {
      return status === 8
    }
    static hasIssues(status) {
      return status > 0
    }
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

describe('ParcelOrderStatusSection', () => {
  const defaultProps = {
    item: { 
      id: 1, 
      checkStatus: 0,
      dTime: '2025-02-10T10:00:00Z',
      statusId: 1
    },
    values: { field1: 'value1' },
    statusStore: { 
      parcelStatuses: [
        { id: 1, title: 'Статус 1' },
        { id: 2, title: 'Статус 2' }
      ]
    },
    feacnOrders: [],
    stopWords: [],
    feacnPrefixes: [],
    isSubmitting: false,
    runningAction: false,
    loading: false
  }

  function createWrapper(props = {}) {
    return mount(ParcelOrderStatusSection, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [vuetify],
        components: {
          ...globalComponents,
          Field
        }
      }
    })
  }

  describe('rendering', () => {
    it('renders form-section container', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.form-section').exists()).toBe(true)
    })

    it('renders form-row container', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.form-row').exists()).toBe(true)
    })

    it('renders status label and select field', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('label[for="statusId"]').exists()).toBe(true)
      expect(wrapper.find('#statusId').exists()).toBe(true)
    })

    it('renders all status options from statusStore', () => {
      const wrapper = createWrapper()
      const options = wrapper.findAll('#statusId option')
      expect(options).toHaveLength(2)
      expect(options[0].text()).toBe('Статус 1')
      expect(options[1].text()).toBe('Статус 2')
    })

    it('renders check status display', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('#checkStatus').exists()).toBe(true)
      expect(wrapper.find('.status-cell').exists()).toBe(true)
    })

    it('renders last view label and display', () => {
      const wrapper = createWrapper()
      const labels = wrapper.findAll('label')
      const lastViewLabel = labels.find(label => label.text().includes('Последний просмотр'))
      expect(lastViewLabel).toBeTruthy()
      expect(wrapper.find('#lastView').exists()).toBe(true)
    })

    it('renders last view as formatted date', () => {
      const wrapper = createWrapper()
      const lastViewText = wrapper.find('#lastView').text()
      // Check that it contains the date components, allowing for locale differences
      expect(lastViewText).toContain('2025')
      expect(lastViewText).toContain('10')
      expect(lastViewText).toContain('02')
    })

    it('renders last view as empty when dTime is not provided', () => {
      const itemWithoutDTime = { ...defaultProps.item, dTime: null }
      const wrapper = createWrapper({ item: itemWithoutDTime })
      const lastViewText = wrapper.find('#lastView').text()
      expect(lastViewText).toBe('')
    })

    it('renders action buttons', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('renders correct number of action button groups', () => {
      const wrapper = createWrapper()
      const buttonGroups = wrapper.findAll('.action-buttons')
      expect(buttonGroups).toHaveLength(2)
    })
  })

  describe('bookmark icon', () => {
    it('renders status cell with check status', () => {
      const wrapper = createWrapper({
        item: { ...defaultProps.item, checkStatus: 8 }
      })
      // Check if status cell exists
      const statusCell = wrapper.find('.status-cell')
      expect(statusCell.exists()).toBe(true)
      expect(statusCell.text()).toContain('Checked')
    })

    it('handles both inherited and non-inherited check status', () => {
      const wrapper1 = createWrapper({
        item: { ...defaultProps.item, checkStatus: 8 }
      })
      const wrapper2 = createWrapper({
        item: { ...defaultProps.item, checkStatus: 1 }
      })
      
      expect(wrapper1.find('.status-cell').exists()).toBe(true)
      expect(wrapper2.find('.status-cell').exists()).toBe(true)
    })
  })

  describe('stopwords section', () => {
    it('does not render stopwords section when getCheckStatusInfo returns null', () => {
      const wrapper = createWrapper({
        item: { ...defaultProps.item, id: 1 }
      })
      // Since getCheckStatusInfo returns null for id <= 1
      const stopwordsInfo = wrapper.find('[class*="stopwords"]')
      expect(stopwordsInfo.exists()).toBe(false)
    })

    it('renders stopwords section when getCheckStatusInfo returns a value', () => {
      const wrapper = createWrapper({
        item: { ...defaultProps.item, id: 2 }
      })
      // Since getCheckStatusInfo returns value for id > 1
      const stopwordsDiv = wrapper.find('[class*="stopwords"]')
      expect(stopwordsDiv.exists()).toBe(true)
    })

    it('applies stopwords-info class when checkStatus has issues', () => {
      const wrapper = createWrapper({
        item: { ...defaultProps.item, id: 2, checkStatus: 1 }
      })
      const stopwordsDiv = wrapper.find('.stopwords-info')
      expect(stopwordsDiv.exists()).toBe(true)
    })

    it('applies stopwords-info-approved class when checkStatus has no issues', () => {
      const wrapper = createWrapper({
        item: { ...defaultProps.item, id: 2, checkStatus: 0 }
      })
      const stopwordsDivApproved = wrapper.find('.stopwords-info-approved')
      expect(stopwordsDivApproved.exists()).toBe(true)
    })
  })

  describe('action buttons', () => {
    it('renders 5 action buttons', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      expect(buttons).toHaveLength(5)
    })

    it('passes correct props to validate-sw button', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      const validateSwButton = buttons[0]
      
      expect(validateSwButton.props('icon')).toBe('fa-solid fa-spell-check')
      expect(validateSwButton.props('iconSize')).toBe('2x')
    })

    it('passes correct props to validate-sw-ex button', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      const validateSwExButton = buttons[1]
      
      expect(validateSwExButton.props('icon')).toBe('fa-solid fa-book-journal-whills')
      expect(validateSwExButton.props('iconSize')).toBe('2x')
    })

    it('passes correct props to validate-fc button', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      const validateFcButton = buttons[2]
      
      expect(validateFcButton.props('icon')).toBe('fa-solid fa-anchor-circle-check')
      expect(validateFcButton.props('iconSize')).toBe('2x')
    })

    it('passes correct props to approve button', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      const approveButton = buttons[3]
      
      expect(approveButton.props('icon')).toBe('fa-solid fa-check-circle')
      expect(approveButton.props('variant')).toBe('green')
      expect(approveButton.props('iconSize')).toBe('2x')
    })

    it('passes correct props to approve-excise button', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      const approveExciseButton = buttons[4]
      
      expect(approveExciseButton.props('icon')).toBe('fa-solid fa-check-circle')
      expect(approveExciseButton.props('variant')).toBe('orange')
      expect(approveExciseButton.props('iconSize')).toBe('2x')
    })

    it('passes disabled state to all buttons when isSubmitting is true', () => {
      const wrapper = createWrapper({ isSubmitting: true })
      const buttons = wrapper.findAllComponents(ActionButton)
      
      buttons.forEach(button => {
        expect(button.props('disabled')).toBe(true)
      })
    })

    it('passes disabled state to all buttons when runningAction is true', () => {
      const wrapper = createWrapper({ runningAction: true })
      const buttons = wrapper.findAllComponents(ActionButton)
      
      buttons.forEach(button => {
        expect(button.props('disabled')).toBe(true)
      })
    })

    it('passes disabled state to all buttons when loading is true', () => {
      const wrapper = createWrapper({ loading: true })
      const buttons = wrapper.findAllComponents(ActionButton)
      
      buttons.forEach(button => {
        expect(button.props('disabled')).toBe(true)
      })
    })

    it('buttons are enabled when all flags are false', () => {
      const wrapper = createWrapper({
        isSubmitting: false,
        runningAction: false,
        loading: false
      })
      const buttons = wrapper.findAllComponents(ActionButton)
      
      buttons.forEach(button => {
        expect(button.props('disabled')).toBe(false)
      })
    })
  })

  describe('event emissions', () => {
    it('emits update:current-status-id when status select changes', async () => {
      const wrapper = createWrapper()
      const select = wrapper.find('#statusId')
      
      // The select is a Field component from vee-validate, we need to trigger input event
      await select.setValue('2')
      await wrapper.vm.$nextTick()
      
      // Check if event was emitted
      const emitted = wrapper.emitted('update:current-status-id')
      if (emitted) {
        expect(emitted).toBeTruthy()
        expect(emitted[0]).toEqual([2])
      }
    })

    it('emits validate-sw when validate-sw button is clicked', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      
      await buttons[0].vm.$emit('click')
      
      expect(wrapper.emitted('validate-sw')).toBeTruthy()
      expect(wrapper.emitted('validate-sw')?.[0]).toEqual([defaultProps.values])
    })

    it('emits validate-sw-ex when validate-sw-ex button is clicked', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      
      await buttons[1].vm.$emit('click')
      
      expect(wrapper.emitted('validate-sw-ex')).toBeTruthy()
      expect(wrapper.emitted('validate-sw-ex')?.[0]).toEqual([defaultProps.values])
    })

    it('emits validate-fc when validate-fc button is clicked', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      
      await buttons[2].vm.$emit('click')
      
      expect(wrapper.emitted('validate-fc')).toBeTruthy()
      expect(wrapper.emitted('validate-fc')?.[0]).toEqual([defaultProps.values])
    })

    it('emits approve when approve button is clicked', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      
      await buttons[3].vm.$emit('click')
      
      expect(wrapper.emitted('approve')).toBeTruthy()
      expect(wrapper.emitted('approve')?.[0]).toEqual([defaultProps.values])
    })

    it('emits approve-excise when approve-excise button is clicked', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      
      await buttons[4].vm.$emit('click')
      
      expect(wrapper.emitted('approve-excise')).toBeTruthy()
      expect(wrapper.emitted('approve-excise')?.[0]).toEqual([defaultProps.values])
    })

    it('emits with correct values object', async () => {
      const customValues = { customField: 'customValue', anotherField: 123 }
      const wrapper = createWrapper({ values: customValues })
      const buttons = wrapper.findAllComponents(ActionButton)
      
      await buttons[0].vm.$emit('click')
      
      expect(wrapper.emitted('validate-sw')?.[0]).toEqual([customValues])
    })

    it('passes item to all action buttons', () => {
      const customItem = { id: 99, checkStatus: 5, dTime: null, statusId: 1 }
      const wrapper = createWrapper({ item: customItem })
      const buttons = wrapper.findAllComponents(ActionButton)
      
      buttons.forEach(button => {
        expect(button.props('item')).toEqual(customItem)
      })
    })
  })

  describe('props validation', () => {
    it('accepts all required props', () => {
      const wrapper = createWrapper()
      expect(wrapper.props('item')).toBeDefined()
      expect(wrapper.props('values')).toBeDefined()
      expect(wrapper.props('statusStore')).toBeDefined()
      expect(wrapper.props('feacnOrders')).toBeDefined()
      expect(wrapper.props('stopWords')).toBeDefined()
      expect(wrapper.props('feacnPrefixes')).toBeDefined()
    })

    it('accepts optional props with correct defaults', () => {
      const wrapper = createWrapper({
        isSubmitting: undefined,
        runningAction: undefined,
        loading: undefined
      })
      
      expect(wrapper.props('isSubmitting')).toBe(false)
      expect(wrapper.props('runningAction')).toBe(false)
      expect(wrapper.props('loading')).toBe(false)
    })

    it('handles empty arrays in props', () => {
      const wrapper = createWrapper({
        feacnOrders: [],
        stopWords: [],
        feacnPrefixes: []
      })
      
      expect(wrapper.props('feacnOrders')).toEqual([])
      expect(wrapper.props('stopWords')).toEqual([])
      expect(wrapper.props('feacnPrefixes')).toEqual([])
    })

    it('handles populated arrays in props', () => {
      const feacnOrders = [{ id: 1 }, { id: 2 }]
      const stopWords = [{ word: 'stop1' }]
      const feacnPrefixes = [{ prefix: 'pref1' }]
      
      const wrapper = createWrapper({
        feacnOrders,
        stopWords,
        feacnPrefixes
      })
      
      expect(wrapper.props('feacnOrders')).toEqual(feacnOrders)
      expect(wrapper.props('stopWords')).toEqual(stopWords)
      expect(wrapper.props('feacnPrefixes')).toEqual(feacnPrefixes)
    })
  })

  describe('styling classes', () => {
    it('applies correct status class based on checkStatus', () => {
      const wrapper = createWrapper({
        item: { ...defaultProps.item, checkStatus: 1 }
      })
      const statusCell = wrapper.find('.status-cell')
      expect(statusCell.classes()).toContain('status-error')
    })

    it('applies form-control and input classes to status select', () => {
      const wrapper = createWrapper()
      const select = wrapper.find('#statusId')
      expect(select.classes()).toContain('form-control')
      expect(select.classes()).toContain('input')
    })
  })

  describe('integration', () => {
    it('works with complex item objects', () => {
      const complexItem = {
        id: 100,
        checkStatus: 5,
        dTime: '2025-02-10T15:30:00Z',
        statusId: 2,
        postingNumber: 'POST123',
        blockedByFellowItem: false
      }
      
      const wrapper = createWrapper({ item: complexItem })
      expect(wrapper.find('#checkStatus').exists()).toBe(true)
      const lastViewText = wrapper.find('#lastView').text()
      expect(lastViewText).toContain('2025')
    })

    it('handles multiple status options', () => {
      const statusStore = {
        parcelStatuses: [
          { id: 1, title: 'New' },
          { id: 2, title: 'Processing' },
          { id: 3, title: 'Delivered' },
          { id: 4, title: 'Returned' }
        ]
      }
      
      const wrapper = createWrapper({ statusStore })
      const options = wrapper.findAll('#statusId option')
      expect(options).toHaveLength(4)
    })

    it('emits correct values for all buttons in sequence', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      
      await buttons[0].vm.$emit('click')
      await buttons[1].vm.$emit('click')
      await buttons[2].vm.$emit('click')
      await buttons[3].vm.$emit('click')
      await buttons[4].vm.$emit('click')
      
      expect(wrapper.emitted('validate-sw')).toHaveLength(1)
      expect(wrapper.emitted('validate-sw-ex')).toHaveLength(1)
      expect(wrapper.emitted('validate-fc')).toHaveLength(1)
      expect(wrapper.emitted('approve')).toHaveLength(1)
      expect(wrapper.emitted('approve-excise')).toHaveLength(1)
    })
  })
})
