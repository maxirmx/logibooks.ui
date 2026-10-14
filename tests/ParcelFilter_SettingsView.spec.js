/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import ParcelFilterSettingsView from '@/views/ParcelFilter_SettingsView.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { reportError } from '@/helpers/error.helpers.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'

const push = vi.hoisted(() => vi.fn())
vi.mock('vue-router', async () => ({ ...await vi.importActual('vue-router'), useRouter: () => ({ push }) }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({ user: { id: 7 } }) }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
vi.mock('@/helpers/error.helpers.js', async importOriginal => ({ ...await importOriginal(), reportError: vi.fn() }))

const registerOps = {
  customsProcedures: [], transportationTypes: [], incoterms: [{ value: 1, name: 'EXW' }],
  passportCheckStatuses: [{ value: 30, code: 'NotExists', name: 'Несуществующий' }]
}
const filter = {
  id: 1, name: 'Мой фильтр', excludedParcelStatusIds: [2],
  excludedCheckStatuses: { common: [381], sw: [256], fc: [256] },
  excludedPassportCheckStatuses: [30]
}
const copy = value => JSON.parse(JSON.stringify(value))
const ActionButton = {
  props: ['item', 'disabled', 'tooltipText'], emits: ['click'],
  template: '<button type="button" :disabled="disabled" :aria-label="tooltipText" @click="$emit(\'click\', item)"></button>'
}
function mountView(props) {
  const pinia = createPinia()
  const wrapper = mount(ParcelFilterSettingsView, { props, global: { plugins: [pinia], stubs: { ActionButton } } })
  return { wrapper, alertStore: useAlertStore(pinia) }
}
beforeEach(() => {
  reportError.mockReset()
  push.mockReset().mockResolvedValue()
  fetchWrapper.get.mockReset().mockImplementation(url => {
    if (url.endsWith('/parcelstatuses')) return Promise.resolve([{ id: 2, title: 'Реальный статус' }])
    if (url.endsWith('/registers/ops')) return Promise.resolve(copy(registerOps))
    if (url.endsWith('/parcel-filters')) return Promise.resolve([copy(filter)])
    return url.endsWith('/1') ? Promise.resolve(copy(filter)) : Promise.reject(Object.assign(new Error('Фильтр не найден'), { status: 404 }))
  })
  fetchWrapper.post.mockReset().mockResolvedValue({ ...copy(filter), id: 3 })
  fetchWrapper.put.mockReset().mockResolvedValue(undefined)
})

describe('ParcelFilter_SettingsView', () => {
  it.each(['unmount', 'reuse'])('preserves the current alert when navigation rejects after %s', async change => {
    let rejectNavigation
    push.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectNavigation = reject }))
    const { wrapper, alertStore } = mountView({ mode: 'create' })
    await flushPromises()
    const navigate = wrapper.vm.returnToProfile
    const pinia = wrapper.vm.$pinia
    await wrapper.get('[data-testid="parcel-filter-back"]').trigger('click')
    let destination = wrapper
    if (change === 'reuse') {
      await wrapper.setProps({ mode: 'edit', id: 999 })
      await flushPromises()
    } else {
      wrapper.unmount()
      destination = mount(PageAlertRegion, { global: { plugins: [pinia] } })
    }
    alertStore.error('Current page alert')
    await flushPromises()
    const failure = new Error('Abandoned editor navigation')
    rejectNavigation(failure)
    await flushPromises()
    expect(destination.get('[role="alert"]').text()).toContain('Current page alert')
    expect(destination.text()).not.toContain('Abandoned editor navigation')
    expect(reportError).toHaveBeenCalledWith(failure, { context: 'parcel filter profile navigation after editor change' })
    if (change === 'unmount') {
      expect(await navigate()).toBe(false)
      expect(push).toHaveBeenCalledOnce()
    }
    destination.unmount()
  })
  it('disables Save for empty, long, and duplicate names', async () => {
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    const name = wrapper.find('[data-testid="parcel-filter-name"]')
    await name.setValue('   ')
    expect(wrapper.find('[role="alert"]').text()).toContain('Укажите название')
    await name.setValue('x'.repeat(101))
    expect(wrapper.find('[role="alert"]').text()).toContain('100 символов')
    await name.setValue(' МОЙ ФИЛЬТР ')
    expect(wrapper.find('[role="alert"]').text()).toContain('уже есть')
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeDefined()
    await name.setValue('Новый фильтр')
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeUndefined()
  })

  it('submits selected parcel and check statuses without the locked partner code', async () => {
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-name"]').setValue('Выбор')
    for (const [key, value] of [['common', 380], ['sw', 256], ['fc', 256], ['passport', 30], ['statuses', 2]]) {
      await wrapper.find(`[data-testid="parcel-filter-${key}"] input[value="${value}"]`).setValue(true)
    }
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    const payload = fetchWrapper.post.mock.calls[0][1]
    expect(payload.excludedParcelStatusIds).toEqual([2])
    expect(payload.excludedCheckStatuses).toEqual({ common: [380], sw: [256], fc: [256] })
    expect(payload.excludedPassportCheckStatuses).toEqual([30])
    expect(payload.excludedCheckStatuses.common).not.toContain(0x01ff)
  })

  it('preserves the draft on rejection and retries without premature navigation', async () => {
    fetchWrapper.post.mockRejectedValueOnce(new Error('Сервер недоступен'))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-name"]').setValue('Повторить')
    await wrapper.find('[data-testid="parcel-filter-passport"] input').setValue(true)
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Сервер недоступен')
    expect(wrapper.find('[data-testid="parcel-filter-name"]').element.value).toBe('Повторить')
    expect(wrapper.find('[data-testid="parcel-filter-passport"] input').element.checked).toBe(true)
    expect(push).not.toHaveBeenCalled()
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    expect(fetchWrapper.post).toHaveBeenCalledTimes(2)
    expect(fetchWrapper.post.mock.calls[1][1].excludedPassportCheckStatuses).toEqual([30])
    expect(push).toHaveBeenCalledOnce()
  })

  it('places a 409 response with the name and keeps the form open', async () => {
    fetchWrapper.post.mockRejectedValueOnce(Object.assign(new Error('Фильтр с таким названием уже есть'), { status: 409 }))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-name"]').setValue('Конфликт')
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain('уже есть')
    expect(wrapper.find('form').exists()).toBe(true)
    expect(push).not.toHaveBeenCalled()
  })

  it('shows a missing filter with a working close action', async () => {
    const { wrapper } = mountView({ mode: 'edit', id: 999 })
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('не найден')
    await wrapper.find('[data-testid="parcel-filter-back"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/user/edit/7')
  })

  it('retries navigation without submitting the saved filter twice', async () => {
    push.mockRejectedValueOnce(new Error('Переход не удался'))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-name"]').setValue('Сохранённый')
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Переход не удался')
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeDefined()
    await wrapper.find('[data-testid="page-alert-region"] button').trigger('click')
    await flushPromises()
    expect(push).toHaveBeenCalledTimes(2)
    expect(fetchWrapper.post).toHaveBeenCalledOnce()
  })

  it('reloads on route reuse and does not publish a late save failure', async () => {
    const route = mountView({ mode: 'edit', id: 1 })
    await flushPromises()
    await route.wrapper.setProps({ mode: 'edit', id: 999 })
    await flushPromises()
    expect(route.wrapper.find('form').exists()).toBe(false)
    expect(route.wrapper.find('[data-testid="page-alert-region"]').text()).toContain('не найден')

    let rejectSave
    fetchWrapper.post.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectSave = reject }))
    const saving = mountView({ mode: 'create' })
    await flushPromises()
    await saving.wrapper.find('[data-testid="parcel-filter-name"]').setValue('В процессе')
    await saving.wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    saving.wrapper.unmount()
    rejectSave(new Error('Позднее сохранение'))
    await flushPromises()
    expect(saving.alertStore.alert).toBeNull()
  })

  it('does not redirect after a save succeeds on an abandoned editor', async () => {
    let resolveSave
    fetchWrapper.post.mockImplementationOnce(() => new Promise(resolve => { resolveSave = resolve }))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-name"]').setValue('В процессе')
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    wrapper.unmount()
    resolveSave({ ...filter, id: 3, name: 'В процессе' })
    await flushPromises()
    expect(push).not.toHaveBeenCalled()
  })

  it('does not redirect or show an old save error when the route reuses the editor', async () => {
    let rejectSave
    fetchWrapper.put.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectSave = reject }))
    const { wrapper } = mountView({ mode: 'edit', id: 1 })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    await wrapper.setProps({ mode: 'edit', id: 999 })
    await flushPromises()
    rejectSave(new Error('Старое сохранение'))
    await flushPromises()
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).not.toContain('Старое сохранение')
  })

  it('offers retry for load rejection and ignores a late rejection after unmount', async () => {
    fetchWrapper.get.mockRejectedValueOnce(new Error('Статусы недоступны'))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Статусы недоступны')
    expect(wrapper.find('form').exists()).toBe(false)
    await wrapper.find('[data-testid="page-alert-region"] button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('fieldset')).toHaveLength(5)

    let rejectLoad
    fetchWrapper.get.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectLoad = reject }))
    const abandoned = mountView({ mode: 'create' })
    abandoned.wrapper.unmount()
    rejectLoad(new Error('Поздняя ошибка'))
    await flushPromises()
    expect(abandoned.alertStore.alert).toBeNull()
  })
})
