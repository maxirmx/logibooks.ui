// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GtcFormField from '@/components/GtcFormField.vue'
import { createPinia } from 'pinia'

describe('GtcFormField', () => {
  it('renders select field when as="select" prop is provided', () => {
    const wrapper = mount(GtcFormField, {
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

  it('handles empty errors object gracefully', () => {
    const wrapper = mount(GtcFormField, {
      props: {
        name: 'tnVed',
        errors: null
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          Field: {
            template: '<input :name="name" :class="classes" />',
            props: ['name', 'class'],
            computed: {
              classes() {
                return this.class
              }
            }
          }
        }
      }
    })

    expect(wrapper.find('input').classes()).not.toContain('is-invalid')
  })

})
