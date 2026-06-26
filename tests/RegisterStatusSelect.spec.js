/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RegisterStatusSelect from '@/components/RegisterStatusSelect.vue'

const statusOptions = [
  {
    id: 2,
    title: 'In Progress',
    icon: 'svg:in-transit',
    bkColor: '#FFEEDD',
    fgColor: '#111111'
  },
  {
    Id: 5,
    Title: 'Completed',
    Icon: 'svg:very-delivered',
    BkColor: '#00AA00',
    FgColor: '#FFFFFF'
  }
]

function mountSelect(props = {}) {
  return mount(RegisterStatusSelect, {
    props: {
      modelValue: 2,
      items: statusOptions,
      placeholder: 'Статус партии',
      ...props
    },
    global: {
      stubs: {
        'v-select': {
          props: ['modelValue', 'items', 'placeholder', 'disabled'],
          emits: ['update:modelValue'],
          template: `
            <div
              data-testid="register-status-select"
              :data-placeholder="placeholder"
              :data-disabled="String(disabled)"
            >
              <slot name="selection" :item="{ raw: modelValue }" />
              <button
                v-for="option in items"
                :key="option.id ?? option.Id"
                type="button"
                data-testid="register-status-option"
                @click="$emit('update:modelValue', option.id ?? option.Id)"
              >
                <slot
                  name="item"
                  :props="{ 'data-option-id': option.id ?? option.Id }"
                  :item="{ raw: option }"
                />
              </button>
            </div>
          `
        },
        'font-awesome-icon': {
          props: ['icon'],
          template: '<i data-testid="fa-icon" :data-icon="icon"></i>'
        }
      }
    }
  })
}

describe('RegisterStatusSelect', () => {
  it('renders selected and menu statuses with register status icons', () => {
    const wrapper = mountSelect()

    expect(wrapper.find('[data-testid="register-status-select"]').attributes('data-placeholder')).toBe('Статус партии')
    expect(wrapper.text()).toContain('In Progress')
    expect(wrapper.text()).toContain('Completed')
    expect(wrapper.find('[data-testid="register-status-selection-title"]').text()).toBe('In Progress')

    const icons = wrapper.findAll('[data-testid="register-status-icon"]')
    expect(icons).toHaveLength(3)
    expect(icons.map(icon => icon.attributes('data-icon'))).toEqual([
      'svg:in-transit',
      'svg:in-transit',
      'svg:very-delivered'
    ])
    expect(icons[0].element.style.backgroundColor).toBe('rgb(255, 238, 221)')
    expect(icons[0].element.style.color).toBe('rgb(17, 17, 17)')
  })

  it('emits model updates from the wrapped select', async () => {
    const wrapper = mountSelect()

    await wrapper.findAll('[data-testid="register-status-option"]')[1].trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([5])
  })

  it('can render an icon-only selected value while keeping titles in options', () => {
    const wrapper = mountSelect({ showSelectionTitle: false })

    expect(wrapper.find('[data-testid="register-status-selection-title"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="register-status-option-title"]').map(item => item.text())).toEqual([
      'In Progress',
      'Completed'
    ])
    expect(wrapper.findAll('[data-testid="register-status-icon"]')).toHaveLength(3)
  })
})
