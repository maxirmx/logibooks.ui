// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import WarehouseCreateView from '@/views/Warehouse_CreateView.vue'

vi.mock('@/dialogs/Warehouse_Settings.vue', () => ({
  default: {
    name: 'Warehouse_Settings',
    props: ['mode'],
    template: '<div data-testid="warehouse-settings">Warehouse Settings (mode: {{ mode }})</div>'
  }
}))

describe('Warehouse_CreateView.vue', () => {
  let vuetify
  let pinia

  beforeEach(() => {
    vuetify = createVuetify({ components, directives })
    pinia = createPinia()
  })

  it('renders Warehouse_Settings in create mode', () => {
    const wrapper = mount(WarehouseCreateView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    const settings = wrapper.find('[data-testid="warehouse-settings"]')
    expect(settings.exists()).toBe(true)
    expect(settings.text()).toContain('mode: create')
  })
})
