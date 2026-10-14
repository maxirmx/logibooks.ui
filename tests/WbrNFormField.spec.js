// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import WbrNFormField from '@/components/WbrNFormField.vue'

function mountField(props, options = {}) {
  return mount(WbrNFormField, {
    props,
    slots: options.slots,
    global: {
      plugins: [createPinia()],
      stubs: {
        Field: options.fieldStub ?? {
          template: '<input :name="name" :id="id" :type="type" :step="step" :class="classes" />',
          props: ['name', 'id', 'type', 'step', 'class'],
          computed: {
            classes() {
              return this.class
            }
          }
        }
      }
    }
  })
}

describe('WbrNFormField', () => {
  it('renders select fields with slot content', () => {
    const wrapper = mountField(
      {
        name: 'currency',
        as: 'select',
        fullWidth: false,
        errors: {}
      },
      {
        slots: {
          default: '<option value="CNY">CNY</option>'
        },
        fieldStub: {
          template: '<select :name="name" :id="id" :class="classes"><slot /></select>',
          props: ['name', 'id', 'as', 'class'],
          computed: {
            classes() {
              return this.class
            }
          }
        }
      }
    )

    expect(wrapper.find('select').attributes('name')).toBe('currency')
    expect(wrapper.find('select').classes()).toContain('input')
    expect(wrapper.text()).toContain('CNY')
  })
})
