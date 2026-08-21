// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RestrictionScopeEditor from '@/components/RestrictionScopeEditor.vue'

const FieldStub = (name, className) => ({
  name,
  props: ['modelValue', 'items', 'label', 'disabled', 'id', 'name', 'error'],
  emits: ['update:modelValue'],
  template: `<input :id="id" :name="name" :class="className" />`,
  data: () => ({ className })
})

const ActionButtonStub = {
  name: 'ActionButton',
  props: ['item', 'disabled'],
  emits: ['click'],
  template: '<button class="remove-scope" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
}

function createWrapper(modelValue = [], disabled = false, errors = {}) {
  return mount(RestrictionScopeEditor, {
    props: {
      modelValue,
      disabled,
      errors,
      countries: [
        { isoNumeric: 643, isoAlpha2: 'RU', nameRuShort: 'Россия' },
        { isoNumeric: 860, isoAlpha2: 'UZ', nameRuShort: 'Узбекистан' }
      ]
    },
    global: {
      stubs: {
        'font-awesome-icon': true,
        'v-autocomplete': FieldStub('VAutocomplete', 'country-field'),
        'v-select': FieldStub('VSelect', 'procedure-field'),
        'v-text-field': FieldStub('VTextField', 'explanation-field'),
        ActionButton: ActionButtonStub
      }
    }
  })
}

describe('RestrictionScopeEditor', () => {
  it('renders an inactive message and adds a complete draft scope', async () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('Ограничение неактивно')
    await wrapper.get('[data-testid="add-restriction-scope"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[
      { countryIsoNumeric: null, customsProcedureCode: 10, explanation: '' }
    ]])
  })

  it('updates country, procedure and explanation without mutating the input', async () => {
    const original = [{ countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'Old' }]
    const wrapper = createWrapper(original)

    await wrapper.findComponent({ name: 'VAutocomplete' }).vm.$emit('update:modelValue', 860)
    await wrapper.findComponent({ name: 'VSelect' }).vm.$emit('update:modelValue', 40)
    await wrapper.findComponent({ name: 'VTextField' }).vm.$emit('update:modelValue', 'New')

    expect(wrapper.emitted('update:modelValue')?.map((event) => event[0])).toEqual([
      [{ countryIsoNumeric: 860, customsProcedureCode: 10, explanation: 'Old' }],
      [{ countryIsoNumeric: 643, customsProcedureCode: 40, explanation: 'Old' }],
      [{ countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'New' }]
    ])
    expect(original).toEqual([{ countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'Old' }])
  })

  it('marks duplicate country/procedure pairs and removes the requested row', async () => {
    const scopes = [
      { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'A' },
      { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'B' },
      { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'C' }
    ]
    const wrapper = createWrapper(scopes)

    expect(wrapper.findAll('.scope-error')).toHaveLength(2)
    await wrapper.findAll('.remove-scope')[1].trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[
      scopes[0],
      scopes[2]
    ]])
  })

  it('renders indexed validation errors beneath their focusable controls', () => {
    const wrapper = createWrapper(
      [{ countryIsoNumeric: null, customsProcedureCode: null, explanation: '' }],
      false,
      {
        'scopes[0].countryIsoNumeric': 'Выберите страну',
        'scopes.0.customsProcedureCode': 'Выберите процедуру'
      }
    )

    const country = wrapper.findComponent({ name: 'VAutocomplete' })
    const procedure = wrapper.findComponent({ name: 'VSelect' })
    const fieldErrors = wrapper.findAll('.scope-field-error')

    expect(country.props()).toMatchObject({
      id: 'scopes[0].countryIsoNumeric',
      name: 'scopes[0].countryIsoNumeric',
      error: true
    })
    expect(procedure.props('error')).toBe(true)
    expect(fieldErrors.map((error) => error.text())).toEqual([
      'Выберите страну',
      'Выберите процедуру'
    ])
    expect(fieldErrors.every((error) => error.element.parentElement?.classList.contains('scope-field')))
      .toBe(true)
  })

  it('maps a collapsed scope error to an invalid procedure control', () => {
    const wrapper = createWrapper(
      [{ countryIsoNumeric: 643, customsProcedureCode: null, explanation: '' }],
      false,
      { scopes: 'Выберите процедуру' }
    )

    const procedureField = wrapper.get('.scope-procedure')
    expect(procedureField.attributes('data-field')).toBe('scopes')
    expect(procedureField.get('.scope-field-error').text()).toBe('Выберите процедуру')
  })

  it('keeps all controls disabled when editing is locked', async () => {
    const wrapper = createWrapper(
      [{ countryIsoNumeric: 643, customsProcedureCode: 10, explanation: '' }],
      true
    )

    expect(wrapper.get('[data-testid="add-restriction-scope"]').attributes('disabled')).toBeDefined()
    expect(wrapper.findComponent({ name: 'VAutocomplete' }).props('disabled')).toBe(true)
    expect(wrapper.get('.remove-scope').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="add-restriction-scope"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
