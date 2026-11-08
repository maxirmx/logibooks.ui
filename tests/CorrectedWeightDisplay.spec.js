// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CorrectedWeightDisplay from '@/components/CorrectedWeightDisplay.vue'

function render(props) {
  return mount(CorrectedWeightDisplay, {
    props,
    global: { stubs: { 'font-awesome-icon': { template: '<i data-testid="arrow" />' } } }
  })
}

describe('Core adjusted weights', () => {
  it.each([
    0
  ])('keeps a server adjusted value of %s instead of treating it as absent', (value) => {
    const view = render({ weight: 1, adjustedWeight: value })
    expect(view.find('[data-testid="arrow"]').exists()).toBe(true)
    expect(view.text()).toContain(value.toFixed(3))
  })

})
