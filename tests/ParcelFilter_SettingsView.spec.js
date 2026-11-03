// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

/* @vitest-environment jsdom */
import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import ParcelFilterSettingsView from '@/views/ParcelFilter_SettingsView.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { reportError } from '@/helpers/error.helpers.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'

enableAutoUnmount(afterEach)

const push = vi.hoisted(() => vi.fn())
vi.mock('vue-router', async () => ({ ...await vi.importActual('vue-router'), useRouter: () => ({ push }) }))
const auth = reactive({ user: { id: 7 }, isAdmin: false })
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => auth }))
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
  auth.user = { id: 7 }
  auth.isAdmin = false
  reportError.mockReset()
  push.mockReset().mockResolvedValue()
  fetchWrapper.get.mockReset().mockImplementation(url => {
    if (url.endsWith('/parcelstatuses')) return Promise.resolve([{ id: 2, title: 'Реальный статус' }])
    if (url.endsWith('/registers/ops')) return Promise.resolve(copy(registerOps))
    if (url.endsWith('/parcel-filters') || /parcel-filters\?/.test(url)) return Promise.resolve([copy(filter)])
    return /\/1(?:\?|$)/.test(url) ? Promise.resolve(copy(filter)) : Promise.reject(Object.assign(new Error('Фильтр не найден'), { status: 404 }))
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
    alertStore.error('Сообщение текущей страницы')
    await flushPromises()
    const failure = new Error('Abandoned editor navigation')
    rejectNavigation(failure)
    await flushPromises()
    expect(destination.get('[role="alert"]').text()).toContain('Сообщение текущей страницы')
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
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    await wrapper.find('[data-testid="parcel-filter-back"]').trigger('click')
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

  it('shows a load rejection, recovers on reopening, and ignores late errors', async () => {
    fetchWrapper.get.mockRejectedValueOnce(new Error('Статусы недоступны'))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Статусы недоступны')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    wrapper.unmount()
    const reloaded = mountView({ mode: 'create' })
    await flushPromises()
    expect(reloaded.wrapper.findAll('fieldset')).toHaveLength(5)

    let rejectLoad
    fetchWrapper.get.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectLoad = reject }))
    const abandoned = mountView({ mode: 'create' })
    abandoned.wrapper.unmount()
    rejectLoad(new Error('Поздняя ошибка'))
    await flushPromises()
    expect(abandoned.alertStore.alert).toBeNull()
  })
})


describe('administrator filter editor', () => {
  it.each(['create', 'edit'])('saves %s for the selected owner and returns to that profile', async mode => {
    auth.isAdmin = true
    const { wrapper } = mountView({ mode, id: mode === 'edit' ? 1 : null, userId: 42 })
    await flushPromises()
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringMatching(/parcel-filters\?userId=42$/))
    if (mode === 'edit') expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringMatching(/parcel-filters\/1\?userId=42$/))
    await wrapper.get('[data-testid="parcel-filter-name"]').setValue('Фильтр владельца')
    await wrapper.get('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    expect((mode === 'create' ? fetchWrapper.post : fetchWrapper.put).mock.calls[0][0]).toMatch(/\?userId=42$/)
    expect(push).toHaveBeenCalledWith('/user/edit/42')
    wrapper.unmount()
  })

  it('closes to the selected profile and validates against its filters', async () => {
    auth.isAdmin = true
    const { wrapper } = mountView({ mode: 'create', userId: 42 })
    await flushPromises()
    await wrapper.get('[data-testid="parcel-filter-name"]').setValue(filter.name)
    expect(wrapper.get('[role="alert"]').text()).toContain('уже есть')
    await wrapper.get('[data-testid="parcel-filter-back"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/user/edit/42')
    wrapper.unmount()
  })

  it.each([0, -1, 1.5, NaN, 2147483648])('rejects invalid owner %s without a request or fallback navigation', async userId => {
    auth.isAdmin = true
    const { wrapper } = mountView({ mode: 'create', userId })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Некорректный идентификатор пользователя')
    expect(fetchWrapper.get).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="parcel-filter-back"]').trigger('click')
    await flushPromises()
    expect(push).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('rejects another owner for an ordinary user without making requests', async () => {
    const { wrapper } = mountView({ mode: 'edit', id: 1, userId: 42 })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Недостаточно прав')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it.each(['create', 'edit'])('preserves a rejected %s draft and retries for the same owner', async mode => {
    auth.isAdmin = true
    const transport = mode === 'create' ? fetchWrapper.post : fetchWrapper.put
    transport.mockRejectedValueOnce(new Error('Technical transport exception'))
    const { wrapper } = mountView({ mode, id: mode === 'edit' ? 1 : null, userId: 42 })
    await flushPromises()
    await wrapper.get('[data-testid="parcel-filter-name"]').setValue('Черновик')
    await wrapper.get('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain('Не удалось сохранить пользовательский фильтр')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="parcel-filter-name"]').element.value).toBe('Черновик')
    expect(push).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="parcel-filter-save"]').trigger('click')
    await flushPromises()
    expect(transport).toHaveBeenCalledTimes(2)
    expect(transport.mock.calls[1][0]).toMatch(/\?userId=42$/)
    expect(push).toHaveBeenCalledWith('/user/edit/42')
    wrapper.unmount()
  })

  it.each([false, true])('ignores late owner-specific save (rejection: %s)', async rejection => {
    auth.isAdmin = true
    let finish
    fetchWrapper.put.mockReturnValueOnce(new Promise((resolve, reject) => { finish = rejection ? () => reject(new Error('Поздняя ошибка')) : resolve }))
    const { wrapper, alertStore } = mountView({ mode: 'edit', id: 1, userId: 42 })
    await flushPromises()
    await wrapper.get('[data-testid="parcel-filter-save"]').trigger('click')
    await wrapper.setProps({ userId: 43 })
    await flushPromises()
    alertStore.error('Текущая страница')
    finish()
    await flushPromises()
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('Текущая страница')
    await wrapper.get('[data-testid="parcel-filter-back"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/user/edit/43')
    wrapper.unmount()
  })
})
