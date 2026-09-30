/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import UserParcelFilters from '@/components/UserParcelFilters.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'

const push = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return { ...actual, useRouter: () => ({ push }) }
})

const ActionButtonStub = {
  props: ['item', 'disabled', 'tooltipText'],
  emits: ['click'],
  template: '<button type="button" :disabled="disabled" :aria-label="tooltipText" @click="$emit(\'click\', item)"></button>'
}

function mountFilters() {
  return mount({
    components: { UserParcelFilters, PageAlertRegion },
    template: '<div><UserParcelFilters /><PageAlertRegion /></div>'
  }, {
    global: { plugins: [createPinia()], stubs: { ActionButton: ActionButtonStub } }
  })
}

beforeEach(() => {
  push.mockReset()
  push.mockResolvedValue()
})

describe('UserParcelFilters', () => {
  it('uses grouped header and left-hand row actions with the shared table style', async () => {
    const wrapper = mountFilters()
    expect(wrapper.find('#user-parcel-filters-heading').text()).toBe('Пользовательские фильтры:')
    expect(wrapper.find('#user-parcel-filters-heading').classes()).toContain('label')
    expect(wrapper.find('.user-parcel-filters__header > .label').exists()).toBe(true)
    expect(wrapper.find('.user-parcel-filters__table-shell.table-card').exists()).toBe(true)
    expect(wrapper.find('.user-parcel-filters__header').element.nextElementSibling).toBe(wrapper.find('.user-parcel-filters__table-shell').element)
    expect(wrapper.find('[data-testid="parcel-filters-prototype-notice"]').exists()).toBe(false)
    expect(wrapper.find('.user-parcel-filters__header .header-actions-group [data-testid="parcel-filter-create"]').exists()).toBe(true)
    expect(wrapper.findAll('th').map((cell) => cell.text())).toEqual(['Действия', 'Название', 'Исключений'])
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.findAll('tbody tr')[0].find('td').find('[data-testid="parcel-filter-edit-1"]').exists()).toBe(true)
    expect(wrapper.findAll('tbody tr')[1].text()).toContain('Пустой фильтр')
    expect(wrapper.findAll('tbody tr')[1].text()).toContain('0')

    await wrapper.find('[data-testid="parcel-filter-create"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/parcel-filters/create')
    await wrapper.find('[data-testid="parcel-filter-edit-1"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/parcel-filters/edit/1')
    expect(wrapper.find('[data-testid="parcel-filter-delete-1"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="parcel-filter-delete-1"]').attributes('aria-label')).toContain('после подключения API')
  })

  it('displays a failed navigation once and keeps the profile section', async () => {
    push.mockRejectedValueOnce(new Error('Navigation failed'))
    const wrapper = mountFilters()
    await wrapper.find('[data-testid="parcel-filter-create"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Navigation failed')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="user-parcel-filters"]').exists()).toBe(true)
  })
})
