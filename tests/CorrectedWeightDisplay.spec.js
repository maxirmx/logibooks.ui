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
  it('displays the final server value without applying a register coefficient', () => {
    const view = render({ weight: 2, adjustedWeight: 1.111 })
    expect(view.text()).toContain('2.000')
    expect(view.text()).toContain('1.111')
    expect(view.find('[data-testid="arrow"]').exists()).toBe(true)
  })

  it.each([0, 1])('keeps a server adjusted value of %s instead of treating it as absent', (value) => {
    const view = render({ weight: 1, adjustedWeight: value })
    expect(view.find('[data-testid="arrow"]').exists()).toBe(true)
    expect(view.text()).toContain(value.toFixed(3))
  })

  it('displays a reconciled null-raw recipient', () => {
    const view = render({ weight: null, adjustedWeight: 0.001 })
    expect(view.text()).toContain('0.001')
    expect(view.find('[data-testid="arrow"]').exists()).toBe(true)
  })

  it('uses the raw display when a ready row has no applicable adjustment', () => {
    const view = render({ weight: 2, adjustedWeight: null })
    expect(view.text()).toBe('2.000')
    expect(view.find('[data-testid="arrow"]').exists()).toBe(false)
  })

  it('marks pending weights unavailable even if a cached adjusted value remains', async () => {
    const view = render({ weight: 2, adjustedWeight: 1.111, derivedTotalsPending: true })
    expect(view.get('[role="status"]').text()).toContain('пересчёт')
    expect(view.attributes('aria-busy')).toBe('true')
    expect(view.text()).not.toContain('1.111')
    expect(view.find('[data-testid="arrow"]').exists()).toBe(false)
    await view.setProps({ adjustedWeight: 1.112, derivedTotalsPending: false })
    expect(view.find('[role="status"]').exists()).toBe(false)
    expect(view.text()).toContain('1.112')
  })

  it('does not manufacture an adjustment when the API field is absent', () => {
    const view = render({ weight: 3 })
    expect(view.text()).toBe('3.000')
    expect(view.find('[data-testid="arrow"]').exists()).toBe(false)
  })
})
