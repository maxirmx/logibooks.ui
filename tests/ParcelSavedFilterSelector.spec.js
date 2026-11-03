// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelSavedFilterSelector from '@/components/ParcelSavedFilterSelector.vue'

const selectStub = {
  name: 'VSelect', props: ['modelValue', 'items', 'disabled', 'label'], emits: ['update:modelValue'],
  template: '<select :aria-label="label" :disabled="disabled" :value="modelValue ?? \'\'" @change="$emit(\'update:modelValue\', $event.target.value ? Number($event.target.value) : null)"><option v-for="item in items" :key="String(item.value)" :value="item.value ?? \'\'">{{ item.title }}</option></select>'
}

describe('ParcelSavedFilterSelector', () => {
  it('has a safe None selection when mounted without register context', async () => {
    const wrapper = mount(ParcelSavedFilterSelector, { global: { stubs: { 'v-select': selectStub } } })
    expect(wrapper.findAll('option').map(option => option.text())).toEqual(['Нет'])
    await wrapper.get('select').setValue('')
    expect(wrapper.get('select').element.value).toBe('')
  })
})
