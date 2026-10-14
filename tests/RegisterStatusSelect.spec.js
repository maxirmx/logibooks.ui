/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RegisterStatusSelect from '@/components/RegisterStatusSelect.vue'
import {
  REGISTER_STATUS_FILTER_IN_PROGRESS,
  buildRegisterStatusFilterOptions
} from '@/helpers/register.status.filter.helpers.js'

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

function mountSelect(props = {}, attrs = {}) {
  return mount(RegisterStatusSelect, {
    props: {
      modelValue: 2,
      items: statusOptions,
      placeholder: 'Статус партии',
      ...props
    },
    attrs,
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
              v-bind="$attrs"
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
                  :props="{ title: option.title ?? option.Title, 'data-option-id': option.id ?? option.Id }"
                  :item="{ raw: option }"
                />
              </button>
            </div>
          `
        },
        'font-awesome-icon': {
          props: ['icon'],
          template: '<i data-testid="fa-icon" :data-icon="icon"></i>'
        },
        'v-list-item': {
          props: ['title'],
          template:
            '<div data-testid="v-list-item" v-bind="$attrs"><span v-if="title" data-testid="v-list-item-prop-title">{{ title }}</span><slot name="prepend"></slot><slot></slot></div>',
          inheritAttrs: false
        },
        'v-list-item-title': {
          template: '<span data-testid="v-list-item-title" v-bind="$attrs"><slot></slot></span>',
          inheritAttrs: false
        }
      }
    }
  })
}

describe('RegisterStatusSelect', () => {
  it('renders icons and colors for synthetic register status filters', () => {
    const wrapper = mountSelect({
      modelValue: REGISTER_STATUS_FILTER_IN_PROGRESS,
      items: buildRegisterStatusFilterOptions([
        {
          id: 2,
          title: 'In Progress',
          icon: 'svg:in-transit',
          bkColor: '#FFEEDD',
          fgColor: '#111111'
        }
      ])
    })

    const icons = wrapper.findAll('[data-testid="register-status-icon"]')
    expect(icons.map((icon) => icon.attributes('data-icon'))).toEqual([
      'fa-solid fa-gears',
      'fa-solid fa-layer-group',
      'fa-solid fa-gears',
      'svg:in-transit'
    ])
    expect(icons[0].element.style.backgroundColor).toBe('rgb(231, 241, 255)')
    expect(icons[0].element.style.color).toBe('rgb(13, 110, 253)')
  })

  it('emits model updates from the wrapped select', async () => {
    const wrapper = mountSelect()

    await wrapper.findAll('[data-testid="register-status-option"]')[1].trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([5])
  })

})
