// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import WarehousesView from '@/views/Warehouses_View.vue'

vi.mock('@/lists/Warehouses_List.vue', () => ({
  default: {
    name: 'Warehouses_List',
    template: '<div data-testid="warehouses-list">Warehouses List Component</div>'
  }
}))

describe('Warehouses_View', () => {
  let vuetify
  let pinia

  beforeEach(() => {
    vuetify = createVuetify({
      components,
      directives
    })
    pinia = createPinia()
  })

  it('mounts successfully', () => {
    const wrapper = mount(WarehousesView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('renders Warehouses_List component', () => {
    const wrapper = mount(WarehousesView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    const warehousesListComponent = wrapper.find('[data-testid="warehouses-list"]')
    expect(warehousesListComponent.exists()).toBe(true)
    expect(warehousesListComponent.text()).toBe('Warehouses List Component')
  })

  it('has correct component structure', () => {
    const wrapper = mount(WarehousesView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    expect(wrapper.html()).toContain('Warehouses List Component')
  })
})
