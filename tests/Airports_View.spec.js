// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AirportsView from '@/views/Airports_View.vue'

vi.mock('@/lists/Airports_List.vue', () => ({
  default: {
    name: 'Airports_List',
    template: '<div data-testid="airports-list">Airports List Component</div>'
  }
}))

describe('Airports_View.vue', () => {
  let vuetify
  let pinia

  beforeEach(() => {
    vuetify = createVuetify({ components, directives })
    pinia = createPinia()
  })

  it('mounts successfully', () => {
    const wrapper = mount(AirportsView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('renders Airports_List component', () => {
    const wrapper = mount(AirportsView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    const list = wrapper.find('[data-testid="airports-list"]')
    expect(list.exists()).toBe(true)
    expect(list.text()).toBe('Airports List Component')
  })

  it('wraps Airports_List component correctly', () => {
    const wrapper = mount(AirportsView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    expect(wrapper.html()).toContain('Airports List Component')
  })
})
