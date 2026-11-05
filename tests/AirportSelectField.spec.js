// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AirportSelectField from '@/components/AirportSelectField.vue'

describe('AirportSelectField', () => {
  it('handles an unavailable airport list', () => {
    const wrapper = mount(AirportSelectField, {
      props: { label: 'Аэропорт назначения:', name: 'arrivalAirportId', airports: null }
    })
    expect(wrapper.findAll('option')).toHaveLength(1)
    wrapper.unmount()
  })
})
