import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OzonFormField from '@/components/OzonFormField.vue'
import { createPinia } from 'pinia'

describe('OzonFormField', () => {
  it('renders correctly with required props', () => {
    const wrapper = mount(OzonFormField, {
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
    const wrapper = mount(OzonFormField, {
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
    const wrapper = mount(OzonFormField, {
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
    const wrapper = mount(OzonFormField, {
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

  it('displays correct label text from ozonRegisterColumnTitles', () => {
    const wrapper = mount(OzonFormField, {
      props: {
        name: 'postingNumber',
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
    // The label should contain text from ozonRegisterColumnTitles mapping
    expect(label.text()).toContain(':')
  })

  it('applies tooltip from ozonRegisterColumnTooltips', () => {
    const wrapper = mount(OzonFormField, {
      props: {
        name: 'tnVed',
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
    expect(label.attributes('title')).toBeDefined()
  })

  it('does not display validation error styling when no errors exist', () => {
    const wrapper = mount(OzonFormField, {
      props: {
        name: 'tnVed',
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

    expect(wrapper.find('input').classes()).not.toContain('is-invalid')
  })

  it('handles empty errors object gracefully', () => {
    const wrapper = mount(OzonFormField, {
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

  it('renders with default props when optional props are not provided', () => {
    const wrapper = mount(OzonFormField, {
      props: {
        name: 'productName'
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
    expect(wrapper.find('input').attributes('name')).toBe('productName')
  })

  it('passes step attribute only for non-select fields', () => {
    const wrapper = mount(OzonFormField, {
      props: {
        name: 'weightKg',
        type: 'number',
        step: '0.1',
        errors: {}
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          Field: {
            template: '<input :name="name" :type="type" :step="step" />',
            props: ['name', 'type', 'step']
          }
        }
      }
    })

    expect(wrapper.find('input').attributes('step')).toBe('0.1')
  })

  it('does not pass step attribute to select fields', () => {
    const wrapper = mount(OzonFormField, {
      props: {
        name: 'countryCode',
        as: 'select',
        step: '1',
        errors: {}
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          Field: {
            template: '<select :name="name" :step="step"><slot /></select>',
            props: ['name', 'as', 'step']
          }
        }
      }
    })

    expect(wrapper.find('select').attributes('step')).toBeUndefined()
  })

  describe('fullWidth prop', () => {
    it('uses full-width classes when fullWidth is true (default)', () => {
      const wrapper = mount(OzonFormField, {
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
      const wrapper = mount(OzonFormField, {
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
      const wrapper = mount(OzonFormField, {
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
      const wrapper = mount(OzonFormField, {
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
      const wrapper = mount(OzonFormField, {
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
  })
})
