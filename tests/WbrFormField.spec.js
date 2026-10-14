// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WbrFormField from '@/components/WbrFormField.vue'
import { createPinia } from 'pinia'

describe('WbrFormField', () => {
  it('renders select field when as="select" prop is provided', () => {
    const wrapper = mount(WbrFormField, {
      props: {
        name: 'countryCode',
        as: 'select',
        errors: {}
      },
      slots: {
        default: '<option value="1">Test Option</option>'
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          Field: {
            template: '<select :name="name" :id="id"><slot /></select>',
            props: ['name', 'id', 'as']
          }
        }
      }
    })

    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.find('select').attributes('name')).toBe('countryCode')
    expect(wrapper.text()).toContain('Test Option')
  })

})
