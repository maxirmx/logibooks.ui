// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import UserParcelFilters from '@/components/UserParcelFilters.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useParcelFiltersStore } from '@/stores/parcel.filters.store.js'
import { reportError } from '@/helpers/error.helpers.js'

const push = vi.hoisted(() => vi.fn())
const confirm = vi.hoisted(() => vi.fn())
vi.mock('vue-router', async () => ({ ...await vi.importActual('vue-router'), useRouter: () => ({ push }) }))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => confirm }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn(), delete: vi.fn() } }))
vi.mock('@/helpers/error.helpers.js', async importOriginal => ({ ...await importOriginal(), reportError: vi.fn() }))

const filter = {
  id: 1, name: 'Исключить проблемы', excludedParcelStatusIds: [2],
  excludedCheckStatuses: { common: [381], sw: [], fc: [] },
  excludedPassportCheckStatuses: [30]
}
const ActionButton = {
  props: ['item', 'disabled', 'tooltipText'], emits: ['click'],
  template: '<button type="button" :disabled="disabled" :aria-label="tooltipText" @click="$emit(\'click\', item)"></button>'
}
const vuetify = createVuetify({ components, directives })
function mountFilters(userId = null) {
  return mount({ props: ['userId'], components: { UserParcelFilters, PageAlertRegion }, template: '<div><UserParcelFilters :user-id="userId" /><PageAlertRegion /></div>' }, {
    props: { userId },
    global: { plugins: [createPinia(), vuetify], stubs: { ActionButton } }
  })
}
beforeEach(() => {
  reportError.mockReset()
  push.mockReset().mockResolvedValue()
  confirm.mockReset().mockResolvedValue(true)
  fetchWrapper.get.mockReset().mockResolvedValue([filter])
  fetchWrapper.delete.mockReset().mockResolvedValue(undefined)
})

describe('UserParcelFilters', () => {
  it('preserves the destination alert and reports abandoned navigation failures', async () => {
    let rejectNavigation
    push.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectNavigation = reject }))
    const wrapper = mountFilters()
    await flushPromises()
    const openFilter = wrapper.findComponent(UserParcelFilters).vm.openFilter
    const pinia = wrapper.vm.$pinia
    await wrapper.get('[data-testid="parcel-filter-create"]').trigger('click')
    wrapper.unmount()
    const alerts = useAlertStore(pinia)
    alerts.error('Сообщение страницы назначения')
    const destination = mount(PageAlertRegion, { global: { plugins: [pinia] } })
    const failure = new Error('Abandoned navigation')
    rejectNavigation(failure)
    await flushPromises()
    expect(destination.get('[role="alert"]').text()).toContain('Сообщение страницы назначения')
    expect(destination.text()).not.toContain('Abandoned navigation')
    expect(reportError).toHaveBeenCalledExactlyOnceWith(failure, { context: 'parcel filter navigation after disposal' })
    await openFilter('/parcel-filters/create')
    expect(push).toHaveBeenCalledOnce()
    destination.unmount()
  })
  it('sorts by name in both directions and keeps actions bound to the correct filter', async () => {
    const filters = [
      { ...filter, id: 3, name: 'Янтарь' },
      { ...filter, id: 1, name: 'Альфа' },
      { ...filter, id: 2, name: 'Бета' }
    ]
    fetchWrapper.get.mockResolvedValueOnce(filters)
    const wrapper = mountFilters()
    await flushPromises()
    const names = () => wrapper.findAll('tbody .v-data-table__tr').map(row => row.findAll('td')[1].text())
    const headers = wrapper.findAll('thead th')
    expect(headers.map(header => header.classes().includes('v-data-table__th--sortable')))
      .toEqual([false, true, false])
    expect(names()).toEqual(['Янтарь', 'Альфа', 'Бета'])

    await headers[1].trigger('click')
    await flushPromises()
    expect(names()).toEqual(['Альфа', 'Бета', 'Янтарь'])

    await headers[1].trigger('click')
    await flushPromises()
    expect(names()).toEqual(['Янтарь', 'Бета', 'Альфа'])
    await wrapper.find('tbody .v-data-table__tr [data-testid="parcel-filter-edit-3"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/parcel-filters/edit/3')
    await wrapper.find('[data-testid="parcel-filter-delete-2"]').trigger('click')
    await flushPromises()
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ content: 'Бета' }))
    expect(fetchWrapper.delete).toHaveBeenCalledWith(expect.stringMatching(/\/parcel-filters\/2$/))
    expect(names()).toEqual(['Янтарь', 'Альфа'])
    expect(filters.map(item => item.name)).toEqual(['Янтарь', 'Альфа', 'Бета'])
  })

  it('keeps the row after deletion failure and allows repeating its action', async () => {
    fetchWrapper.delete.mockRejectedValueOnce(new Error('Удаление не удалось'))
    const wrapper = mountFilters()
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-delete-1"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('tbody tr').exists()).toBe(true)
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Удаление не удалось')
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    await wrapper.find('[data-testid="parcel-filter-delete-1"]').trigger('click')
    await flushPromises()
    expect(fetchWrapper.delete).toHaveBeenCalledTimes(2)
    expect(wrapper.find('tbody .v-data-table__tr').exists()).toBe(false)
  })

  it('cancellation leaves the row intact', async () => {
    confirm.mockResolvedValueOnce(false)
    const wrapper = mountFilters()
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-delete-1"]').trigger('click')
    await flushPromises()
    expect(fetchWrapper.delete).not.toHaveBeenCalled()
    expect(wrapper.find('tbody tr').exists()).toBe(true)
  })

  it('shows a message-only list failure and recovers when reopened', async () => {
    fetchWrapper.get.mockRejectedValueOnce(new Error('Список недоступен'))
    const wrapper = mountFilters()
    await flushPromises()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Список недоступен')
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    wrapper.unmount()
    const reloaded = mountFilters()
    await flushPromises()
    expect(reloaded.find('tbody .v-data-table__tr').text()).toContain(filter.name)
    reloaded.unmount()
  })

  it('reports a navigation failure once', async () => {
    push.mockRejectedValueOnce(new Error('Ошибка перехода'))
    const wrapper = mountFilters()
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-create"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Ошибка перехода')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
  })

  it('reports confirmation failure once without deleting', async () => {
    confirm.mockRejectedValueOnce(new Error('Диалог недоступен'))
    const wrapper = mountFilters()
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-delete-1"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Диалог недоступен')
    expect(fetchWrapper.delete).not.toHaveBeenCalled()
  })

  it('does not display load, confirmation, or delete failures after unmount', async () => {
    let rejectLoad
    fetchWrapper.get.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectLoad = reject }))
    const loading = mountFilters()
    loading.unmount()
    rejectLoad(new Error('Поздняя загрузка'))
    await flushPromises()

    fetchWrapper.get.mockResolvedValueOnce([filter])
    let rejectConfirm
    confirm.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectConfirm = reject }))
    const confirming = mountFilters()
    await flushPromises()
    await confirming.find('[data-testid="parcel-filter-delete-1"]').trigger('click')
    confirming.unmount()
    rejectConfirm(new Error('Позднее подтверждение'))
    await flushPromises()

    let rejectDelete
    fetchWrapper.delete.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectDelete = reject }))
    const deleting = mountFilters()
    await flushPromises()
    await deleting.find('[data-testid="parcel-filter-delete-1"]').trigger('click')
    await flushPromises()
    deleting.unmount()
    rejectDelete(new Error('Позднее удаление'))
    await flushPromises()
  })
})


describe('administrator profile filter context', () => {
  it('uses the profile owner for loading, create/edit links and deletion', async () => {
    const wrapper = mountFilters(42)
    const pinia = wrapper.vm.$pinia
    const store = useParcelFiltersStore(pinia)
    store.filters = [{ ...filter, id: 7, name: 'Личный' }]
    await flushPromises()
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringMatching(/parcel-filters\?userId=42$/))
    await wrapper.get('[data-testid="parcel-filter-create"]').trigger('click')
    expect(push).toHaveBeenLastCalledWith({ path: '/parcel-filters/create', query: { userId: '42' } })
    await wrapper.get('[data-testid="parcel-filter-edit-1"]').trigger('click')
    expect(push).toHaveBeenLastCalledWith({ path: '/parcel-filters/edit/1', query: { userId: '42' } })
    await wrapper.get('[data-testid="parcel-filter-delete-1"]').trigger('click')
    await flushPromises()
    expect(fetchWrapper.delete).toHaveBeenCalledWith(expect.stringMatching(/parcel-filters\/1\?userId=42$/))
    expect(wrapper.text()).not.toContain(filter.name)
    expect(store.filters[0].name).toBe('Личный')
    wrapper.unmount()
  })

  it.each([false, true])('ignores a superseded profile load (rejection: %s)', async reject => {
    let finish
    fetchWrapper.get.mockImplementationOnce(() => new Promise((resolve, no) => { finish = reject ? no : resolve }))
    const wrapper = mountFilters(42)
    await wrapper.setProps({ userId: 43 })
    await flushPromises()
    const alerts = useAlertStore(wrapper.vm.$pinia)
    alerts.error('Текущая страница')
    finish(reject ? new Error('Старый запрос') : [{ ...filter, name: 'Старый фильтр' }])
    await flushPromises()
    expect(wrapper.text()).toContain(filter.name)
    expect(wrapper.text()).not.toContain('Старый фильтр')
    expect(wrapper.get('[role="alert"]').text()).toContain('Текущая страница')
    wrapper.unmount()
  })

  it.each(['confirm', 'confirmFailure', 'delete', 'deleteFailure', 'navigation'])('ignores stale %s after a profile change', async operation => {
    let finish
    const failure = new Error('Поздняя ошибка')
    const pending = new Promise((resolve, reject) => { finish = operation.endsWith('Failure') || operation === 'navigation' ? () => reject(failure) : resolve })
    if (operation.startsWith('confirm')) confirm.mockReturnValueOnce(pending)
    else if (operation === 'navigation') push.mockReturnValueOnce(pending)
    else fetchWrapper.delete.mockReturnValueOnce(pending)
    const wrapper = mountFilters(42)
    await flushPromises()
    await wrapper.get(`[data-testid="parcel-filter-${operation === 'navigation' ? 'create' : 'delete-1'}"]`).trigger('click')
    await flushPromises()
    await wrapper.setProps({ userId: 43 })
    await flushPromises()
    useAlertStore(wrapper.vm.$pinia).error('Текущая страница')
    finish(true)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Текущая страница')
    expect(wrapper.text()).toContain(filter.name)
    if (operation.startsWith('confirm')) expect(fetchWrapper.delete).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('reloads locally when the signed-in account changes', async () => {
    const wrapper = mountFilters(42)
    await flushPromises()
    fetchWrapper.get.mockResolvedValueOnce([{ ...filter, name: 'Новая сессия' }])
    useAuthStore(wrapper.vm.$pinia).user = { id: 8 }
    await flushPromises()
    expect(wrapper.text()).toContain('Новая сессия')
    wrapper.unmount()
  })
})
