/* @vitest-environment jsdom */

// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// This file is a part of Media Pi frontend application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { Form } from 'vee-validate'
import * as Yup from 'yup'
import FieldArrayWithButtons from '@/components/FieldArrayWithButtons.vue'

// Mock ActionButton
vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    template: '<button @click="$emit(\'click\', item)" :disabled="disabled" :class="$attrs.class"><slot /></button>',
    props: ['item', 'icon', 'tooltipText', 'disabled'],
    emits: ['click']
  }
}))

const createWrapper = (props = {}, initialValues = { testField: [''] }) => {
  const schema = Yup.object().shape({
    testField: Yup.array().of(Yup.string())
  })

  return mount({
    template: `
      <Form :validation-schema="schema" :initial-values="initialValues" v-slot="{ errors }">
        <FieldArrayWithButtons 
          name="testField"
          label="Test Field"
          :has-error="hasError || !!errors.testField"
          v-bind="componentProps"
        />
      </Form>
    `,
    components: { Form, FieldArrayWithButtons },
    setup() {
      return { 
        schema, 
        initialValues, 
        componentProps: props,
        hasError: props.hasError || false
      }
    }
  })
}

describe('FieldArrayWithButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default props', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    
    expect(wrapper.find('label').text()).toBe('Test Field:')
    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.findAll('button')).toHaveLength(2) // plus and minus buttons
  })

  it('renders with select field type and options', async () => {
    const options = [
      { value: 1, text: 'Option 1' },
      { value: 2, text: 'Option 2' }
    ]
    
    const wrapper = createWrapper({
      fieldType: 'select',
      options,
      placeholder: 'Choose option:'
    })
    await flushPromises()
    
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    
    const optionElements = select.findAll('option')
    expect(optionElements).toHaveLength(3) // placeholder + 2 options
    expect(optionElements[0].text()).toBe('Choose option:')
    expect(optionElements[1].text()).toBe('Option 1')
    expect(optionElements[2].text()).toBe('Option 2')
  })

  it('renders with input field type', async () => {
    const wrapper = createWrapper({
      fieldType: 'input',
      fieldProps: { type: 'text', placeholder: 'Enter text' }
    })
    await flushPromises()
    
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
  })

  it('renders with textarea field type', async () => {
    const wrapper = createWrapper({
      fieldType: 'textarea',
      fieldProps: { placeholder: 'Enter text', rows: 3 }
    })
    await flushPromises()
    
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('applies error styling when hasError is true', async () => {
    const wrapper = createWrapper({ hasError: true })
    await flushPromises()
    
    // The field should have the is-invalid class when hasError is true
    const field = wrapper.find('.field-container-select')
    expect(field.exists()).toBe(true)
    expect(field.classes()).toContain('is-invalid')
  })

  it('disables minus button when only one field exists', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    
    const buttons = wrapper.findAll('button')
    const minusButton = buttons.find(btn => btn.classes().includes('ml-2'))
    expect(minusButton.attributes('disabled')).toBeDefined()
  })

  it('shows plus button only on first field', async () => {
    const wrapper = createWrapper({}, { testField: ['', ''] }) // two fields
    await flushPromises()

    const containers = wrapper.findAll('.field-container')
    expect(containers).toHaveLength(2)
    
    // First container should have plus button
    const firstContainerButtons = containers[0].findAll('button')
    const hasPlusButton = firstContainerButtons.some(btn => btn.classes().includes('field-container-plus'))
    expect(hasPlusButton).toBe(true)
    
    // Second container should not have plus button
    const secondContainerButtons = containers[1].findAll('button')
    const hasNoPlusButton = !secondContainerButtons.some(btn => btn.classes().includes('field-container-plus'))
    expect(hasNoPlusButton).toBe(true)
  })

  it('adds new field when plus button is clicked', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    
    expect(wrapper.findAll('.field-container')).toHaveLength(1)
    
    const plusButton = wrapper.find('button.field-container-plus')
    await plusButton.trigger('click')
    await flushPromises()
    
    expect(wrapper.findAll('.field-container')).toHaveLength(2)
  })

  it('removes field when minus button is clicked', async () => {
    const wrapper = createWrapper({}, { testField: ['', ''] }) // start with two fields
    await flushPromises()
    
    expect(wrapper.findAll('.field-container')).toHaveLength(2)
    
    const minusButtons = wrapper.findAll('button').filter(btn => btn.classes().includes('ml-2'))
    await minusButtons[1].trigger('click') // click second minus button
    await flushPromises()
    
    expect(wrapper.findAll('.field-container')).toHaveLength(1)
  })

  it('does not allow removing the last field', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    
    expect(wrapper.findAll('.field-container')).toHaveLength(1)
    
    const buttons = wrapper.findAll('button')
    const minusButton = buttons.find(btn => btn.classes().includes('ml-2'))
    expect(minusButton.attributes('disabled')).toBeDefined()
  })

  it('renders custom tooltips', async () => {
    const wrapper = createWrapper({
      addTooltip: 'Custom Add',
      removeTooltip: 'Custom Remove'
    })
    await flushPromises()
    
    // Check ActionButton components directly
    const actionButtons = wrapper.findAllComponents({ name: 'ActionButton' })
    const plusButton = actionButtons.find(btn => btn.classes().includes('field-container-plus'))
    const minusButton = actionButtons.find(btn => btn.classes().includes('ml-2'))
    
    expect(plusButton.props('tooltipText')).toBe('Custom Add')
    expect(minusButton.props('tooltipText')).toBe('Custom Remove')
  })

  it('uses custom default value when adding fields', async () => {
    const wrapper = createWrapper({ defaultValue: 'custom' })
    await flushPromises()
    
    // Check that the ActionButton component receives the right props
    const actionButtons = wrapper.findAllComponents({ name: 'ActionButton' })
    const plusButton = actionButtons.find(btn => btn.classes().includes('field-container-plus'))
    
    expect(plusButton.props('item')).toBe('custom')
  })

  it('applies custom field props', async () => {
    const wrapper = createWrapper({
      fieldType: 'input',
      fieldProps: { 
        type: 'email', 
        placeholder: 'Enter email',
        maxlength: '50'
      }
    })
    await flushPromises()
    
    const input = wrapper.find('input')
    expect(input.attributes('type')).toBe('email')
    expect(input.attributes('placeholder')).toBe('Enter email')
    expect(input.attributes('maxlength')).toBe('50')
  })

  it('validates field type prop', () => {
    // This test checks that invalid field types would fail validation
    const validTypes = ['select', 'input', 'textarea']
    const component = FieldArrayWithButtons
    const validator = component.props.fieldType.validator
    
    validTypes.forEach(type => {
      expect(validator(type)).toBe(true)
    })
    
    expect(validator('invalid')).toBe(false)
  })

  it('renders correct CSS classes', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    
    // Check container classes
    expect(wrapper.find('.field-container').exists()).toBe(true)
    expect(wrapper.find('.form-group.mb-2').exists()).toBe(true)
    
    // Check field classes
    expect(wrapper.find('.form-control.input.field-container-select').exists()).toBe(true)
    
    // Check button classes
    expect(wrapper.find('.button-o-c.field-container-plus').exists()).toBe(true)
    expect(wrapper.find('.button-o-c.ml-2').exists()).toBe(true)
  })

  it('generates correct field IDs', async () => {
    const wrapper = mount({
      template: `
        <Form :validation-schema="schema" :initial-values="{ managers: [''] }" v-slot="{ errors }">
          <FieldArrayWithButtons 
            name="managers"
            label="Test Field"
            :has-error="!!errors.managers"
          />
        </Form>
      `,
      components: { Form, FieldArrayWithButtons },
      setup() {
        const schema = Yup.object().shape({
          managers: Yup.array().of(Yup.string())
        })
        return { schema }
      }
    })
    await flushPromises()
    
    expect(wrapper.find('#managers_0').exists()).toBe(true)
    
    // Add another field
    const plusButton = wrapper.find('button.field-container-plus')
    await plusButton.trigger('click')
    await flushPromises()
    
    expect(wrapper.find('#managers_1').exists()).toBe(true)
  })
})
