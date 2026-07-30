/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelStatusesView from '@/views/ParcelStatuses_View.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

// Mock the ParcelStatuses_List component
vi.mock('@/lists/ParcelStatuses_List.vue', () => ({
  default: {
    name: 'ParcelStatusesList',
    template: '<div class="parcel-statuses-list-stub" data-testid="parcel-statuses-list">ParcelStatuses List Component</div>'
  }
}))

describe('ParcelStatuses_View.vue', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(ParcelStatusesView, {
      global: {
        stubs: defaultGlobalStubs
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Template Structure', () => {

    it('does not add unnecessary wrapper elements', () => {
      // Should directly render the OrderStatuses component
      expect(wrapper.element.tagName.toLowerCase()).toBe('div')
    })
  })
})

