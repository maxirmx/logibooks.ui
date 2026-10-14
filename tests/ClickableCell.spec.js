// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ClickableCell from '@/components/ClickableCell.vue'

describe('ClickableCell', () => {
  const defaultProps = {
    item: { id: 1, name: 'Test Item' },
    displayValue: 'Test Value'
  }

  function createWrapper(props = {}) {
    return mount(ClickableCell, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: {
          'font-awesome-icon': true
        }
      }
    })
  }

  describe('rendering', () => {
    it('renders bookmark icon before display value', () => {
      const wrapper = createWrapper({
        showBookmark: true,
        displayValue: 'Test Value'
      })
      const span = wrapper.find('span')
      const html = span.html()
      const iconIndex = html.indexOf('bookmark-icon')
      const textIndex = html.indexOf('Test Value')
      expect(iconIndex).toBeLessThan(textIndex)
    })
  })

})
