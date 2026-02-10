// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CheckStatusActionsBar from '@/components/CheckStatusActionsBar.vue'
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

describe('CheckStatusActionsBar', () => {
  const defaultProps = {
    item: { id: 1, checkStatus: 0 },
    values: { field1: 'value1', field2: 'value2' },
    disabled: false
  }

  function createWrapper(props = {}) {
    return mount(CheckStatusActionsBar, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [vuetify],
        components: globalComponents
      }
    })
  }

  describe('rendering', () => {
    it('renders a container with action-buttons class', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.action-buttons').exists()).toBe(true)
    })

    it('renders five ActionButton components', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      expect(buttons).toHaveLength(5)
    })

    it('renders validate stopwords button with correct props', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      const validateSwButton = buttons[0]
      
      expect(validateSwButton.props('icon')).toBe('fa-solid fa-spell-check')
      expect(validateSwButton.props('tooltipText')).toBe('Сохранить и проверить стоп слова')
      expect(validateSwButton.props('item')).toEqual(defaultProps.item)
      expect(validateSwButton.props('disabled')).toBe(false)
      expect(validateSwButton.props('iconSize')).toBe('2x')
    })

    it('renders validate stopwords extended button with correct props', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      const validateSwExButton = buttons[1]
      
      expect(validateSwExButton.props('icon')).toBe('fa-solid fa-book-journal-whills')
      expect(validateSwExButton.props('tooltipText')).toBe('Сохранить и проверить стоп слова с учётом исторических данных')
      expect(validateSwExButton.props('item')).toEqual(defaultProps.item)
      expect(validateSwExButton.props('disabled')).toBe(false)
      expect(validateSwExButton.props('iconSize')).toBe('2x')
    })

    it('renders validate feacn codes button with correct props', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      const validateFcButton = buttons[2]
      
      expect(validateFcButton.props('icon')).toBe('fa-solid fa-anchor-circle-check')
      expect(validateFcButton.props('tooltipText')).toBe('Сохранить и проверить коды ТН ВЭД')
      expect(validateFcButton.props('item')).toEqual(defaultProps.item)
      expect(validateFcButton.props('disabled')).toBe(false)
      expect(validateFcButton.props('iconSize')).toBe('2x')
    })

    it('renders approve button with correct props', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      const approveButton = buttons[3]
      
      expect(approveButton.props('icon')).toBe('fa-solid fa-check-circle')
      expect(approveButton.props('tooltipText')).toBe('Сохранить и согласовать')
      expect(approveButton.props('item')).toEqual(defaultProps.item)
      expect(approveButton.props('disabled')).toBe(false)
      expect(approveButton.props('variant')).toBe('green')
      expect(approveButton.props('iconSize')).toBe('2x')
    })

    it('renders approve with excise button with correct props', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      const approveExciseButton = buttons[4]
      
      expect(approveExciseButton.props('icon')).toBe('fa-solid fa-check-circle')
      expect(approveExciseButton.props('tooltipText')).toBe('Сохранить и согласовать c акцизом')
      expect(approveExciseButton.props('item')).toEqual(defaultProps.item)
      expect(approveExciseButton.props('disabled')).toBe(false)
      expect(approveExciseButton.props('variant')).toBe('orange')
      expect(approveExciseButton.props('iconSize')).toBe('2x')
    })
  })

  describe('disabled state', () => {
    it('passes disabled prop to all ActionButtons when true', () => {
      const wrapper = createWrapper({ disabled: true })
      const buttons = wrapper.findAllComponents(ActionButton)
      
      buttons.forEach(button => {
        expect(button.props('disabled')).toBe(true)
      })
    })

    it('passes disabled prop to all ActionButtons when false', () => {
      const wrapper = createWrapper({ disabled: false })
      const buttons = wrapper.findAllComponents(ActionButton)
      
      buttons.forEach(button => {
        expect(button.props('disabled')).toBe(false)
      })
    })
  })

  describe('event emissions', () => {
    it('emits validate-sw event when validate stopwords button is clicked', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      
      await buttons[0].vm.$emit('click')
      
      expect(wrapper.emitted('validate-sw')).toBeTruthy()
      expect(wrapper.emitted('validate-sw')?.[0]).toEqual([defaultProps.values])
    })

    it('emits validate-sw-ex event when validate stopwords extended button is clicked', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      
      await buttons[1].vm.$emit('click')
      
      expect(wrapper.emitted('validate-sw-ex')).toBeTruthy()
      expect(wrapper.emitted('validate-sw-ex')?.[0]).toEqual([defaultProps.values])
    })

    it('emits validate-fc event when validate feacn codes button is clicked', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      
      await buttons[2].vm.$emit('click')
      
      expect(wrapper.emitted('validate-fc')).toBeTruthy()
      expect(wrapper.emitted('validate-fc')?.[0]).toEqual([defaultProps.values])
    })

    it('emits approve event when approve button is clicked', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      
      await buttons[3].vm.$emit('click')
      
      expect(wrapper.emitted('approve')).toBeTruthy()
      expect(wrapper.emitted('approve')?.[0]).toEqual([defaultProps.values])
    })

    it('emits approve-excise event when approve with excise button is clicked', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAllComponents(ActionButton)
      
      await buttons[4].vm.$emit('click')
      
      expect(wrapper.emitted('approve-excise')).toBeTruthy()
      expect(wrapper.emitted('approve-excise')?.[0]).toEqual([defaultProps.values])
    })

    it('passes different values to emitted events', async () => {
      const customValues = { customField: 'customValue' }
      const wrapper = createWrapper({ values: customValues })
      const buttons = wrapper.findAllComponents(ActionButton)
      
      await buttons[0].vm.$emit('click')
      await buttons[1].vm.$emit('click')
      await buttons[2].vm.$emit('click')
      await buttons[3].vm.$emit('click')
      await buttons[4].vm.$emit('click')
      
      expect(wrapper.emitted('validate-sw')?.[0]).toEqual([customValues])
      expect(wrapper.emitted('validate-sw-ex')?.[0]).toEqual([customValues])
      expect(wrapper.emitted('validate-fc')?.[0]).toEqual([customValues])
      expect(wrapper.emitted('approve')?.[0]).toEqual([customValues])
      expect(wrapper.emitted('approve-excise')?.[0]).toEqual([customValues])
    })
  })

  describe('props validation', () => {
    it('passes item prop to all ActionButtons', () => {
      const customItem = { id: 99, checkStatus: 5 }
      const wrapper = createWrapper({ item: customItem })
      const buttons = wrapper.findAllComponents(ActionButton)
      
      buttons.forEach(button => {
        expect(button.props('item')).toEqual(customItem)
      })
    })

    it('uses default disabled value when not provided', () => {
      const wrapper = mount(CheckStatusActionsBar, {
        props: {
          item: defaultProps.item,
          values: defaultProps.values
        },
        global: {
          plugins: [vuetify],
          components: globalComponents
        }
      })
      
      const buttons = wrapper.findAllComponents(ActionButton)
      buttons.forEach(button => {
        expect(button.props('disabled')).toBe(false)
      })
    })
  })
})
