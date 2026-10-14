/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RegisterStatusIcon from '@/components/RegisterStatusIcon.vue'
import { REGISTER_STATUS_DEFAULT_ICON, REGISTER_STATUS_ICON_KIND_FONT_AWESOME } from '@/helpers/register.status.icons.js'

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

  it('renders neutral placeholder for missing status', () => {
    const wrapper = mountIcon(null)

    expect(wrapper.find('[data-testid="fa-icon"]').attributes('data-icon')).toBe(
      REGISTER_STATUS_DEFAULT_ICON
    )
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('data-icon-kind')).toBe(
      REGISTER_STATUS_ICON_KIND_FONT_AWESOME
    )
    expect(wrapper.find('[data-testid="register-status-icon"]').attributes('title')).toBeUndefined()
  })

})
