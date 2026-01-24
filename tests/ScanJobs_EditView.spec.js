// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ScanJobsEditView from '@/views/ScanJobs_EditView.vue'

vi.mock('@/dialogs/ScanJobs_Settings.vue', () => ({
  default: {
    name: 'ScanJobs_Settings',
    props: ['mode', 'scanjobId'],
    template: '<div data-testid="scanjobs-settings">ScanJobs Settings (mode: {{ mode }}, id: {{ scanjobId }})</div>'
  }
}))

describe('ScanJobs_EditView.vue', () => {
  let vuetify
  let pinia

  beforeEach(() => {
    vuetify = createVuetify({ components, directives })
    pinia = createPinia()
  })

  it('renders ScanJobs_Settings in edit mode with id', () => {
    const wrapper = mount(ScanJobsEditView, {
      props: { id: 5 },
      global: {
        plugins: [vuetify, pinia]
      }
    })

    const settings = wrapper.find('[data-testid="scanjobs-settings"]')
    expect(settings.exists()).toBe(true)
    expect(settings.text()).toContain('mode: edit')
    expect(settings.text()).toContain('id: 5')
  })
})
