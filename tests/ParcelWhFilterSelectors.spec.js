/* @vitest-environment jsdom */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelWhFilterSelectors from '@/components/ParcelWhFilterSelectors.vue'

const selectStub = {
  name: 'v-select',
  template: `
    <div class="v-select-stub" data-testid="v-select">
      <span>{{ label }}</span>
      <span v-for="item in items" :key="String(item.value)">{{ item.title }}</span>
    </div>
  `,
  props: ['modelValue', 'items', 'label', 'itemTitle', 'itemValue', 'density', 'style', 'disabled']
}

const textFieldStub = {
  name: 'v-text-field',
  template: `
    <label class="v-text-field-stub" data-testid="v-text-field">
      <span>{{ label }}</span>
      <input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />
    </label>
  `,
  props: ['modelValue', 'label', 'density', 'style', 'disabled'],
  emits: ['update:modelValue']
}

function mountSelector(props = {}) {
  return mount(ParcelWhFilterSelectors, {
    props: {
      statusOptions: [
        { value: null, title: 'Все' },
        { value: 7, title: 'На складе' }
      ],
      checkStatusProjectionOptions: [
        { value: null, title: 'Все' },
        { value: 10, title: 'Не проверено' },
        { value: 20, title: 'Запрет' },
        { value: 25, title: 'Брак' },
        { value: 30, title: 'Проверено' }
      ],
      zoneOptions: [
        { value: null, title: 'Все' },
        { value: 1, title: 'Не задана' },
        { value: 10, title: 'Зеленая зона' }
      ],
      ...props
    },
    global: {
      stubs: {
        'v-select': selectStub,
        'v-text-field': textFieldStub
      }
    }
  })
}

describe('ParcelWhFilterSelectors.vue', () => {
  it('renders warehouse selectors, text filters, and the unassigned zone option', () => {
    const wrapper = mountSelector({ numberLabel: 'ШК' })

    const text = wrapper.text()
    expect(text).toContain('Проверка')
    expect(text).toContain('Не проверено')
    expect(text).toContain('Запрет')
    expect(text).toContain('Брак')
    expect(text).toContain('Проверено')
    expect(text).toContain('Зона')
    expect(text).toContain('Не задана')
    expect(text).toContain('Статус')
    expect(text).toContain('ШК')
    expect(text).toContain('Номер коробки')
    expect(text).toContain('Любой из стикеров')
    expect(text).toContain('Товар')
  })

  it('emits debounced text filter model updates to the parent refs', async () => {
    const wrapper = mountSelector()
    const fields = wrapper.findAll('input')

    await fields[0].setValue('POST-')
    await fields[1].setValue('BOX-')
    await fields[2].setValue('ST-')
    await fields[3].setValue('описание')

    expect(wrapper.emitted('update:localParcelNumberSearch')?.[0]).toEqual(['POST-'])
    expect(wrapper.emitted('update:localBoxNumberSearch')?.[0]).toEqual(['BOX-'])
    expect(wrapper.emitted('update:localStickerSearch')?.[0]).toEqual(['ST-'])
    expect(wrapper.emitted('update:localProductNameSearch')?.[0]).toEqual(['описание'])
  })
})
