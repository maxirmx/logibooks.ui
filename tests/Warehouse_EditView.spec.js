// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import WarehouseEditView from '@/views/Warehouse_EditView.vue'

vi.mock('@/dialogs/Warehouse_Settings.vue', () => ({
  default: {
    name: 'Warehouse_Settings',
    props: ['mode', 'warehouseId'],
    template: '<div data-testid="warehouse-settings">Warehouse Settings (mode: {{ mode }}, id: {{ warehouseId }})</div>'
  }
}))

describe('Warehouse_EditView.vue', () => {
  let vuetify
  let pinia

  beforeEach(() => {
    vuetify = createVuetify({ components, directives })
    pinia = createPinia()
  })

  it('renders Warehouse_Settings in edit mode with id', () => {
    const wrapper = mount(WarehouseEditView, {
      props: {
        id: 5
      },
      global: {
        plugins: [vuetify, pinia]
      }
    })

    const settings = wrapper.find('[data-testid="warehouse-settings"]')
    expect(settings.exists()).toBe(true)
    expect(settings.text()).toContain('mode: edit')
    expect(settings.text()).toContain('id: 5')
  })
})
