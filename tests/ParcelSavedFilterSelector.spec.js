/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ParcelSavedFilterSelector from '@/components/ParcelSavedFilterSelector.vue'

const selectStub = {
  name: 'VSelect', props: ['modelValue', 'items', 'disabled', 'label'], emits: ['update:modelValue'],
  template: '<select :aria-label="label" :disabled="disabled" :value="modelValue ?? \'\'" @change="$emit(\'update:modelValue\', $event.target.value ? Number($event.target.value) : null)"><option v-for="item in items" :key="String(item.value)" :value="item.value ?? \'\'">{{ item.title }}</option></select>'
}

describe('ParcelSavedFilterSelector', () => {
  it('displays the remembered selection, saved names, and None and applies user changes', async () => {
    const id = ref(2)
    const select = vi.fn(value => { id.value = value })
    const wrapper = mount(ParcelSavedFilterSelector, {
      global: {
        provide: { savedParcelFilter: { id, options: ref([{ value: null, title: 'Нет' }, { value: 2, title: 'Мой фильтр' }]), select } },
        stubs: { 'v-select': selectStub }
      }
    })
    expect(wrapper.get('select').element.value).toBe('2')
    expect(wrapper.findAll('option').map(option => option.text())).toEqual(['Нет', 'Мой фильтр'])
    await wrapper.get('select').setValue('')
    expect(select).toHaveBeenCalledWith(null)
    await wrapper.get('select').setValue('2')
    expect(select).toHaveBeenCalledWith(2)
    await wrapper.setProps({ disabled: true })
    expect(wrapper.get('select').element.disabled).toBe(true)
  })

  it('has a safe None selection when mounted without register context', async () => {
    const wrapper = mount(ParcelSavedFilterSelector, { global: { stubs: { 'v-select': selectStub } } })
    expect(wrapper.findAll('option').map(option => option.text())).toEqual(['Нет'])
    await wrapper.get('select').setValue('')
    expect(wrapper.get('select').element.value).toBe('')
  })
})
