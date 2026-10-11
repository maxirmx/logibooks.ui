// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AirportSelectField from '@/components/AirportSelectField.vue'

describe('AirportSelectField', () => {
  it('defaults to an optional selector with an unselected option', () => {
    const wrapper = mount(AirportSelectField, {
      props: { label: 'Аэропорт отправления:', name: 'departureAirportId' }
    })
    expect(wrapper.get('label').text()).toBe('Аэропорт отправления:')
    expect(wrapper.get('label').attributes('for')).toBe('departureAirportId')
    expect(wrapper.get('select').attributes('aria-required')).toBe('false')
    expect(wrapper.get('select').attributes('aria-invalid')).toBe('false')
    expect(wrapper.get('select').attributes('aria-describedby')).toBeUndefined()
    expect(wrapper.findAll('option')).toHaveLength(1)
    expect(wrapper.get('option').attributes('value')).toBe('0')
    expect(wrapper.find('.invalid-feedback').exists()).toBe(false)
    wrapper.unmount()
  })

  it('handles an unavailable airport list', () => {
    const wrapper = mount(AirportSelectField, {
      props: { label: 'Аэропорт назначения:', name: 'arrivalAirportId', airports: null }
    })
    expect(wrapper.findAll('option')).toHaveLength(1)
    wrapper.unmount()
  })
})
