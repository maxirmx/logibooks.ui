/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelEventProcessingView from '@/views/ParcelEventProcessing_View.vue'

vi.mock('@/dialogs/ParcelEventsProcessing_Settings.vue', () => ({
  default: {
    name: 'ParcelEventsProcessingSettings',
    template: '<div data-testid="parcel-events-processing-settings-stub" />'
  }
}))

describe('ParcelEventProcessing_View.vue', () => {
  it('renders settings dialog wrapper', () => {
    const wrapper = mount(ParcelEventProcessingView)
    expect(wrapper.find('[data-testid="parcel-events-processing-settings-stub"]').exists()).toBe(true)
  })
})
