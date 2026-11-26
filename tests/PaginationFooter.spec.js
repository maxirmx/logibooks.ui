// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import { createVuetify } from 'vuetify'
import { VDataTable, VDataTableServer, VSelect } from 'vuetify/components'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import DataTablePaginationFooter from '@/components/DataTablePaginationFooter.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'

const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi }
  }
})

describe('PaginationFooter in a Vuetify table', () => {
  let wrapper

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  })

  afterEach(() => {
    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  function renderTable(table, state, props) {
    wrapper = mount(defineComponent({
      setup: () => () => h(table, {
        headers: [{ title: 'Наименование', key: 'name' }],
        page: state.page,
        itemsPerPage: state.itemsPerPage,
        'onUpdate:page': value => { state.page = value },
        'onUpdate:itemsPerPage': value => { state.itemsPerPage = value },
        ...props
      }, {
        bottom: () => h(DataTablePaginationFooter, {
          disabled: state.disabled,
          itemsPerPageOptions,
          itemsPerPageLabel: 'Товаров на странице'
        })
      })
    }), { global: { plugins: [vuetify] } })
    return wrapper.getComponent(PaginationFooter)
  }

  it('uses the pre-pagination count after filtering and resets the page when showing all matches', async () => {
    const state = reactive({ page: 2, itemsPerPage: 50 })
    const items = Array.from({ length: 120 }, (_, index) => ({
      id: index,
      name: index < 55 ? `Тариф ${index + 1}` : `Исключение ${index + 1}`
    }))
    const footer = renderTable(VDataTable, state, { items, search: 'Тариф' })
    expect(footer.text()).toContain('51-55 из 55')
    expect(wrapper.findAll('tbody tr')).toHaveLength(5)

    footer.findAllComponents(VSelect)[0].vm.$emit('update:modelValue', -1)
    await wrapper.vm.$nextTick()
    expect(state).toMatchObject({ page: 1, itemsPerPage: -1 })
    expect(footer.text()).toContain('1-55 из 55')
    expect(wrapper.findAll('tbody tr')).toHaveLength(55)
  })

  it('uses the server total, updates the existing page model, and respects operation locks', async () => {
    const state = reactive({ page: 2, itemsPerPage: 100, disabled: false })
    const footer = renderTable(VDataTableServer, state, {
      items: [{ id: 112, name: 'Товар' }], itemsLength: 4475
    })
    expect(footer.text()).toContain('Товаров на странице')
    expect(footer.text()).toContain('101-200 из 4475')

    const next = footer.get('button[aria-label="Следующая страница"]')
    await next.trigger('click')
    expect(state.page).toBe(3)
    expect(footer.text()).toContain('201-300 из 4475')

    state.disabled = true
    await wrapper.vm.$nextTick()
    expect(next.element.disabled).toBe(true)
    expect(footer.findAllComponents(VSelect).every(select => select.props('disabled'))).toBe(true)
    await next.trigger('click')
    expect(state.page).toBe(3)
  })

  it('offers the first, last, and nearby pages without creating an option for every server page', () => {
    const state = reactive({ page: 2500, itemsPerPage: 10 })
    const footer = renderTable(VDataTableServer, state, { items: [], itemsLength: 50000 })
    const options = footer.getComponent('.pagination-footer__page-select').props('items')
    expect(options.map(option => option.value)).toEqual([
      ...Array.from({ length: 10 }, (_, index) => index + 1),
      ...Array.from({ length: 21 }, (_, index) => index + 2490),
      ...Array.from({ length: 10 }, (_, index) => index + 4991)
    ])
  })
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
    it('shows the full range when all rows are selected', async () => {
      await wrapper.setProps({ itemsPerPage: -1, maxPage: 1 })
      expect(wrapper.text()).toContain('1-200 из 200')
    })
    it('handles undefined/null totalCount', async () => {
      await wrapper.setProps({ totalCount: null })
      const component = wrapper.vm
      expect(component.safeTotalCount).toBe(0)
    })

  })

})
