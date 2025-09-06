import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ActionButton from '@/components/ActionButton.vue'

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

describe('ActionButton', () => {
  const defaultProps = {
    item: { id: 1, name: 'Test Item' },
    icon: 'fa-solid fa-pen',
    tooltipText: 'Edit item'
  }

  function createWrapper(props = {}) {
    return mount(ActionButton, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [vuetify],
        components: globalComponents
      }
    })
  }

  describe('rendering', () => {
    it('renders a button with FontAwesome icon', () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.classes()).toContain('anti-btn')
      
      const fontAwesome = wrapper.findComponent({ name: 'FontAwesomeIcon' })
      expect(fontAwesome.exists()).toBe(true)
      expect(fontAwesome.props('icon')).toBe('fa-solid fa-pen')
    })

    it('applies default icon size', () => {
      const wrapper = createWrapper()
      const fontAwesome = wrapper.findComponent({ name: 'FontAwesomeIcon' })
      expect(fontAwesome.props('size')).toBe('1x')
    })

    it('applies custom icon size', () => {
      const wrapper = createWrapper({ iconSize: '1x' })
      const fontAwesome = wrapper.findComponent({ name: 'FontAwesomeIcon' })
      expect(fontAwesome.props('size')).toBe('1x')
    })

    it('renders with tooltip', () => {
      const wrapper = createWrapper()
      const tooltip = wrapper.findComponent({ name: 'VTooltip' })
      expect(tooltip.exists()).toBe(true)
      expect(tooltip.props('text')).toBe('Edit item')
    })

    it('renders different icons correctly', () => {
      const wrapper = createWrapper({ icon: 'fa-solid fa-trash-can' })
      const fontAwesome = wrapper.findComponent({ name: 'FontAwesomeIcon' })
      expect(fontAwesome.props('icon')).toBe('fa-solid fa-trash-can')
    })
  })

  describe('interactions', () => {
    it('emits click event with item when clicked', async () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')
      
      await button.trigger('click')
      
      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')[0]).toEqual([defaultProps.item])
    })

    it('emits click event multiple times', async () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')
      
      await button.trigger('click')
      await button.trigger('click')
      
      expect(wrapper.emitted('click')).toHaveLength(2)
    })

    it('emits click with different item data', async () => {
      const customItem = { id: 2, name: 'Different Item' }
      const wrapper = createWrapper({ item: customItem })
      const button = wrapper.find('button')
      
      await button.trigger('click')
      
      expect(wrapper.emitted('click')[0]).toEqual([customItem])
    })
  })

  describe('disabled state', () => {
    it('is enabled by default', () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')
      expect(button.attributes('disabled')).toBeUndefined()
    })

    it('can be disabled', () => {
      const wrapper = createWrapper({ disabled: true })
      const button = wrapper.find('button')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('does not emit click when disabled', async () => {
      const wrapper = createWrapper({ disabled: true })
      const button = wrapper.find('button')
      
      await button.trigger('click')
      
      expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('can be conditionally disabled', async () => {
      const wrapper = createWrapper({ disabled: false })
      expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
      
      await wrapper.setProps({ disabled: true })
      expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    })
  })

  describe('props validation', () => {
    it('requires item prop', () => {
      // This test verifies the prop is marked as required
      expect(ActionButton.props?.item?.required).toBe(true)
    })

    it('requires icon prop', () => {
      expect(ActionButton.props?.icon?.required).toBe(true)
    })

    it('requires tooltipText prop', () => {
      expect(ActionButton.props?.tooltipText?.required).toBe(true)
    })

    it('has default values for optional props', () => {
      expect(ActionButton.props?.iconSize?.default).toBe('1x')
      expect(ActionButton.props?.disabled?.default).toBe(false)
    })
  })

  describe('accessibility', () => {
    it('maintains button semantics', () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')
      expect(button.attributes('type')).toBe('button')
    })

    it('preserves tooltip for screen readers', () => {
      const wrapper = createWrapper()
      const tooltip = wrapper.findComponent({ name: 'VTooltip' })
      expect(tooltip.exists()).toBe(true)
    })

    it('maintains proper disabled state accessibility', () => {
      const wrapper = createWrapper({ disabled: true })
      const button = wrapper.find('button')
      expect(button.attributes('disabled')).toBeDefined()
    })
  })

  describe('real-world usage scenarios', () => {
    it('works as edit button', () => {
      const wrapper = createWrapper({
        item: { id: 1, dealNumber: 'DEAL-123' },
        icon: 'fa-solid fa-pen',
        tooltipText: 'Редактировать реестр'
      })
      
      expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).props('icon')).toBe('fa-solid fa-pen')
      expect(wrapper.findComponent({ name: 'VTooltip' }).props('text')).toBe('Редактировать реестр')
    })

    it('works as delete button', () => {
      const wrapper = createWrapper({
        item: { id: 1, fileName: 'test.xlsx' },
        icon: 'fa-solid fa-trash-can',
        tooltipText: 'Удалить реестр'
      })
      
      expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).props('icon')).toBe('fa-solid fa-trash-can')
      expect(wrapper.findComponent({ name: 'VTooltip' }).props('text')).toBe('Удалить реестр')
    })

    it('works as export button', () => {
      const wrapper = createWrapper({
        item: { id: 1, ordersTotal: 15 },
        icon: 'fa-solid fa-file-export',
        tooltipText: 'Экспортировать реестр'
      })
      
      expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).props('icon')).toBe('fa-solid fa-file-export')
      expect(wrapper.findComponent({ name: 'VTooltip' }).props('text')).toBe('Экспортировать реестр')
    })

    it('works as validate button', () => {
      const wrapper = createWrapper({
        item: { id: 1, statusId: 2 },
        icon: 'fa-solid fa-clipboard-check',
        tooltipText: 'Проверить посылку'
      })
      
      expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).props('icon')).toBe('fa-solid fa-clipboard-check')
      expect(wrapper.findComponent({ name: 'VTooltip' }).props('text')).toBe('Проверить посылку')
    })

    it('works as upload button', () => {
      const wrapper = createWrapper({
        item: { id: 1, shk: 'SKU123' },
        icon: 'fa-solid fa-upload',
        tooltipText: 'Выгрузить XML накладную для посылки'
      })
      
      expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).props('icon')).toBe('fa-solid fa-upload')
      expect(wrapper.findComponent({ name: 'VTooltip' }).props('text')).toBe('Выгрузить XML накладную для посылки')
    })

    it('works as approve button', () => {
      const wrapper = createWrapper({
        item: { id: 1, checkStatusId: 3 },
        icon: 'fa-solid fa-check-circle',
        tooltipText: 'Согласовать'
      })
      
      expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).props('icon')).toBe('fa-solid fa-check-circle')
      expect(wrapper.findComponent({ name: 'VTooltip' }).props('text')).toBe('Согласовать')
    })

    it('works as list button', () => {
      const wrapper = createWrapper({
        item: { id: 1, dealNumber: 'DEAL-456' },
        icon: 'fa-solid fa-list',
        tooltipText: 'Открыть список посылок'
      })
      
      expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).props('icon')).toBe('fa-solid fa-list')
      expect(wrapper.findComponent({ name: 'VTooltip' }).props('text')).toBe('Открыть список посылок')
    })
  })

  describe('bulk operations in registers', () => {
    it('works as save button in bulk operations', async () => {
      const wrapper = createWrapper({
        item: { id: 1 },
        icon: 'fa-solid fa-check',
        tooltipText: 'Применить статус',
        disabled: false
      })
      
      await wrapper.find('button').trigger('click')
      expect(wrapper.emitted('click')).toBeTruthy()
    })

    it('works as cancel button in bulk operations', () => {
      const wrapper = createWrapper({
        item: { id: 1 },
        icon: 'fa-solid fa-xmark',
        tooltipText: 'Отменить'
      })
      
      expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).props('icon')).toBe('fa-solid fa-xmark')
      expect(wrapper.findComponent({ name: 'VTooltip' }).props('text')).toBe('Отменить')
    })

    it('works as status change button', () => {
      const wrapper = createWrapper({
        item: { id: 1 },
        icon: 'fa-solid fa-pen-to-square',
        tooltipText: 'Изменить статус всех посылок в реестре',
        disabled: false
      })
      
      expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).props('icon')).toBe('fa-solid fa-pen-to-square')
      expect(wrapper.findComponent({ name: 'VTooltip' }).props('text')).toBe('Изменить статус всех посылок в реестре')
    })

    it('can be disabled during loading states', () => {
      const wrapper = createWrapper({
        item: { id: 1 },
        icon: 'fa-solid fa-check',
        tooltipText: 'Применить статус',
        disabled: true
      })
      
      expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    })
  })

  describe('integration scenarios', () => {
    it('works with complex item objects', async () => {
      const complexItem = {
        id: 1,
        dealNumber: 'DEAL-789',
        fileName: 'complex-register.xlsx',
        ordersTotal: 25,
        nested: { data: 'value' }
      }
      
      const wrapper = createWrapper({ item: complexItem })
      await wrapper.find('button').trigger('click')
      
      expect(wrapper.emitted('click')[0]).toEqual([complexItem])
    })

    it('handles rapid clicks', async () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')
      
      await button.trigger('click')
      await button.trigger('click')
      await button.trigger('click')
      
      expect(wrapper.emitted('click')).toHaveLength(3)
    })

    it('maintains state across prop updates', async () => {
      const wrapper = createWrapper()
      
      await wrapper.setProps({ tooltipText: 'Updated tooltip' })
      expect(wrapper.findComponent({ name: 'VTooltip' }).props('text')).toBe('Updated tooltip')
      
      await wrapper.setProps({ icon: 'fa-solid fa-star' })
      expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).props('icon')).toBe('fa-solid fa-star')
    })
  })

  describe('error handling', () => {
    it('handles missing optional props gracefully', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.iconSize).toBe('1x')
      expect(wrapper.vm.disabled).toBe(false)
    })

    it('handles empty tooltip text', () => {
      const wrapper = createWrapper({ tooltipText: '' })
      expect(wrapper.findComponent({ name: 'VTooltip' }).props('text')).toBe('')
    })

    it('handles invalid icon strings gracefully', () => {
      const wrapper = createWrapper({ icon: 'invalid-icon' })
      expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).props('icon')).toBe('invalid-icon')
    })
  })
})
