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
function mountFilters() {
  return mount({ components: { UserParcelFilters, PageAlertRegion }, template: '<div><UserParcelFilters /><PageAlertRegion /></div>' }, {
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
    alerts.error('Destination alert')
    const destination = mount(PageAlertRegion, { global: { plugins: [pinia] } })
    const failure = new Error('Abandoned navigation')
    rejectNavigation(failure)
    await flushPromises()
    expect(destination.get('[role="alert"]').text()).toContain('Destination alert')
    expect(destination.text()).not.toContain('Abandoned navigation')
    expect(reportError).toHaveBeenCalledExactlyOnceWith(failure, { context: 'parcel filter navigation after disposal' })
    await openFilter('/parcel-filters/create')
    expect(push).toHaveBeenCalledOnce()
    destination.unmount()
  })
  it('loads saved filters and uses the shared full-width table pattern', async () => {
    const wrapper = mountFilters()
    await flushPromises()
    expect(wrapper.find('#user-parcel-filters-heading').text()).toBe('Пользовательские фильтры:')
    expect(wrapper.find('.user-parcel-filters__header > .label').exists()).toBe(true)
    expect(wrapper.find('.user-parcel-filters__header').element.nextElementSibling)
      .toBe(wrapper.find('.user-parcel-filters__table-shell.table-card').element)
    expect(wrapper.find('.table-card .v-data-table.interlaced-table').exists()).toBe(true)
    expect(wrapper.find('.v-data-table-footer').exists()).toBe(false)
    expect(wrapper.findAll('th').map(cell => cell.text())).toEqual(['', 'Название', 'Исключено статусов'])
    expect(wrapper.find('tbody tr').text()).toContain('Исключить проблемы')
    expect(wrapper.find('tbody tr').text()).toContain('3')
    expect(wrapper.find('tbody td:first-child [data-testid="parcel-filter-edit-1"]').exists()).toBe(true)
    await wrapper.find('[data-testid="parcel-filter-create"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/parcel-filters/create')
    await wrapper.find('[data-testid="parcel-filter-edit-1"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/parcel-filters/edit/1')
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

  it('confirms deletion and removes the row only after API success', async () => {
    const wrapper = mountFilters()
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-delete-1"]').trigger('click')
    await flushPromises()
    expect(confirm).toHaveBeenCalledOnce()
    expect(fetchWrapper.delete).toHaveBeenCalledWith(expect.stringMatching(/\/parcel-filters\/1$/))
    expect(wrapper.findAll('tbody .v-data-table__tr')).toHaveLength(0)
    expect(wrapper.text()).toContain('Нет пользовательских фильтров')
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('удалён')
  })

  it('keeps the row and offers retry on deletion failure', async () => {
    fetchWrapper.delete.mockRejectedValueOnce(new Error('Удаление не удалось'))
    const wrapper = mountFilters()
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-delete-1"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('tbody tr').exists()).toBe(true)
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Удаление не удалось')
    await wrapper.find('[data-testid="page-alert-region"] button').trigger('click')
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

  it('shows retryable list failure and recovers', async () => {
    fetchWrapper.get.mockRejectedValueOnce(new Error('Список недоступен'))
    const wrapper = mountFilters()
    await flushPromises()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Список недоступен')
    await wrapper.find('[data-testid="page-alert-region"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('tbody tr').exists()).toBe(true)
  })

  it('reports a navigation failure once', async () => {
    push.mockRejectedValueOnce(new Error('Navigation failed'))
    const wrapper = mountFilters()
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-create"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Navigation failed')
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
