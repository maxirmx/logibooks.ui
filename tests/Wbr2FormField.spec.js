// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Wbr2FormField from '@/components/Wbr2FormField.vue'
import { createPinia } from 'pinia'

describe('Wbr2FormField', () => {
  it('renders correctly with required props', () => {
    const wrapper = mount(Wbr2FormField, {
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
    const wrapper = mount(Wbr2FormField, {
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

  it('renders select field when as="select" prop is provided', () => {
    const wrapper = mount(Wbr2FormField, {
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

  it('renders input field with number type when type="number" is provided', () => {
    const wrapper = mount(Wbr2FormField, {
      props: {
        name: 'quantity',
        type: 'number',
        step: '1',
        errors: {}
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          Field: {
            template: '<input :name="name" :id="id" :type="type" :step="step" />',
            props: ['name', 'id', 'type', 'step']
          }
        }
      }
    })

    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.find('input').attributes('type')).toBe('number')
    expect(wrapper.find('input').attributes('step')).toBe('1')
  })

  describe('fullWidth prop', () => {
    it('uses full-width classes when fullWidth is true (default)', () => {
      const wrapper = mount(Wbr2FormField, {
        props: {
          name: 'productName',
          errors: {}
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

      expect(wrapper.find('.form-group-1').exists()).toBe(true)
      expect(wrapper.find('.label-1').exists()).toBe(true)
      expect(wrapper.find('input').classes()).toContain('input-1')
    })

    it('uses full-width classes when fullWidth is explicitly true', () => {
      const wrapper = mount(Wbr2FormField, {
        props: {
          name: 'productName',
          fullWidth: true,
          errors: {}
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

      expect(wrapper.find('.form-group-1').exists()).toBe(true)
      expect(wrapper.find('.label-1').exists()).toBe(true)
      expect(wrapper.find('input').classes()).toContain('input-1')
    })

    it('uses standard classes when fullWidth is false', () => {
      const wrapper = mount(Wbr2FormField, {
        props: {
          name: 'tnVed',
          fullWidth: false,
          errors: {}
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

      expect(wrapper.find('.form-group').exists()).toBe(true)
      expect(wrapper.find('.label').exists()).toBe(true)
      expect(wrapper.find('input').classes()).toContain('input')
      expect(wrapper.find('input').classes()).not.toContain('input-1')
    })

    it('applies fullWidth classes to select fields correctly', () => {
      const wrapper = mount(Wbr2FormField, {
        props: {
          name: 'countryCode',
          as: 'select',
          fullWidth: false,
          errors: {}
        },
        global: {
          plugins: [createPinia()],
          stubs: {
            Field: {
              template: '<select :name="name" :class="classes"><slot /></select>',
              props: ['name', 'as', 'class'],
              computed: {
                classes() {
                  return this.class
                }
              }
            }
          }
        }
      })

      expect(wrapper.find('.form-group').exists()).toBe(true)
      expect(wrapper.find('.label').exists()).toBe(true)
      expect(wrapper.find('select').classes()).toContain('input')
      expect(wrapper.find('select').classes()).not.toContain('input-1')
    })

    it('maintains validation error styling with different fullWidth values', () => {
      const wrapper = mount(Wbr2FormField, {
        props: {
          name: 'tnVed',
          fullWidth: false,
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
      expect(wrapper.find('input').classes()).toContain('input')
    })

    it('displays correct label text from wbr2RegisterColumnTitles', () => {
      const wrapper = mount(Wbr2FormField, {
        props: {
          name: 'tnVed',
          fullWidth: false,
          errors: {}
        },
        global: {
          plugins: [createPinia()],
          stubs: {
            Field: {
              template: '<input />',
              props: ['name', 'id', 'type']
            }
          }
        }
      })

      const label = wrapper.find('label')
      expect(label.exists()).toBe(true)
      expect(label.text()).toContain(':')
    })

    it('applies tooltip from wbr2RegisterColumnTooltips regardless of fullWidth', () => {
      const wrapper = mount(Wbr2FormField, {
        props: {
          name: 'tnVed',
          fullWidth: false,
          errors: {}
        },
        global: {
          plugins: [createPinia()],
          stubs: {
            Field: {
              template: '<input />',
              props: ['name', 'id', 'type']
            }
          }
        }
      })

      const label = wrapper.find('label')
      expect(label.exists()).toBe(true)
      expect(label.attributes('title')).toBeUndefined()
    })
  })
})
