import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WbrFormField from '@/components/WbrFormField.vue'
import { createPinia } from 'pinia'

describe('WbrFormField', () => {
  it('renders correctly with required props', () => {
    const wrapper = mount(WbrFormField, {
      props: {
        name: 'tnVed',
        errors: {}
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          Field: {
            template: '<input :name="name" :id="id" :type="type" />',
            props: ['name', 'id', 'type', 'step', 'as']
          }
        }
      }
    })

    expect(wrapper.find('label').exists()).toBe(true)
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.find('input').attributes('name')).toBe('tnVed')
  })

  it('displays validation error styling when errors exist', () => {
    const wrapper = mount(WbrFormField, {
      props: {
        name: 'tnVed',
        errors: { tnVed: 'Required field' }
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

    expect(wrapper.find('input').classes()).toContain('is-invalid')
  })
})
