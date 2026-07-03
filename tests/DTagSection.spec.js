/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DTagSection from '@/components/DTagSection.vue'

describe('DTagSection', () => {
  it('renders customs fee and duty below dtag values', () => {
    const wrapper = mount(DTagSection, {
      props: {
        item: {
          dTag: 'DT-1',
          dTagComment: 'comment',
          customsFee: 689,
          customsDuty: 750
        }
      }
    })

    expect(wrapper.text()).toContain('Сбор:')
    expect(wrapper.text()).toContain('Пошлина:')
    expect(wrapper.find('#customsFee').text()).toBe('689.00')
    expect(wrapper.find('#customsDuty').text()).toBe('750.00')
  })

  it('does not render charges row when both values are missing', () => {
    const wrapper = mount(DTagSection, {
      props: {
        item: {
          dTag: 'DT-1'
        }
      }
    })

    expect(wrapper.find('.customs-charges-row').exists()).toBe(false)
    expect(wrapper.find('#customsFee').exists()).toBe(false)
    expect(wrapper.find('#customsDuty').exists()).toBe(false)
  })

  it('renders dash for a missing charge value when the other charge is present', () => {
    const wrapper = mount(DTagSection, {
      props: {
        item: {
          dTag: 'DT-1',
          customsFee: null,
          customsDuty: 750
        }
      }
    })

    expect(wrapper.find('.customs-charges-row').exists()).toBe(true)
    expect(wrapper.find('#customsFee').text()).toBe('-')
    expect(wrapper.find('#customsDuty').text()).toBe('750.00')
  })
})
