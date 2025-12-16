// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ArticleWithH from '@/components/ArticleWithH.vue'
import ActionButton from '@/components/ActionButton.vue'

// Mock vee-validate
vi.mock('vee-validate', () => ({
  Field: {
    name: 'Field',
    template: '<input v-bind="$attrs" />',
    props: ['name', 'id', 'type', 'class']
  }
}))

// Mock FontAwesome
vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :class="[icon]"></i>',
    props: ['icon', 'size', 'class']
  }
}))

// Mock ozon.register.mapping
vi.mock('@/helpers/ozon.register.mapping.js', () => ({
  ozonRegisterColumnTitles: {
    article: 'Артикул'
  }
}))

// Global components
const globalComponents = {
  'font-awesome-icon': {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :class="[icon]"></i>',
    props: ['icon', 'size', 'class']
  },
  Field: {
    name: 'Field',
    template: '<input v-bind="$attrs" />',
    props: ['name', 'id', 'type', 'class']
  }
}

const vuetify = createVuetify({
  components,
  directives
})

describe('ArticleWithH', () => {
  const defaultProps = {
    name: 'article',
    item: { id: 1, article: 'TEST123' },
    errors: {}
  }

  function createWrapper(props = {}) {
    return mount(ArticleWithH, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [vuetify],
        components: globalComponents
      }
    })
  }

  describe('rendering', () => {
    it('renders the input field', () => {
      const wrapper = createWrapper()
      const field = wrapper.findComponent({ name: 'Field' })
      expect(field.exists()).toBe(true)
    })

    it('renders label with correct text', () => {
      const wrapper = createWrapper()
      const label = wrapper.find('label')
      expect(label.exists()).toBe(true)
      expect(label.text()).toContain('Артикул')
    })

    it('renders container with correct class', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.article-with-h').exists()).toBe(true)
      expect(wrapper.find('.article-with-h-container').exists()).toBe(true)
    })

    it('applies correct class to Field component', () => {
      const wrapper = createWrapper()
      const field = wrapper.findComponent({ name: 'Field' })
      expect(field.props()).toBeDefined()
    })
  })

  describe('button visibility', () => {
    it('hides button when notificationId is null', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: null }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.exists()).toBe(false)
    })

    it('hides button when notificationId is undefined', () => {
      const wrapper = createWrapper({
        item: { id: 1 }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.exists()).toBe(false)
    })

    it('shows button when notificationId is present', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.exists()).toBe(true)
    })

    it('shows button when notificationId is 0', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 0 }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.exists()).toBe(true)
    })
  })

  describe('button properties', () => {
    it('button has magenta variant', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('variant')).toBe('magenta')
    })

    it('button has 2x icon size', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('iconSize')).toBe('2x')
    })

    it('button has fa-h icon', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('icon')).toBe('fa-solid fa-h')
    })

    it('button receives item prop', () => {
      const item = { id: 1, notificationId: 123, article: 'TEST' }
      const wrapper = createWrapper({ item })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('item')).toEqual(item)
    })
  })

  describe('tooltip text', () => {
    it('shows default tooltip when no notification data', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 },
        notification: null
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('tooltipText')).toBe('Согласовать с нотификацией')
    })

    it('shows notification number in tooltip', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 },
        notification: { number: 'NOT-456' }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('tooltipText')).toContain('Номер: NOT-456')
    })

    it('shows registration date in tooltip', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 },
        notification: { registrationDate: '2024-01-15' }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('tooltipText')).toContain('Дата регистрации: 15.01.2024')
    })

    it('shows publication date in tooltip', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 },
        notification: { publicationDate: '2024-02-20' }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('tooltipText')).toContain('Дата публикации: 20.02.2024')
    })

    it('shows termination date in tooltip', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 },
        notification: { terminationDate: '2024-12-31' }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('tooltipText')).toContain('Срок действия: 31.12.2024')
    })

    it('shows all notification details in tooltip', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 },
        notification: {
          number: 'NOT-789',
          registrationDate: '2024-01-01',
          publicationDate: '2024-01-15',
          terminationDate: '2024-12-31'
        }
      })
      const button = wrapper.findComponent(ActionButton)
      const tooltipText = button.props('tooltipText')
      expect(tooltipText).toContain('Номер: NOT-789')
      expect(tooltipText).toContain('Дата регистрации: 01.01.2024')
      expect(tooltipText).toContain('Дата публикации: 15.01.2024')
      expect(tooltipText).toContain('Срок действия: 31.12.2024')
    })

    it('handles Date objects in tooltip', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 },
        notification: {
          registrationDate: new Date('2024-03-15')
        }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('tooltipText')).toContain('Дата регистрации: 15.03.2024')
    })

    it('handles object date format in tooltip', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 },
        notification: {
          registrationDate: { year: 2024, month: 4, day: 10 }
        }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('tooltipText')).toContain('Дата регистрации: 10.04.2024')
    })
  })

  describe('button interactions', () => {
    it('emits approve-notification event when button clicked', async () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 }
      })
      const button = wrapper.findComponent(ActionButton)
      
      await button.vm.$emit('click')
      
      expect(wrapper.emitted('approve-notification')).toBeTruthy()
      expect(wrapper.emitted('approve-notification')).toHaveLength(1)
    })

    it('emits approve-notification multiple times', async () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 }
      })
      const button = wrapper.findComponent(ActionButton)
      
      await button.vm.$emit('click')
      await button.vm.$emit('click')
      await button.vm.$emit('click')
      
      expect(wrapper.emitted('approve-notification')).toHaveLength(3)
    })
  })

  describe('disabled state', () => {
    it('button is enabled by default', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('disabled')).toBe(false)
    })

    it('button can be disabled', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 },
        disabled: true
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('disabled')).toBe(true)
    })

    it('button respects disabled prop changes', async () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 },
        disabled: false
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('disabled')).toBe(false)
      
      await wrapper.setProps({ disabled: true })
      expect(button.props('disabled')).toBe(true)
    })
  })

  describe('error handling', () => {
    it('passes error to Field component when errors present', () => {
      const wrapper = createWrapper({
        errors: { article: 'Поле обязательно' }
      })
      const field = wrapper.findComponent({ name: 'Field' })
      expect(field.exists()).toBe(true)
    })

    it('renders Field component when no errors', () => {
      const wrapper = createWrapper({
        errors: {}
      })
      const field = wrapper.findComponent({ name: 'Field' })
      expect(field.exists()).toBe(true)
    })

    it('handles null notification gracefully', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 },
        notification: null
      })
      expect(wrapper.exists()).toBe(true)
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('tooltipText')).toBe('Согласовать с нотификацией')
    })

    it('handles partial notification data', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 },
        notification: { number: 'NOT-123' }
      })
      const button = wrapper.findComponent(ActionButton)
      const tooltipText = button.props('tooltipText')
      expect(tooltipText).toContain('Номер: NOT-123')
      expect(tooltipText).not.toContain('undefined')
    })
  })

  describe('reactive updates', () => {
    it('shows button when notificationId is added', async () => {
      const wrapper = createWrapper({
        item: { id: 1 }
      })
      expect(wrapper.findComponent(ActionButton).exists()).toBe(false)
      
      await wrapper.setProps({
        item: { id: 1, notificationId: 456 }
      })
      expect(wrapper.findComponent(ActionButton).exists()).toBe(true)
    })

    it('hides button when notificationId is removed', async () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 }
      })
      expect(wrapper.findComponent(ActionButton).exists()).toBe(true)
      
      await wrapper.setProps({
        item: { id: 1, notificationId: null }
      })
      expect(wrapper.findComponent(ActionButton).exists()).toBe(false)
    })

    it('updates tooltip when notification data changes', async () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 },
        notification: { number: 'NOT-001' }
      })
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('tooltipText')).toContain('NOT-001')
      
      await wrapper.setProps({
        notification: { number: 'NOT-002' }
      })
      expect(button.props('tooltipText')).toContain('NOT-002')
    })
  })

  describe('integration scenarios', () => {
    it('works with complete parcel and notification data', () => {
      const wrapper = createWrapper({
        item: {
          id: 100,
          article: 'ARTICLE-123',
          notificationId: 50
        },
        notification: {
          number: 'NOT-999',
          registrationDate: '2024-01-01',
          publicationDate: '2024-01-15',
          terminationDate: '2024-12-31'
        }
      })
      
      expect(wrapper.find('input').exists()).toBe(true)
      expect(wrapper.findComponent(ActionButton).exists()).toBe(true)
      const tooltipText = wrapper.findComponent(ActionButton).props('tooltipText')
      expect(tooltipText).toContain('NOT-999')
      expect(tooltipText).toContain('01.01.2024')
    })

    it('works in disabled state during form submission', () => {
      const wrapper = createWrapper({
        item: { id: 1, notificationId: 123 },
        disabled: true
      })
      
      const button = wrapper.findComponent(ActionButton)
      expect(button.props('disabled')).toBe(true)
    })
  })

  describe('props validation', () => {
    it('requires name prop', () => {
      expect(ArticleWithH.props?.name?.required).toBe(true)
    })

    it('requires item prop', () => {
      expect(ArticleWithH.props?.item?.required).toBe(true)
    })

    it('has default for errors prop', () => {
      expect(ArticleWithH.props?.errors?.default).toBeDefined()
    })

    it('has default for notification prop', () => {
      expect(ArticleWithH.props?.notification?.default).toBe(null)
    })

    it('has default for disabled prop', () => {
      expect(ArticleWithH.props?.disabled?.default).toBe(false)
    })
  })
})
