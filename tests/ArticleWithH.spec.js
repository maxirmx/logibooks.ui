import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ArticleWithH from '@/components/ArticleWithH.vue'

// Mock the notification helper to avoid Pinia dependency
vi.mock('@/helpers/notification.helpers.js', () => ({
  buildNotificationTooltip: vi.fn().mockImplementation(async (item) => {
    if (item?.notificationNumber) {
      return `Notification: ${item.notificationNumber}`
    }
    return 'Tooltip information'
  })
}))

const globalStubs = {
  Field: {
    props: ['name', 'id', 'type', 'class', 'disabled'],
    template: '<input data-test="article-input" v-bind="$attrs" />'
  },
  ActionButton: {
    props: ['item', 'icon', 'tooltipText', 'iconSize', 'variant', 'disabled'],
    emits: ['click'],
    template:
      '<button class="action-button-stub" :data-tooltip="tooltipText" :data-variant="variant" :data-size="iconSize" @click="$emit(\'click\', item)">Action</button>'
  }
}

describe('ArticleWithH', () => {
  it('renders input without action button when notificationId is absent', () => {
    const wrapper = mount(ArticleWithH, {
      props: {
        item: { article: '123', notificationId: null },
        errors: {},
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    expect(wrapper.find('[data-test="article-input"]').exists()).toBe(true)
    expect(wrapper.find('.form-group').exists()).toBe(true)
    expect(wrapper.find('.action-button-stub').exists()).toBe(false)
  })

  it('shows action button with tooltip when notificationId is present', async () => {
    const wrapper = mount(ArticleWithH, {
      props: {
        item: {
          article: '123',
          notificationId: 99,
          notificationNumber: 'NT-99',
          notificationRegistrationDate: '2025-02-01'
        },
        errors: {},
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    // Wait for the async tooltip to be populated
    await wrapper.vm.$nextTick()
    
    const button = wrapper.find('.action-button-stub')
    expect(button.exists()).toBe(true)
    expect(button.attributes('data-tooltip')).toContain('NT-99')
    expect(button.attributes('data-variant')).toBe('magenta')
    expect(button.attributes('data-size')).toBe('1x')
    expect(wrapper.find('.action-buttons').exists()).toBe(true)
    expect(wrapper.find('.form-group').exists()).toBe(true)
  })

  it('emits approve-notification when action button is clicked', async () => {
    const wrapper = mount(ArticleWithH, {
      props: {
        item: {
          article: '123',
          notificationId: 10,
          notificationNumber: 'NT-10'
        },
        errors: {},
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    // Wait for the component to be fully mounted and async tooltip to load
    await wrapper.vm.$nextTick()
    
    await wrapper.find('.action-button-stub').trigger('click')
    expect(wrapper.emitted()['approve-notification']).toBeTruthy()
  })
})
