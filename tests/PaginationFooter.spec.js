// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
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

  describe('Rendering', () => {
    it('renders all main sections', () => {
      expect(wrapper.find('.pagination-footer__items').exists()).toBe(true)
      expect(wrapper.find('.pagination-footer__info').exists()).toBe(true)
      expect(wrapper.find('.pagination-footer__nav').exists()).toBe(true)
    })

    it('displays correct items per page options', () => {
      const select = wrapper.find('.pagination-footer__items-select')
      expect(select.exists()).toBe(true)
    })

    it('shows range information correctly', () => {
      const info = wrapper.find('.pagination-footer__info')
      expect(info.text()).toBe('1-20 из 200')
    })

    it('displays navigation buttons', () => {
      const navButtons = wrapper.findAll('.pagination-footer__nav .v-btn')
      expect(navButtons.length).toBeGreaterThanOrEqual(4) // first, prev, next, last
    })

    it('displays scroll-to-top button', () => {
      const scrollButton = wrapper.find('.pagination-footer__scroll-button')
      expect(scrollButton.exists()).toBe(true)
    })
  })

  describe('Page Control', () => {
    it('always renders page select', () => {
      expect(wrapper.find('.pagination-footer__page-select').exists()).toBe(true)
      expect(wrapper.find('.pagination-footer__page-input').exists()).toBe(false)
    })

    it('generates correct page options', () => {
      const component = wrapper.vm
      expect(component.pageSelectItems).toHaveLength(10)
      expect(component.pageSelectItems[0]).toEqual({ value: 1, title: '1' })
      expect(component.pageSelectItems[9]).toEqual({ value: 10, title: '10' })
    })
  })

  describe('Navigation Buttons State', () => {
    it('disables first and prev buttons on first page', () => {
      const component = wrapper.vm
      expect(component.isFirstDisabled).toBe(true)
      expect(component.isPrevDisabled).toBe(true)
    })

    it('enables next and last buttons when not on last page', () => {
      const component = wrapper.vm
      expect(component.isNextDisabled).toBe(false)
      expect(component.isLastDisabled).toBe(false)
    })

    it('disables next and last buttons on last page', async () => {
      await wrapper.setProps({ page: 10 })
      const component = wrapper.vm
      expect(component.isNextDisabled).toBe(true)
      expect(component.isLastDisabled).toBe(true)
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

  describe('Range Calculation', () => {
    it('calculates range correctly for first page', () => {
      const component = wrapper.vm
      expect(component.rangeStart).toBe(1)
      expect(component.rangeEnd).toBe(20)
    })

    it('calculates range correctly for middle page', async () => {
      await wrapper.setProps({ page: 5 })
      const component = wrapper.vm
      expect(component.rangeStart).toBe(81)
      expect(component.rangeEnd).toBe(100)
    })

    it('calculates range correctly for last partial page', async () => {
      await wrapper.setProps({ page: 10, totalCount: 195 })
      const component = wrapper.vm
      expect(component.rangeStart).toBe(181)
      expect(component.rangeEnd).toBe(195)
    })

    it('handles zero total count', async () => {
      await wrapper.setProps({ totalCount: 0 })
      const component = wrapper.vm
      expect(component.rangeStart).toBe(0)
      expect(component.rangeEnd).toBe(0)
    })
  })

  describe('Disabled State', () => {
    it('computes controlsDisabled correctly when loading', async () => {
      await wrapper.setProps({ loading: true })
      const component = wrapper.vm
      expect(component.controlsDisabled).toBe(true)
    })

    it('computes controlsDisabled correctly when disabled', async () => {
      await wrapper.setProps({ disabled: true })
      const component = wrapper.vm
      expect(component.controlsDisabled).toBe(true)
    })

    it('has controlsDisabled false when not loading or disabled', () => {
      const component = wrapper.vm
      expect(component.controlsDisabled).toBe(false)
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
    it('handles maxPage of 1', async () => {
      await wrapper.setProps({ maxPage: 1, page: 1 })
      
      const component = wrapper.vm
      // All navigation buttons should be disabled when there's only one page
      expect(component.isFirstDisabled).toBe(true)
      expect(component.isPrevDisabled).toBe(true)
      expect(component.isNextDisabled).toBe(true)
      expect(component.isLastDisabled).toBe(true)
    })

    it('handles undefined/null totalCount', async () => {
      await wrapper.setProps({ totalCount: null })
      const component = wrapper.vm
      expect(component.safeTotalCount).toBe(0)
    })

    it('clamps page when maxPage decreases', async () => {
      await wrapper.setProps({ page: 5, maxPage: 3 })
      const component = wrapper.vm
      expect(component.effectiveMaxPage).toBe(3)
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