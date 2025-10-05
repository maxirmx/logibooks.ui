// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import NotificationEditView from '@/views/Notification_EditView.vue'
import NotificationSettings from '@/dialogs/Notification_Settings.vue'

const vuetify = createVuetify()

vi.mock('@/dialogs/Notification_Settings.vue', () => ({
  default: {
    name: 'Notification_Settings',
    props: ['mode', 'notificationId'],
    template: '<div data-test="notification-settings">Notification Settings Component</div>'
  }
}))

describe('Notification_EditView.vue', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(NotificationEditView, {
      props: { id: 5 },
      global: {
        plugins: [vuetify]
      }
    })
  })

  it('renders Notification_Settings component', () => {
    const settings = wrapper.findComponent(NotificationSettings)
    expect(settings.exists()).toBe(true)
  })

  it('passes edit mode and id to Notification_Settings', () => {
    const settings = wrapper.findComponent(NotificationSettings)
    expect(settings.props('mode')).toBe('edit')
    expect(settings.props('notificationId')).toBe(5)
  })

  it('renders placeholder content', () => {
    expect(wrapper.find('[data-test="notification-settings"]').exists()).toBe(true)
  })
})
