// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ScanJobsCreateView from '@/views/ScanJobs_CreateView.vue'

vi.mock('@/dialogs/ScanJobs_Settings.vue', () => ({
  default: {
    name: 'ScanJobs_Settings',
    props: ['mode', 'registerId', 'warehouseId', 'dealNumber'],
    template: `
      <div data-testid="scanjobs-settings">
        ScanJobs Settings (mode: {{ mode }}, registerId: {{ registerId }}, warehouseId: {{ warehouseId }}, dealNumber: {{ dealNumber }})
      </div>
    `
  }
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: {
      registerId: '11',
      warehouseId: '22',
      dealNumber: 'D-22'
    }
  })
}))

describe('ScanJobs_CreateView.vue', () => {
  let vuetify
  let pinia

  beforeEach(() => {
    vuetify = createVuetify({ components, directives })
    pinia = createPinia()
  })

  it('renders ScanJobs_Settings in create mode', () => {
    const wrapper = mount(ScanJobsCreateView, {
      global: {
        plugins: [vuetify, pinia]
      }
    })

    const settings = wrapper.find('[data-testid="scanjobs-settings"]')
    expect(settings.exists()).toBe(true)
    expect(settings.text()).toContain('mode: create')
    expect(settings.text()).toContain('registerId: 11')
    expect(settings.text()).toContain('warehouseId: 22')
    expect(settings.text()).toContain('dealNumber: D-22')
  })
})
