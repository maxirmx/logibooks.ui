/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { DOMWrapper, mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VTooltip } from 'vuetify/components'
import CustomsChargeDisplay from '@/components/CustomsChargeDisplay.vue'
import DTagSection from '@/components/DTagSection.vue'
import {
  getCustomsChargeValue, hasCustomsCharges, isGroupedCustomsCharge, clearCustomsCharges,
  GROUP_CUSTOMS_CHARGE_TOOLTIP
} from '@/helpers/customs.charges.helpers.js'

const global = {
  plugins: [createVuetify({ components: { VTooltip } })],
  stubs: { 'font-awesome-icon': { props: ['icon'], template: '<i :data-icon="icon" />' } }
}

beforeEach(() => {
  vi.stubGlobal('visualViewport', null)
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { vi.unstubAllGlobals() })

describe('customs charges for a fellow group', () => {
  it.each([0, 1231])('displays the shared fee when this row stores %s', stored => {
    const wrapper = mount(DTagSection, { global, props: { item: {
      customsFee: stored, customsDuty: 0, customsChargeGroup: { customsFee: 1231, customsDuty: 0 }
    } } })
    expect(wrapper.findAll('.customs-charge-value').map(w => w.text())).toEqual(['1231.00', '0.00'])
    const marker = wrapper.get('.customs-charge-group-marker')
    expect(wrapper.getComponent(VTooltip).props('text')).toBe('Суммарные таможенные платежи для всех товаров в посылке')
    expect(marker.attributes('title')).toBeUndefined()
    expect(marker.attributes('aria-label')).toBe(GROUP_CUSTOMS_CHARGE_TOOLTIP)
    expect(marker.get('i').attributes('data-icon')).toBe('fa-solid fa-comment-dots')
    expect(wrapper.findAll('.customs-charge-group-marker')).toHaveLength(1)
    wrapper.unmount()
  })

  it.each(['hover', 'keyboard'])('opens and closes the Vuetify tooltip on %s', async interaction => {
    const wrapper = mount(CustomsChargeDisplay, {
      attachTo: document.body, global,
      props: { item: { customsChargeGroup: { customsFee: 689 } }, field: 'customsFee' }
    })
    try {
      const marker = wrapper.get('.customs-charge-group-marker')
      expect(marker.attributes('tabindex')).toBe('0')
      if (interaction === 'hover') await marker.trigger('mouseenter')
      else marker.element.focus()
      await flushPromises()
      await vi.waitFor(() => {
        const tooltip = document.getElementById(marker.attributes('aria-describedby'))
        expect(tooltip).not.toBeNull()
        expect(new DOMWrapper(tooltip.querySelector('.v-overlay__content')).isVisible()).toBe(true)
        expect(tooltip.textContent).toContain('Суммарные таможенные платежи для всех товаров в посылке')
      })
      if (interaction === 'hover') await marker.trigger('mouseleave')
      else marker.element.blur()
      await vi.waitFor(() => {
        const tooltip = document.getElementById(marker.attributes('aria-describedby'))
        const content = tooltip?.querySelector('.v-overlay__content')
        expect(!content || !new DOMWrapper(content).isVisible()).toBe(true)
      })
    } finally {
      wrapper.unmount()
    }
  })

  it('shows both shared amounts even when raw fields are absent', () => {
    const wrapper = mount(DTagSection, { global, props: { item: {
      customsChargeGroup: { customsFee: 689, customsDuty: 1500 }
    } } })
    expect(wrapper.find('.customs-charges-row').exists()).toBe(true)
    expect(wrapper.findAll('.customs-charge-value').map(w => w.text())).toEqual(['689.00', '1500.00'])
    expect(wrapper.findAll('[role="img"]')).toHaveLength(2)
    wrapper.unmount()
  })

  it.each([
    { customsFee: 1231 }, { customsFee: null }, { customsChargeGroup: { customsFee: 0 } },
    { customsFee: 99, customsChargeGroup: { customsFee: 0 } }
  ])('uses legacy or zero presentation without a group marker: %j', item => {
    const wrapper = mount(CustomsChargeDisplay, { global, props: { item, field: 'customsFee' } })
    expect(wrapper.find('.customs-charge-group-marker').exists()).toBe(false)
    expect(getCustomsChargeValue(item, 'customsFee')).toBe(item.customsChargeGroup?.customsFee ?? item.customsFee)
    wrapper.unmount()
  })

  it('handles absent values and invalid numeric values consistently', () => {
    expect(hasCustomsCharges(null)).toBe(false)
    expect(hasCustomsCharges({ customsDuty: 0 })).toBe(true)
    expect(isGroupedCustomsCharge({ customsChargeGroup: { customsFee: 'invalid' } }, 'customsFee')).toBe(false)
    expect(clearCustomsCharges({ id: 1, customsFee: 1231, customsChargeGroup: {} }))
      .toEqual({ id: 1, customsFee: null, customsDuty: null, customsChargeGroup: null })
    const wrapper = mount(DTagSection, { global, props: { item: { customsFee: 'invalid', customsDuty: '1,25' } } })
    expect(wrapper.findAll('.customs-charge-value').map(w => w.text())).toEqual(['-', '1.25'])
    wrapper.unmount()
  })
})
