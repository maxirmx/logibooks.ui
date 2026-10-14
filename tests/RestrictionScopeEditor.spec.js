// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RestrictionScopeEditor from '@/components/RestrictionScopeEditor.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const FieldStub = (name, className) => ({
  name,
  props: ['modelValue', 'items', 'label', 'disabled', 'variant', 'id', 'name', 'error'],
  emits: ['update:modelValue'],
  template: `<input :id="id" :name="name" :class="className" />`,
  data: () => ({ className })
})

const ActionButtonStub = {
  name: 'ActionButton',
  props: ['item', 'disabled', 'icon', 'tooltipText'],
  emits: ['click'],
  template: `<button
    :class="{ 'remove-scope': icon.includes('trash') }"
    :disabled="disabled"
    @click="$emit('click', item)"
  ></button>`
}

function createWrapper(modelValue = [], disabled = false, errors = {}, explanationsEnabled = true) {
  return mount(RestrictionScopeEditor, {
    props: {
      modelValue,
      disabled,
      errors,
      explanationsEnabled,
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
        'v-data-table': vuetifyStubs['v-data-table'],
        ActionButton: ActionButtonStub
      }
    }
  })
}

describe('RestrictionScopeEditor', () => {
  it('supports key-only scopes when explanations are disabled', async () => {
    const existing = { countryIsoNumeric: 860, customsProcedureCode: 40 }
    const wrapper = createWrapper([existing], false, {}, false)
    const table = wrapper.findComponent(vuetifyStubs['v-data-table'])

    expect(table.props('headers').map(({ key }) => key)).toEqual([
      'actions',
      'countryIsoNumeric',
      'customsProcedureCode'
    ])
    expect(table.props('headers').map(({ width }) => width)).toEqual(['64px', '60%', '40%'])
    expect(wrapper.findComponent({ name: 'VTextField' }).exists()).toBe(false)

    await wrapper.get('[data-testid="add-restriction-scope"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[
      existing,
      { countryIsoNumeric: 643, customsProcedureCode: 10 }
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

  it('marks only later duplicate country/procedure rows and removes the requested row', async () => {
    const scopes = [
      { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'A' },
      { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'B' },
      { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'C' }
    ]
    const wrapper = createWrapper(scopes)

    expect(wrapper.vm.isDuplicate(0)).toBe(false)
    expect(wrapper.vm.isDuplicate(1)).toBe(true)
    expect(wrapper.findAll('.scope-error')).toHaveLength(1)
    expect(
      wrapper
        .findAllComponents({ name: 'ActionButton' })
        .filter((button) => button.props('icon').includes('trash'))
        .every((button) => button.props('tooltipText') === 'Удалить правило')
    ).toBe(true)
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

})
