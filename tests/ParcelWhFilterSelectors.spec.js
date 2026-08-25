/* @vitest-environment jsdom */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelWhFilterSelectors from '@/components/ParcelWhFilterSelectors.vue'
import ResponsiveFilterBar from '@/components/ResponsiveFilterBar.vue'

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

const chipStub = {
  name: 'v-chip',
  template: `
    <button data-testid="parcel-box-scope" :disabled="disabled" @click="$emit('click:close')">
      <slot />
    </button>
  `,
  props: ['disabled', 'color', 'variant', 'closable'],
  emits: ['click:close']
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
        'v-text-field': textFieldStub,
        'v-chip': chipStub
      }
    }
  })
}

describe('ParcelWhFilterSelectors.vue', () => {
  it('uses an accessible responsive filter bar with role-based control sizes', () => {
    const wrapper = mountSelector({ numberLabel: 'ШК' })
    const filterBar = wrapper.findComponent(ResponsiveFilterBar)
    const controls = Array.from(filterBar.element.children)

    expect(filterBar.exists()).toBe(true)
    expect(filterBar.attributes('aria-label')).toBe('Фильтры складских посылок')
    expect(controls).toHaveLength(7)
    expect(controls.map((control) => control.textContent.trim())).toEqual([
      'ПроверкаВсеНе провереноЗапретБракПроверено',
      'ЗонаВсеНе заданаЗеленая зона',
      'СтатусВсеНа складе',
      'ШК',
      'Номер коробки',
      'Любой из стикеров',
      'Товар'
    ])
    expect(controls[0].classList).toContain('responsive-filter-bar__item--compact')
    expect(controls[1].classList).toContain('responsive-filter-bar__item--compact')
    expect(controls[2].classList).toContain('responsive-filter-bar__item--regular')
    expect(controls[3].classList).toContain('responsive-filter-bar__item--grow')
    expect(controls[4].classList).toContain('responsive-filter-bar__item--compact')
    expect(controls[5].classList).toContain('responsive-filter-bar__item--grow')
    expect(controls[6].classList).toContain('responsive-filter-bar__item--grow')
    controls.forEach((control) => expect(control.hasAttribute('style')).toBe(false))
  })

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

  it('shows a clearable exact box scope instead of the editable box-prefix field', async () => {
    const wrapper = mountSelector({ boxScopeId: 17, boxScopeCode: 'BOX-17' })

    expect(wrapper.get('[data-testid="parcel-box-scope"]').text()).toContain('Коробка: BOX-17')
    expect(wrapper.get('[data-testid="parcel-box-scope"]').classes()).toContain(
      'responsive-filter-bar__item--compact'
    )
    expect(wrapper.text()).not.toContain('Номер коробки')
    expect(wrapper.findAll('input')).toHaveLength(3)

    await wrapper.get('[data-testid="parcel-box-scope"]').trigger('click')
    expect(wrapper.emitted('clear-box-scope')).toHaveLength(1)
  })

  it('falls back to the box id when a scoped box has no display code', () => {
    const wrapper = mountSelector({ boxScopeId: 17, boxScopeCode: null })

    expect(wrapper.get('[data-testid="parcel-box-scope"]').text()).toContain('Коробка: #17')
  })
})
