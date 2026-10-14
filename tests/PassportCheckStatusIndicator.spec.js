/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PassportCheckStatusIndicator from '@/components/PassportCheckStatusIndicator.vue'
import { PassportCheckStatusCode } from '@/helpers/passport.check.status.helpers.js'

const tooltipStub = {
  props: ['text', 'disabled'],
  template: `
    <span class="tooltip-stub" :data-text="text" :data-disabled="String(disabled)">
      <slot name="activator" :props="{ title: text }"></slot>
      <slot></slot>
    </span>
  `
}

const fontAwesomeIconStub = {
  props: ['icon'],
  template: '<i :data-icon="icon" v-bind="$attrs"></i>'
}

describe('PassportCheckStatusIndicator', () => {
  const statuses = [
    { value: 0, code: PassportCheckStatusCode.NotChecked, name: 'Не проверен' },
    { value: 30, code: PassportCheckStatusCode.Checked, name: 'Проверен' },
    { value: 40, code: PassportCheckStatusCode.Invalid, name: 'Недействителен' }
  ]

  it('falls back to not-checked presentation when status metadata is missing', () => {
    const wrapper = mount(PassportCheckStatusIndicator, {
      props: {
        value: 999,
        statuses
      },
      global: {
        stubs: {
          'font-awesome-icon': fontAwesomeIconStub,
          'v-tooltip': tooltipStub
        }
      }
    })

    const icon = wrapper.get('[data-testid="passport-check-status-icon"]')
    expect(icon.attributes('aria-label')).toBeUndefined()
    expect(icon.attributes('data-icon')).toBe('fa-solid fa-circle-question')
    expect(icon.classes()).toEqual(
      expect.arrayContaining(['passport-check-status__icon--color-not-checked'])
    )
    expect(wrapper.get('.tooltip-stub').attributes('data-disabled')).toBe('true')
  })
})
