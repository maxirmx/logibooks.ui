// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AirportCreateView from '@/views/Airport_CreateView.vue'

vi.mock('@/dialogs/Airport_Settings.vue', () => ({
  default: {
    name: 'Airport_Settings',
    props: ['mode'],
    template: '<div data-testid="airport-settings">Airport Settings (mode: {{ mode }})</div>'
  }
}))

describe('Airport_CreateView.vue', () => {
  let vuetify
  let pinia

  beforeEach(() => {
    vuetify = createVuetify({ components, directives })
    pinia = createPinia()
  })

  it('renders Airport_Settings in create mode', () => {
    const wrapper = mount(AirportCreateView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    const settings = wrapper.find('[data-testid="airport-settings"]')
    expect(settings.exists()).toBe(true)
    expect(settings.text()).toContain('mode: create')
  })
})
