/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RegisterStatusIcon from '@/components/RegisterStatusIcon.vue'
import {
  REGISTER_STATUS_DEFAULT_BK_COLOR,
  REGISTER_STATUS_DEFAULT_FG_COLOR,
  REGISTER_STATUS_DEFAULT_ICON,
  isSupportedRegisterStatusIcon,
  normalizeRegisterStatusPresentationPayload,
  registerStatusIconOptions,
  resolveRegisterStatusColors,
  resolveRegisterStatusIcon
} from '@/helpers/register.status.icons.js'

describe('register.status.icons helper', () => {
  it('contains the supported local Font Awesome status icons', () => {
    expect(registerStatusIconOptions).toHaveLength(16)
    expect(registerStatusIconOptions.map(option => option.value)).toEqual([
      'fa-solid fa-file-signature',
      'fa-solid fa-hourglass-start',
      'fa-solid fa-people-carry-box',
      'fa-solid fa-hourglass-half',
      'fa-solid fa-clock',
      'fa-solid fa-truck-fast',
      'fa-solid fa-warehouse',
      'fa-solid fa-truck-ramp-box',
      'fa-solid fa-magnifying-glass',
      'fa-solid fa-clipboard-check',
      'fa-solid fa-plane-departure',
      'fa-solid fa-right-to-bracket',
      'fa-solid fa-right-from-bracket',
      'fa-solid fa-plane-arrival',
      'fa-solid fa-box-open',
      'fa-solid fa-circle-check'
    ])
    expect(registerStatusIconOptions.every(option => !('title' in option))).toBe(true)
  })

  it('resolves supported and fallback icons', () => {
    expect(isSupportedRegisterStatusIcon('fa-solid fa-box-open')).toBe(true)
    expect(isSupportedRegisterStatusIcon('fa-solid fa-not-real')).toBe(false)
    expect(resolveRegisterStatusIcon('fa-solid fa-box-open')).toBe('fa-solid fa-box-open')
    expect(resolveRegisterStatusIcon('fa-solid fa-not-real')).toBe(REGISTER_STATUS_DEFAULT_ICON)
    expect(resolveRegisterStatusIcon(null)).toBe(REGISTER_STATUS_DEFAULT_ICON)
  })

  it('resolves default and explicit colors', () => {
    expect(resolveRegisterStatusColors(null)).toEqual({
      backgroundColor: REGISTER_STATUS_DEFAULT_BK_COLOR,
      color: REGISTER_STATUS_DEFAULT_FG_COLOR
    })
    expect(resolveRegisterStatusColors({ bkColor: '#112233', fgColor: '#AABBCC' })).toEqual({
      backgroundColor: '#112233',
      color: '#AABBCC'
    })
  })

  it('normalizes blank presentation values to null without changing other fields', () => {
    expect(normalizeRegisterStatusPresentationPayload({
      id: 1,
      title: 'Черновик',
      icon: '',
      bkColor: undefined,
      fgColor: null
    })).toEqual({
      id: 1,
      title: 'Черновик',
      icon: null,
      bkColor: null,
      fgColor: null
    })
  })
})

describe('RegisterStatusIcon', () => {
  function mountIcon(status) {
    return mount(RegisterStatusIcon, {
      props: { status },
      global: {
        stubs: {
          'font-awesome-icon': {
            props: ['icon'],
            template: '<i data-testid="fa-icon" :data-icon="icon"></i>'
          }
        }
      }
    })
  }

  it('renders supported icon and colors', () => {
    const wrapper = mountIcon({
      title: 'Готово',
      icon: 'fa-solid fa-circle-check',
      bkColor: '#00AA00',
      fgColor: '#FFFFFF'
    })

    expect(wrapper.find('[data-testid="fa-icon"]').attributes('data-icon')).toBe('fa-solid fa-circle-check')
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('style')).toContain('background-color: rgb(0, 170, 0)')
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('style')).toContain('color: rgb(255, 255, 255)')
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('title')).toBe('Готово')
  })

  it('renders neutral placeholder for missing status', () => {
    const wrapper = mountIcon(null)

    expect(wrapper.find('[data-testid="fa-icon"]').attributes('data-icon')).toBe(REGISTER_STATUS_DEFAULT_ICON)
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('title')).toBe('Статус партии')
  })

  it('suppresses tooltip title when requested', () => {
    const wrapper = mount(RegisterStatusIcon, {
      props: {
        status: { title: 'Готово', icon: 'fa-solid fa-circle-check' },
        showTooltip: false
      },
      global: {
        stubs: {
          'font-awesome-icon': {
            props: ['icon'],
            template: '<i data-testid="fa-icon" :data-icon="icon"></i>'
          }
        }
      }
    })

    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('title')).toBeUndefined()
  })
})
