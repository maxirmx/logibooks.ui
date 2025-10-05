// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AirportEditView from '@/views/Airport_EditView.vue'

vi.mock('@/dialogs/Airport_Settings.vue', () => ({
  default: {
    name: 'Airport_Settings',
    props: ['mode', 'airportId'],
    template: '<div data-testid="airport-settings">Airport Settings (mode: {{ mode }}, id: {{ airportId }})</div>'
  }
}))

describe('Airport_EditView.vue', () => {
  let vuetify
  let pinia

  beforeEach(() => {
    vuetify = createVuetify({ components, directives })
    pinia = createPinia()
  })

  it('renders Airport_Settings in edit mode with passed id', () => {
    const wrapper = mount(AirportEditView, {
      props: { id: 42 },
      global: {
        plugins: [vuetify, pinia]
      }
    })

    const settings = wrapper.find('[data-testid="airport-settings"]')
    expect(settings.exists()).toBe(true)
    expect(settings.text()).toContain('mode: edit')
    expect(settings.text()).toContain('id: 42')
  })
})
