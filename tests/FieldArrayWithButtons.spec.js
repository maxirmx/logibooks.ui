/* @vitest-environment jsdom */

// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { Form } from 'vee-validate'
import * as Yup from 'yup'
import FieldArrayWithButtons from '@/components/FieldArrayWithButtons.vue'

// Mock ActionButton
vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    template:
      '<button @click="$emit(\'click\', item)" :disabled="disabled" :class="$attrs.class"><slot /></button>',
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

  it('removes field when minus button is clicked', async () => {
    const wrapper = createWrapper({}, { testField: ['', ''] }) // start with two fields
    await flushPromises()

    expect(wrapper.findAll('.field-container')).toHaveLength(2)

    const minusButtons = wrapper.findAll('button').filter((btn) => btn.classes().includes('ml-2'))
    await minusButtons[1].trigger('click') // click second minus button
    await flushPromises()

    expect(wrapper.findAll('.field-container')).toHaveLength(1)
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

  it('disables fields and buttons when disabled prop is true', async () => {
    const wrapper = createWrapper({ disabled: true })
    await flushPromises()

    const buttons = wrapper.findAll('button')
    buttons.forEach((btn) => {
      expect(btn.attributes('disabled')).toBeDefined()
    })

    const input = wrapper.find('select')
    expect(input.attributes('disabled')).toBeDefined()
  })
})
