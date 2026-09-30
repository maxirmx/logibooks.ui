// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CorrectedWeightDisplay from '@/components/CorrectedWeightDisplay.vue'

const fontAwesomeIconStub = {
  name: 'font-awesome-icon',
  props: ['icon'],
  template: '<i :data-icon="icon" class="fa-stub"></i>'
}

function mountDisplay(props) {
  return mount(CorrectedWeightDisplay, {
    props,
    global: {
      stubs: {
        'font-awesome-icon': fontAwesomeIconStub
      }
    }
  })
}

describe('CorrectedWeightDisplay', () => {

  it('falls back to plain formatted weight when correction is disabled', () => {
    const wrapper = mountDisplay({
      weight: 2.4,
      register: {
        realWeightKg: 5,
        totalWeightKgToRelease: 10
      },
      useCorrection: false
    })

    expect(wrapper.find('.corrected-weight-display').exists()).toBe(false)
    expect(wrapper.text()).toBe('2.400')
  })
})
