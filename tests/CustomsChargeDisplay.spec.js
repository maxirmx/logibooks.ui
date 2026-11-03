/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomsChargeDisplay from '@/components/CustomsChargeDisplay.vue'
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
  it('retains empty and legacy fallbacks', () => {
    expect(getCustomsChargeValue(null, 'customsFee')).toBeUndefined()
    expect(getCustomsChargeValue({ customsFee: 10 }, 'customsFee')).toBe(10)
    expect(getCustomsChargeValue({ customsFee: 10, customsChargeGroup: {} }, 'customsFee')).toBe(10)
    expect(mount(CustomsChargeDisplay, { global }).find('[role="img"]').exists()).toBe(false)
  })

})
