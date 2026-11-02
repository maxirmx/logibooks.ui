/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomsChargeDisplay from '@/components/CustomsChargeDisplay.vue'
import DTagSection from '@/components/DTagSection.vue'
import { getCustomsChargeValue } from '@/helpers/customs.charges.helpers'

const global = {
  stubs: {
    'font-awesome-icon': { template: '<i class="icon" />' },
    'v-tooltip': {
      name: 'VTooltip',
      props: ['text', 'location', 'openDelay'],
      template: '<div><slot name="activator" :props="{ \'data-tooltip-activator\': true }" /></div>'
    }
  }
}

describe('saved customs charge groups', () => {
  it.each(['customsFee', 'customsDuty'])('displays the complete group %s even when this row stores zero', field => {
    const item = { customsFee: 0, customsDuty: 0, customsChargeGroup: { customsFee: 1231, customsDuty: 800 } }
    const wrapper = mount(CustomsChargeDisplay, { props: { item, field, formatter: String }, global })
    expect(wrapper.text()).toContain(String(item.customsChargeGroup[field]))
    const marker = wrapper.get('[role="img"]')
    expect(wrapper.getComponent({ name: 'VTooltip' }).props()).toMatchObject({
      text: 'Общая сумма таможенных платежей для всех товаров в посылке', location: 'top', openDelay: '300'
    })
    expect(marker.attributes('data-tooltip-activator')).toBe('true')
    expect(marker.attributes('title')).toBeUndefined()
    expect(marker.attributes('tabindex')).toBe('0')
    expect(marker.attributes('aria-label')).toBe('Общая сумма таможенных платежей для всех товаров в посылке')
    expect(marker.get('.icon').attributes('icon')).toBe('fa-solid fa-comment-dots')
  })

  it.each([undefined, null, { customsFee: 0, customsDuty: 0 }])('omits the marker for absent or zero group amounts: %s', customsChargeGroup => {
    const item = { customsFee: customsChargeGroup ? 0 : 1231, customsChargeGroup }
    const wrapper = mount(CustomsChargeDisplay, { props: { item, formatter: String }, global })
    expect(wrapper.find('[role="img"]').exists()).toBe(false)
    expect(wrapper.text()).toContain(String(item.customsFee))
  })

  it('retains empty and legacy fallbacks', () => {
    expect(getCustomsChargeValue(null, 'customsFee')).toBeUndefined()
    expect(getCustomsChargeValue({ customsFee: 10 }, 'customsFee')).toBe(10)
    expect(getCustomsChargeValue({ customsFee: 10, customsChargeGroup: {} }, 'customsFee')).toBe(10)
    expect(mount(CustomsChargeDisplay, { global }).find('[role="img"]').exists()).toBe(false)
  })

  it('uses group values in the detail section and preserves its decimal formatting', () => {
    const wrapper = mount(DTagSection, { props: { item: { customsChargeGroup: { customsFee: 1231, customsDuty: 0 } } }, global })
    expect(wrapper.get('#customsFee').text()).toBe('1231.00')
    expect(wrapper.get('#customsDuty').text()).toBe('0.00')
    expect(wrapper.findAll('[role="img"]')).toHaveLength(1)
  })
})
