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
  REGISTER_STATUS_ICON_KIND_FONT_AWESOME,
  REGISTER_STATUS_ICON_KIND_SVG,
  isSupportedRegisterStatusIcon,
  normalizeRegisterStatusPresentationPayload,
  registerStatusIconOptions,
  resolveRegisterStatusColors,
  resolveRegisterStatusIcon
} from '@/helpers/register.status.icons.js'

describe('register.status.icons helper', () => {
  it('contains the supported copied SVG status icons and manual Font Awesome fallback', () => {
    expect(registerStatusIconOptions).toHaveLength(26)
    expect(registerStatusIconOptions.map(option => option.value)).toEqual([
      'svg:registered',
      'svg:waiting-for-shipment',
      'svg:collected',
      'svg:waiting',
      'svg:waiting-for-transit',
      'svg:in-transit',
      'svg:in-storage',
      'svg:out-of-storage',
      'svg:customs-start',
      'svg:customs-end',
      'svg:out-of-country-of-origin',
      'svg:into-country-of-transit',
      'svg:out-of-country-of-transit',
      'svg:into-country-of-destination',
      'svg:delivered',
      'svg:very-delivered',
      'svg:customs-baggage-check',
      'svg:customs-check-examine-security',
      'svg:customs-control',
      'svg:customs',
      'svg:cutting-euro-papper-bill',
      'svg:document-business-paper-file-paperwork-job',
      'svg:document-business-paper-file-paperwork-job-2',
      'svg:document-business-paper-file-paperwork-job-3',
      'svg:import',
      REGISTER_STATUS_DEFAULT_ICON
    ])
    expect(registerStatusIconOptions.every(option => !('title' in option))).toBe(true)
    expect(registerStatusIconOptions.slice(0, -1).every(option =>
      option.kind === REGISTER_STATUS_ICON_KIND_SVG && typeof option.src === 'string'
    )).toBe(true)
    expect(registerStatusIconOptions.at(-1)).toMatchObject({
      kind: REGISTER_STATUS_ICON_KIND_FONT_AWESOME,
      icon: REGISTER_STATUS_DEFAULT_ICON
    })
  })

  it('resolves supported and fallback icons', () => {
    expect(isSupportedRegisterStatusIcon('svg:delivered')).toBe(true)
    expect(isSupportedRegisterStatusIcon('svg:customs-baggage-check')).toBe(true)
    expect(isSupportedRegisterStatusIcon('svg:import')).toBe(true)
    expect(isSupportedRegisterStatusIcon(REGISTER_STATUS_DEFAULT_ICON)).toBe(true)
    expect(isSupportedRegisterStatusIcon('fa-solid fa-box-open')).toBe(false)
    expect(isSupportedRegisterStatusIcon('fa-solid fa-not-real')).toBe(false)
    expect(resolveRegisterStatusIcon('svg:delivered')).toMatchObject({
      value: 'svg:delivered',
      kind: REGISTER_STATUS_ICON_KIND_SVG
    })
    expect(resolveRegisterStatusIcon('fa-solid fa-not-real')).toMatchObject({
      value: REGISTER_STATUS_DEFAULT_ICON,
      kind: REGISTER_STATUS_ICON_KIND_FONT_AWESOME,
      icon: REGISTER_STATUS_DEFAULT_ICON
    })
    expect(resolveRegisterStatusIcon(null)).toMatchObject({
      value: REGISTER_STATUS_DEFAULT_ICON,
      kind: REGISTER_STATUS_ICON_KIND_FONT_AWESOME
    })
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

  it('renders supported copied SVG icon and colors', () => {
    const wrapper = mountIcon({
      title: 'Готово',
      icon: 'svg:very-delivered',
      bkColor: '#00AA00',
      fgColor: '#FFFFFF'
    })

    expect(wrapper.find('[data-testid="register-status-svg-icon"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="fa-icon"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('data-icon')).toBe('svg:very-delivered')
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('data-icon-kind')).toBe(REGISTER_STATUS_ICON_KIND_SVG)
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('style')).toContain('background-color: rgb(0, 170, 0)')
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('style')).toContain('color: rgb(255, 255, 255)')
    expect(wrapper.find('[data-testid="register-status-svg-icon"]').attributes('style')).toContain('mask-image')
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('title')).toBeUndefined()
  })

  it('renders imported SVG icons through the same fixed-size frame as existing records', () => {
    const wrapper = mountIcon({
      title: 'Таможня',
      icon: 'svg:customs-baggage-check',
      bkColor: '#FFFFFF',
      fgColor: '#000000'
    })

    expect(wrapper.find('[data-testid="register-status-icon"]').classes()).toContain('register-status-icon')
    expect(wrapper.find('[data-testid="register-status-svg-icon"]').classes()).toContain('register-status-icon__svg')
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('data-icon')).toBe('svg:customs-baggage-check')
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('data-icon-kind')).toBe(REGISTER_STATUS_ICON_KIND_SVG)
  })

  it('renders neutral placeholder for missing status', () => {
    const wrapper = mountIcon(null)

    expect(wrapper.find('[data-testid="fa-icon"]').attributes('data-icon')).toBe(REGISTER_STATUS_DEFAULT_ICON)
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('data-icon-kind')).toBe(REGISTER_STATUS_ICON_KIND_FONT_AWESOME)
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('title')).toBeUndefined()
  })

  it('does not render tooltip title for register status icons', () => {
    const wrapper = mount(RegisterStatusIcon, {
      props: {
        status: { title: 'Готово', icon: 'svg:delivered' }
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
