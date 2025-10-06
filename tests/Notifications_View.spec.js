// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import NotificationsView from '@/views/Notifications_View.vue'

vi.mock('@/lists/Notifications_List.vue', () => ({
  default: {
    name: 'Notifications_List',
    template: '<div data-testid="notifications-list">Notifications List</div>'
  }
}))

describe('Notifications_View.vue', () => {
  let vuetify
  let pinia

  beforeEach(() => {
    vuetify = createVuetify({
      components,
      directives
    })
    pinia = createPinia()
  })

  it('renders without errors', () => {
    const wrapper = mount(NotificationsView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('renders Notifications_List component', () => {
    const wrapper = mount(NotificationsView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    const list = wrapper.find('[data-testid="notifications-list"]')
    expect(list.exists()).toBe(true)
    expect(list.text()).toBe('Notifications List')
  })
})
