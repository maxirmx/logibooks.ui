import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import EditableCell from '@/components/EditableCell.vue'

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

describe('EditableCell', () => {
  const defaultProps = {
    item: { id: 1, name: 'Test Item' },
    displayValue: 'Test Value'
  }

  function createWrapper(props = {}) {
    return mount(EditableCell, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [vuetify],
        components: globalComponents
      }
    })
  }

  describe('rendering', () => {
    it('renders the display value', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Test Value')
    })

    it('applies default cell class', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('span').classes()).toContain('clickable-cell')
    })

    it('applies custom cell class', () => {
      const wrapper = createWrapper({ cellClass: 'custom-class' })
      expect(wrapper.find('span').classes()).toContain('custom-class')
    })

    it('displays custom slot content', () => {
      const wrapper = mount(EditableCell, {
        props: defaultProps,
        slots: {
          default: '<strong>Custom Content</strong>'
        },
        global: {
          plugins: [vuetify],
          components: globalComponents
        }
      })
      expect(wrapper.html()).toContain('<strong>Custom Content</strong>')
    })

    it('renders with truncated-cell class', () => {
      const wrapper = createWrapper({ cellClass: 'truncated-cell' })
      expect(wrapper.find('span').classes()).toContain('truncated-cell')
    })

    it('renders with combined classes', () => {
      const wrapper = createWrapper({ cellClass: 'truncated-cell status-cell custom-class' })
      const span = wrapper.find('span')
      expect(span.classes()).toContain('truncated-cell')
      expect(span.classes()).toContain('status-cell')
      expect(span.classes()).toContain('custom-class')
    })
  })

  describe('tooltip', () => {
    it('displays default pen icon in tooltip', () => {
      const wrapper = createWrapper()
      // FontAwesome component should be rendered
      const fontAwesome = wrapper.findComponent({ name: 'FontAwesomeIcon' })
      expect(fontAwesome.exists()).toBe(true)
      expect(fontAwesome.props('icon')).toBe('fa-solid fa-pen')
    })

    it('displays custom tooltip icon', () => {
      const wrapper = createWrapper({ tooltipIcon: 'fa-solid fa-list' })
      const fontAwesome = wrapper.findComponent({ name: 'FontAwesomeIcon' })
      expect(fontAwesome.exists()).toBe(true)
      expect(fontAwesome.props('icon')).toBe('fa-solid fa-list')
    })

    it('shows display value in tooltip when no custom tooltip text', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Test Value')
    })

    it('shows custom tooltip text when provided', () => {
      const wrapper = createWrapper({ tooltipText: 'Custom tooltip' })
      // Tooltip text is in the template but may not be visible without hover activation
      // Check that the component receives the prop correctly
      expect(wrapper.vm.tooltipText).toBe('Custom tooltip')
    })

    it('shows tooltip with list icon for navigation cells', () => {
      const wrapper = createWrapper({ 
        tooltipIcon: 'fa-solid fa-list',
        tooltipText: 'Open parcels list'
      })
      const fontAwesome = wrapper.findComponent({ name: 'FontAwesomeIcon' })
      expect(fontAwesome.exists()).toBe(true)
      expect(fontAwesome.props('icon')).toBe('fa-solid fa-list')
      expect(wrapper.vm.tooltipText).toBe('Open parcels list')
    })

    it('shows tooltip structure for register cells', () => {
      const wrapper = createWrapper({ 
        cellClass: 'edit-register-link clickable-cell',
        displayValue: 'REG-123',
        tooltipIcon: 'fa-solid fa-pen'
      })
      expect(wrapper.find('span').classes()).toContain('edit-register-link')
      expect(wrapper.text()).toContain('REG-123')
    })
  })

  describe('interactions', () => {
    it('emits click event with item when clicked', async () => {
      const wrapper = createWrapper()
      const span = wrapper.find('span')
      
      await span.trigger('click')
      
      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')[0]).toEqual([defaultProps.item])
    })

    it('emits click event multiple times', async () => {
      const wrapper = createWrapper()
      const span = wrapper.find('span')
      
      await span.trigger('click')
      await span.trigger('click')
      
      expect(wrapper.emitted('click')).toHaveLength(2)
    })

    it('emits click for register editing', async () => {
      const registerItem = { id: 1, dealNumber: 'DEAL-123' }
      const wrapper = createWrapper({ item: registerItem })
      const span = wrapper.find('span')
      
      await span.trigger('click')
      
      expect(wrapper.emitted('click')[0]).toEqual([registerItem])
    })

    it('emits click for parcel editing', async () => {
      const parcelItem = { id: 2, orderNumber: 'ORDER-456' }
      const wrapper = createWrapper({ item: parcelItem })
      const span = wrapper.find('span')
      
      await span.trigger('click')
      
      expect(wrapper.emitted('click')[0]).toEqual([parcelItem])
    })
  })

  describe('props validation', () => {
    it('accepts string display value', () => {
      const wrapper = createWrapper({ displayValue: 'String value' })
      expect(wrapper.text()).toContain('String value')
    })

    it('accepts number display value', () => {
      const wrapper = createWrapper({ displayValue: 42 })
      expect(wrapper.text()).toContain('42')
    })

    it('handles empty tooltip text', () => {
      const wrapper = createWrapper({ tooltipText: '' })
      expect(wrapper.text()).toContain('Test Value') // Falls back to displayValue
    })

    it('handles zero as display value', () => {
      const wrapper = createWrapper({ displayValue: 0 })
      expect(wrapper.text()).toContain('0')
    })

    it('handles empty string as display value', () => {
      const wrapper = createWrapper({ displayValue: '' })
      expect(wrapper.find('span').exists()).toBe(true)
    })
  })

  describe('slot props', () => {
    it('provides item and value to slot', () => {
      const wrapper = mount(EditableCell, {
        props: defaultProps,
        slots: {
          default: ({ item, value }) => `Item: ${item.name}, Value: ${value}`
        },
        global: {
          plugins: [vuetify],
          components: globalComponents
        }
      })
      
      expect(wrapper.text()).toContain('Item: Test Item, Value: Test Value')
    })

    it('provides correct item data to slot', () => {
      const item = { id: 5, companyName: 'Test Company' }
      const wrapper = mount(EditableCell, {
        props: { item, displayValue: 'Company Display' },
        slots: {
          default: ({ item }) => `Company: ${item.companyName}`
        },
        global: {
          plugins: [vuetify],
          components: globalComponents
        }
      })
      
      expect(wrapper.text()).toContain('Company: Test Company')
    })
  })

  describe('accessibility', () => {
    it('maintains tooltip structure for screen readers', () => {
      const wrapper = createWrapper()
      const tooltip = wrapper.findComponent({ name: 'VTooltip' })
      expect(tooltip.exists()).toBe(true)
    })

    it('preserves clickable span for keyboard navigation', () => {
      const wrapper = createWrapper()
      const span = wrapper.find('span')
      expect(span.exists()).toBe(true)
      expect(span.classes()).toContain('clickable-cell')
    })

    it('maintains tooltip activator structure', () => {
      const wrapper = createWrapper()
      const tooltip = wrapper.findComponent({ name: 'VTooltip' })
      expect(tooltip.exists()).toBe(true)
      // The span should be inside the tooltip activator
      const span = wrapper.find('span')
      expect(span.exists()).toBe(true)
    })
  })

  describe('real-world usage scenarios', () => {
    it('works with register deal number display', () => {
      const wrapper = createWrapper({
        item: { id: 1, dealNumber: 'DEAL-12345' },
        displayValue: 'DEAL-12345',
        cellClass: 'open-parcels-link clickable-cell',
        tooltipIcon: 'fa-solid fa-list'
      })
      
      expect(wrapper.text()).toContain('DEAL-12345')
      expect(wrapper.find('span').classes()).toContain('open-parcels-link')
      const fontAwesome = wrapper.findComponent({ name: 'FontAwesomeIcon' })
      expect(fontAwesome.exists()).toBe(true)
      expect(fontAwesome.props('icon')).toBe('fa-solid fa-list')
    })

    it('works with country code display', () => {
      const wrapper = createWrapper({
        item: { id: 1, countryCode: 'RU' },
        displayValue: 'RU',
        cellClass: 'truncated-cell',
        tooltipText: 'Russian Federation'
      })
      
      expect(wrapper.text()).toContain('RU')
      expect(wrapper.vm.tooltipText).toBe('Russian Federation')
      expect(wrapper.find('span').classes()).toContain('truncated-cell')
    })

    it('works with status display and custom class', () => {
      const wrapper = createWrapper({
        item: { id: 1, statusId: 2 },
        displayValue: 'Processing',
        cellClass: 'truncated-cell status-cell status-processing',
        tooltipText: 'Order is being processed'
      })
      
      expect(wrapper.text()).toContain('Processing')
      expect(wrapper.vm.tooltipText).toBe('Order is being processed')
      const span = wrapper.find('span')
      expect(span.classes()).toContain('status-cell')
      expect(span.classes()).toContain('status-processing')
    })

    it('works with orders total display', () => {
      const wrapper = createWrapper({
        item: { id: 1, ordersTotal: 15 },
        displayValue: 15,
        cellClass: 'edit-register-link clickable-cell'
      })
      
      expect(wrapper.text()).toContain('15')
      expect(wrapper.find('span').classes()).toContain('edit-register-link')
    })
  })

  describe('edge cases', () => {
    it('handles null display value', () => {
      const wrapper = createWrapper({ displayValue: null })
      expect(wrapper.find('span').exists()).toBe(true)
    })

    it('handles undefined display value', () => {
      const wrapper = createWrapper({ displayValue: undefined })
      expect(wrapper.find('span').exists()).toBe(true)
    })

    it('handles complex object in item prop', async () => {
      const complexItem = {
        id: 1,
        nested: { data: 'value' },
        array: [1, 2, 3]
      }
      const wrapper = createWrapper({ item: complexItem })
      
      expect(wrapper.emitted()).not.toHaveProperty('click')
      await wrapper.find('span').trigger('click')
      expect(wrapper.emitted('click')[0]).toEqual([complexItem])
    })

    it('handles very long display values', () => {
      const longValue = 'A'.repeat(200)
      const wrapper = createWrapper({ displayValue: longValue })
      expect(wrapper.text()).toContain(longValue)
    })
  })
})
