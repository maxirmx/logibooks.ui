// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GtcFormField from '@/components/GtcFormField.vue'
import OzonFormField from '@/components/OzonFormField.vue'
import WbrFormField from '@/components/WbrFormField.vue'
import Wbr2FormField from '@/components/Wbr2FormField.vue'
import WbrNFormField from '@/components/WbrNFormField.vue'

const FieldStub = {
  name: 'Field',
  inheritAttrs: false,
  props: ['name', 'id', 'type', 'disabled', 'readonly'],
  template: '<input :name="name" :id="id" :type="type" :disabled="disabled" :readonly="readonly" />'
}

describe.each([
  ['GTC', GtcFormField],
  ['Ozon', OzonFormField],
  ['WBR', WbrFormField],
  ['WBR2', Wbr2FormField],
  ['WBRN', WbrNFormField]
])('%s currency form field', (_name, component) => {
  it('renders read-only without disabling the submitted field', () => {
    const wrapper = mount(component, {
      props: { name: 'currency', readonly: true },
      global: { stubs: { Field: FieldStub } }
    })

    const input = wrapper.get('input[name="currency"]')
    expect(input.attributes('readonly')).toBeDefined()
    expect(input.attributes('disabled')).toBeUndefined()
  })
})
