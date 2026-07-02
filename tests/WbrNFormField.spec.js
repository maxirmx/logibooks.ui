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
  it('renders the WbrN label and default full-width input', () => {
    const wrapper = mountField({
      name: 'productCountryName',
      errors: {}
    })

    expect(wrapper.find('label').text()).toBe('Страна:')
    expect(wrapper.find('.form-group-1').exists()).toBe(true)
    expect(wrapper.find('.label-1').exists()).toBe(true)
    expect(wrapper.find('input').attributes('name')).toBe('productCountryName')
    expect(wrapper.find('input').classes()).toContain('input-1')
  })

  it('uses compact classes and validation styling when fullWidth is false', () => {
    const wrapper = mountField({
      name: 'recipientCity',
      fullWidth: false,
      errors: { recipientCity: 'Required' }
    })

    expect(wrapper.find('label').text()).toBe('Город получателя:')
    expect(wrapper.find('.form-group').exists()).toBe(true)
    expect(wrapper.find('.label').exists()).toBe(true)
    expect(wrapper.find('input').classes()).toContain('input')
    expect(wrapper.find('input').classes()).toContain('is-invalid')
    expect(wrapper.find('input').classes()).not.toContain('input-1')
  })

  it('passes number type and step through to the Field component', () => {
    const wrapper = mountField({
      name: 'quantity',
      type: 'number',
      step: '1.0',
      errors: {}
    })

    expect(wrapper.find('input').attributes('type')).toBe('number')
    expect(wrapper.find('input').attributes('step')).toBe('1.0')
  })

  it('renders select fields with slot content', () => {
    const wrapper = mountField({
      name: 'currency',
      as: 'select',
      fullWidth: false,
      errors: {}
    }, {
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
    })

    expect(wrapper.find('select').attributes('name')).toBe('currency')
    expect(wrapper.find('select').classes()).toContain('input')
    expect(wrapper.text()).toContain('CNY')
  })
})
