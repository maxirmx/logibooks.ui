// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import PaginationFooter from '@/components/PaginationFooter.vue'

const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi }
  }
})

describe('PaginationFooter', () => {
  let wrapper

  const defaultProps = {
    page: 1,
    maxPage: 10,
    itemsPerPage: 20,
    totalCount: 200,
    itemsPerPageOptions: [
      { title: '10', value: 10 },
      { title: '20', value: 20 },
      { title: '50', value: 50 }
    ]
  }

  beforeEach(() => {
    wrapper = mount(PaginationFooter, {
      props: defaultProps,
      global: {
        plugins: [vuetify]
      }
    })
  })

  describe('Events', () => {
    it('emits update:page when page changes', async () => {
      const component = wrapper.vm
      component.setPage(5)

      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('update:page')).toBeTruthy()
      expect(wrapper.emitted('update:page')[0]).toEqual([5])
    })

    it('emits update:itemsPerPage when items per page changes', async () => {
      const component = wrapper.vm
      component.itemsPerPageModel = 50

      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('update:itemsPerPage')).toBeTruthy()
      expect(wrapper.emitted('update:itemsPerPage')[0]).toEqual([50])
    })
  })

  describe('Disabled State', () => {
    it('computes controlsDisabled correctly when disabled', async () => {
      await wrapper.setProps({ disabled: true })
      const component = wrapper.vm
      expect(component.controlsDisabled).toBe(true)
    })

  })

  describe('Scroll to Top', () => {
    it('calls window.scrollTo when scroll button is clicked', async () => {
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

      const scrollButton = wrapper.find('.pagination-footer__scroll-button')
      await scrollButton.trigger('click')

      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth'
      })

      scrollToSpy.mockRestore()
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined/null totalCount', async () => {
      await wrapper.setProps({ totalCount: null })
      const component = wrapper.vm
      expect(component.safeTotalCount).toBe(0)
    })

  })

  describe('Custom Page Options', () => {
    it('uses custom page options when provided', async () => {
      const customOptions = [
        { value: 1, title: 'First' },
        { value: 5, title: 'Middle' },
        { value: 10, title: 'Last' }
      ]

      await wrapper.setProps({ pageOptions: customOptions })
      const component = wrapper.vm
      expect(component.pageSelectItems).toEqual(customOptions)
    })
  })
})
