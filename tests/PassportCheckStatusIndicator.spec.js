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

describe('PassportCheckStatusIndicator', () => {
  const statuses = [
    { value: 0, code: PassportCheckStatusCode.NotChecked, name: 'Не проверен' },
    { value: 30, code: PassportCheckStatusCode.Checked, name: 'Проверен' },
    { value: 40, code: PassportCheckStatusCode.Invalid, name: 'Недействителен' }
  ]

  it('renders tooltip text from backend status name and CSS classes from named UI entity', () => {
    const wrapper = mount(PassportCheckStatusIndicator, {
      props: {
        value: 30,
        statuses
      },
      slots: {
        default: 'AB1234567'
      },
      global: {
        stubs: {
          'v-tooltip': tooltipStub
        }
      }
    })

    const dot = wrapper.get('[data-testid="passport-check-status-dot"]')
    expect(dot.attributes('aria-label')).toBe('Проверен')
    expect(dot.attributes('title')).toBe('Проверен')
    expect(dot.classes()).toEqual(expect.arrayContaining([
      'passport-check-status__dot',
      'passport-check-status__dot--color-no-issues',
      'passport-check-status__dot--border-no-issues'
    ]))
    expect(wrapper.get('.tooltip-stub').attributes('data-text')).toBe('Проверен')
    expect(wrapper.text()).toContain('AB1234567')
  })

  it('falls back to not-checked presentation when status metadata is missing', () => {
    const wrapper = mount(PassportCheckStatusIndicator, {
      props: {
        value: 999,
        statuses
      },
      global: {
        stubs: {
          'v-tooltip': tooltipStub
        }
      }
    })

    const dot = wrapper.get('[data-testid="passport-check-status-dot"]')
    expect(dot.attributes('aria-label')).toBeUndefined()
    expect(dot.classes()).toEqual(expect.arrayContaining([
      'passport-check-status__dot--color-not-checked',
      'passport-check-status__dot--border-not-checked'
    ]))
    expect(wrapper.get('.tooltip-stub').attributes('data-disabled')).toBe('true')
  })
})
