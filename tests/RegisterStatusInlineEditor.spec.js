/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RegisterStatusInlineEditor from '@/components/RegisterStatusInlineEditor.vue'

vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    props: ['item', 'icon', 'tooltipText', 'disabled'],
    emits: ['click'],
    template: '<button type="button" :data-icon="icon" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
  }
}))

const statusOptions = [
  {
    id: 2,
    title: 'Current',
    icon: 'svg:in-transit',
    bkColor: '#FFEEDD',
    fgColor: '#111111'
  },
  {
    id: 5,
    title: 'Next',
    icon: 'svg:very-delivered',
    bkColor: '#00AA00',
    fgColor: '#FFFFFF'
  }
]

function mountEditor(props = {}) {
  return mount(RegisterStatusInlineEditor, {
    props: {
      item: { id: 1, statusId: 2 },
      status: statusOptions[0],
      title: 'Current',
      statusOptions,
      canChange: true,
      editMode: true,
      selectedStatusId: 2,
      ...props
    },
    global: {
      stubs: {
        'v-select': {
          props: ['modelValue', 'items'],
          emits: ['update:modelValue'],
          template: `
            <div data-testid="inline-register-status-select">
              <slot name="selection" :item="{ raw: modelValue }" />
              <button
                v-for="option in items"
                :key="option.id"
                type="button"
                data-testid="inline-register-status-option"
                @click="$emit('update:modelValue', option.id)"
              >
                <slot name="item" :props="{}" :item="{ raw: option }" />
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

describe('RegisterStatusInlineEditor', () => {
  it('shows status icons in the inline status selector', () => {
    const wrapper = mountEditor()

    expect(wrapper.find('[data-testid="inline-register-status-select"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Current')
    expect(wrapper.text()).toContain('Next')
    expect(wrapper.find('[data-testid="register-status-selection-title"]').exists()).toBe(false)

    const icons = wrapper.findAll('[data-testid="register-status-icon"]')
    expect(icons.map(icon => icon.attributes('data-icon'))).toEqual([
      'svg:in-transit',
      'svg:in-transit',
      'svg:very-delivered'
    ])
  })

  it('emits selection changes from the shared status selector', async () => {
    const wrapper = mountEditor()

    await wrapper.findAll('[data-testid="inline-register-status-option"]')[1].trigger('click')

    expect(wrapper.emitted('select')?.[0]).toEqual([5])
  })
})
