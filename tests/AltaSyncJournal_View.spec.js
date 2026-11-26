// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { createVuetify } from 'vuetify'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import View from '@/views/AltaSyncJournal_View.vue'
import UserLoginView from '@/views/User_LoginView.vue'

vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn() } }))

const emptyPage = { items: [], pagination: { totalCount: 0 } }
const populatedPage = {
  items: [
    { id: 8, decisionAt: '2026-11-19T08:09:59Z', cmrNumber: 'CMR+1', parcelNumber: '000A',
      decCode: 'DEC/1', decisionCode: 10, processingResult: 'Выпущено без уплаты' },
    { id: 6, decisionAt: null, cmrNumber: null, parcelNumber: null, decCode: null,
      decisionCode: 0, processingResult: 'Ошибка: посылка не найдена' }
  ],
  pagination: { totalCount: 140 }
}

function queryAt(call) {
  const address = fetchWrapper.get.mock.calls[call][0]
  const url = new URL(address, 'http://localhost')
  expect(url.pathname).toMatch(/\/alta\/sync-journal$/)
  return Object.fromEntries(url.searchParams)
}

describe('Alta sync journal', () => {
  let wrapper
  let router
  let auth

  function open() {
    const pinia = createPinia()
    auth = useAuthStore(pinia)
    auth.user = { id: 5 }
    router.afterEach(() => useAlertStore(pinia).clear())
    wrapper = mount(RouterView, {
      attachTo: document.body,
      global: {
        plugins: [pinia, router, createVuetify()],
        stubs: {
          FontAwesomeIcon: true,
          VTooltip: { template: '<slot name="activator" :props="{}" />' }
        }
      }
    })
  }

  const from = () => wrapper.get('#alta-journal-from')
  const to = () => wrapper.get('#alta-journal-to')
  const cmr = () => wrapper.get('#alta-journal-cmr')
  const parcel = () => wrapper.get('#alta-journal-parcel')
  const apply = () => wrapper.get('form').trigger('submit')
  const reset = () => wrapper.get('[aria-label="Сбросить фильтры"]').trigger('click')
  const nextPage = () => wrapper.get('button[aria-label="Next page"]').trigger('click')

  beforeEach(async () => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    fetchWrapper.get.mockReset().mockResolvedValue(populatedPage)
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/alta-sync', component: View },
        { path: '/login', component: UserLoginView }
      ]
    })
    await router.push('/alta-sync?source=menu')
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads the default page and shows saved results and decision times in Moscow', async () => {
    open()
    expect(wrapper.get('[aria-label="Загрузка журнала"]').attributes('role')).toBe('status')
    await flushPromises()

    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    expect(queryAt(0)).toEqual({ page: '1', pageSize: '50', sortBy: 'decisionAt', sortOrder: 'desc' })
    expect(wrapper.get('h1').text()).toBe('Журнал синхронизации Альта Софт')
    expect(wrapper.get('fieldset legend').text()).toBe('Дата таможенного решения (МСК)')
    expect(from().attributes('type')).toBe('datetime-local')
    expect(wrapper.get('button[aria-label="Применить фильтры"]').attributes('type')).toBe('submit')
    const [first, second] = wrapper.findAll('tbody tr')
    expect(first.text()).toContain('11:09')
    expect(first.text()).toContain('000A')
    expect(first.text()).toContain('Выпущено без уплаты')
    expect(second.findAll('td').map(cell => cell.text())).toEqual([
      '—', '—', '—', '—', '0', 'Ошибка: посылка не найдена'
    ])
  })

  it('paginates, sorts both directions and applies or resets all filters once on page 1', async () => {
    open()
    await flushPromises()
    await nextPage()
    await flushPromises()
    expect(queryAt(1).page).toBe('2')
    const cmrHeader = () => wrapper.findAll('th').find(header => header.text() === 'CMR')
    await cmrHeader().get('.v-data-table-header__content').trigger('click')
    await flushPromises()
    expect(queryAt(2)).toMatchObject({ page: '1', sortBy: 'cmrNumber', sortOrder: 'asc' })
    await cmrHeader().get('.v-data-table-header__content').trigger('click')
    await flushPromises()
    expect(queryAt(3)).toMatchObject({ page: '1', sortBy: 'cmrNumber', sortOrder: 'desc' })
    await nextPage()
    await flushPromises()

    await from().setValue('2026-11-19T11:09')
    await to().setValue('2026-11-19T15:01')
    await cmr().setValue(' CMR+1 ')
    await parcel().setValue(' 000A ')
    expect(fetchWrapper.get).toHaveBeenCalledTimes(5)
    await apply()
    await flushPromises()
    expect(fetchWrapper.get).toHaveBeenCalledTimes(6)
    expect(queryAt(5)).toEqual({
      page: '1', pageSize: '50', sortBy: 'cmrNumber', sortOrder: 'desc',
      from: '2026-11-19T11:09', to: '2026-11-19T15:01', cmrNumber: 'CMR+1', parcelNumber: '000A'
    })
    await reset()
    await flushPromises()
    expect(fetchWrapper.get).toHaveBeenCalledTimes(7)
    expect(queryAt(6)).toEqual({ page: '1', pageSize: '50', sortBy: 'cmrNumber', sortOrder: 'desc' })
    expect([from(), to(), cmr(), parcel()].map(field => field.element.value)).toEqual(['', '', '', ''])
  })

  it('distinguishes an empty journal from a search without matches', async () => {
    fetchWrapper.get.mockResolvedValue(emptyPage)
    open()
    await flushPromises()
    expect(wrapper.text()).toContain('В журнале пока нет записей')
    await cmr().setValue('CMR+1')
    await apply()
    await flushPromises()
    expect(wrapper.text()).toContain('По заданным фильтрам записи не найдены')
  })

  it('shows an invalid range beneath the date control and accepts a corrected retry', async () => {
    open()
    await flushPromises()
    await from().setValue('2026-11-19T12:00')
    await to().setValue('2026-11-19T11:00')
    await apply()

    const message = wrapper.get('#alta-journal-to-error')
    expect(message.text()).toBe('Дата окончания периода должна быть не раньше даты начала')
    expect(to().attributes('aria-describedby')).toBe(message.attributes('id'))
    expect(message.element.previousElementSibling).toBe(to().element.closest('label'))
    expect(wrapper.find('[data-testid="page-alert-region"]').exists()).toBe(false)
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)

    await to().setValue('2026-11-19T12:00')
    await apply()
    await flushPromises()
    expect(queryAt(1)).toMatchObject({ from: '2026-11-19T12:00', to: '2026-11-19T12:00' })
    expect(wrapper.find('#alta-journal-to-error').exists()).toBe(false)
  })

  it('keeps the journal open for validation errors and submits corrected filters', async () => {
    open()
    await flushPromises()
    await from().setValue('2026-11-19T11:00')
    await cmr().setValue('CMR+1')

    fetchWrapper.get.mockRejectedValueOnce(Object.assign(new Error('период'), {
      status: 400,
      data: { msg: 'Уточните период', errors: { from: ['Укажите корректные дату и время начала периода (МСК)'] } }
    }))
    await apply()
    await flushPromises()
    expect(wrapper.get('#alta-journal-from-error').text()).toContain('Укажите корректные дату и время')
    expect(wrapper.find('[data-testid="page-alert-region"]').exists()).toBe(false)
    expect(router.currentRoute.value.fullPath).toBe('/alta-sync?source=menu')
    expect(from().element.value).toBe('2026-11-19T11:00')
    expect(cmr().element.value).toBe('CMR+1')

    await from().setValue('2026-11-19T11:01')
    await apply()
    await flushPromises()
    expect(queryAt(2)).toMatchObject({ from: '2026-11-19T11:01', cmrNumber: 'CMR+1' })
    expect(wrapper.text()).toContain('Выпущено без уплаты')
  })

  it('shows the server errors below both text inputs and preserves their values for correction', async () => {
    open()
    await flushPromises()
    await cmr().setValue('CMR+1')
    await parcel().setValue('000A')
    fetchWrapper.get.mockRejectedValueOnce({
      status: 400,
      data: {
        msg: 'Уточните значения фильтров',
        errors: {
          CmrNumber: ['Проверьте номер CMR «CMR+1»'],
          parcelNumber: ['Проверьте номер посылки «000A»']
        }
      }
    })
    await apply()
    await flushPromises()

    for (const [input, value, text] of [
      [cmr(), 'CMR+1', 'Проверьте номер CMR «CMR+1»'],
      [parcel(), '000A', 'Проверьте номер посылки «000A»']
    ]) {
      const error = wrapper.get('#' + input.attributes('aria-describedby'))
      expect(error.text()).toBe(text)
      expect(error.element.previousElementSibling).toBe(input.element.closest('label'))
      expect(input.attributes('aria-invalid')).toBe('true')
      expect(input.element.value).toBe(value)
    }
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(2)
    expect(wrapper.find('[data-testid="page-alert-region"]').exists()).toBe(false)

    await cmr().setValue('CMR+2')
    await parcel().setValue('000B')
    await apply()
    await flushPromises()
    expect(queryAt(2)).toMatchObject({ cmrNumber: 'CMR+2', parcelNumber: '000B' })
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('Выпущено без уплаты')
  })

  it('includes unmapped errors in the page alert even when another error is shown inline', async () => {
    open()
    await flushPromises()
    fetchWrapper.get.mockRejectedValueOnce({
      status: 400,
      data: {
        msg: 'Уточните параметры запроса',
        errors: {
          '': ['Допустимые параметры запроса изменились'],
          pageSize: ['Недопустимый размер страницы'],
          cmrNumber: ['Проверьте номер CMR']
        }
      }
    })
    await apply()
    await flushPromises()

    const alert = wrapper.get('[data-testid="page-alert-region"]')
    expect(alert.text()).toContain('Допустимые параметры запроса изменились')
    expect(alert.text()).toContain('Недопустимый размер страницы')
    expect(alert.text()).not.toContain('Уточните параметры запроса')
    expect(alert.text()).not.toContain('Проверьте номер CMR')
    expect(wrapper.get('#alta-journal-cmr-error').text()).toBe('Проверьте номер CMR')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(2)
  })

  it('shows a single page alert when only an unmapped parameter is rejected', async () => {
    open()
    await flushPromises()
    fetchWrapper.get.mockRejectedValueOnce({
      status: 400,
      data: { msg: 'Проверьте параметры запроса', errors: { sortBy: ['Недопустимое поле сортировки'] } }
    })
    await nextPage()
    await flushPromises()

    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    const alert = wrapper.get('[data-testid="page-alert-region"]')
    expect(alert.element.previousElementSibling).toBe(wrapper.get('hr.hr').element)
    expect(alert.text()).toContain('Недопустимое поле сортировки')
    expect(wrapper.find('[aria-label="Повторить загрузку журнала"]').exists()).toBe(false)
    expect(fetchWrapper.get).toHaveBeenCalledTimes(2)
  })

  it.each([1, 2])('shows a load failure for page %i on sign-in and preserves the return URL', async page => {
    const diagnostics = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('Unexpected query failure')
    const message = 'Не удалось загрузить журнал синхронизации Альта Софт'
    if (page === 1) fetchWrapper.get.mockRejectedValueOnce(error)
    open()
    if (page === 2) {
      await flushPromises()
      fetchWrapper.get.mockRejectedValueOnce(error)
      await nextPage()
    }
    await flushPromises()

    expect(fetchWrapper.get).toHaveBeenCalledTimes(page)
    expect(queryAt(page - 1).page).toBe(String(page))
    expect(router.currentRoute.value.path).toBe('/login')
    expect(auth.user).toBeNull()
    expect(auth.returnUrl).toBe('/alta-sync?source=menu')
    expect(wrapper.get('h1').text()).toBe('Вход')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain(message)
    expect(wrapper.get('[role="alert"]').text()).not.toContain(error.message)
    expect(diagnostics).toHaveBeenCalledExactlyOnceWith(`[${message}]`, error)
  })

  it('ignores stale successes and reports stale failures without publishing an alert', async () => {
    const diagnostics = vi.spyOn(console, 'error').mockImplementation(() => {})
    const obsoleteSuccess = Promise.withResolvers()
    const obsoleteFailure = Promise.withResolvers()
    fetchWrapper.get.mockReturnValueOnce(obsoleteSuccess.promise).mockReturnValueOnce(obsoleteFailure.promise)
    open()
    await apply()
    await flushPromises()
    await apply()
    await flushPromises()
    expect(wrapper.text()).toContain('Выпущено без уплаты')

    obsoleteSuccess.resolve(emptyPage)
    obsoleteFailure.reject(new Error('Obsolete request'))
    await flushPromises()
    expect(wrapper.text()).toContain('Выпущено без уплаты')
    expect(wrapper.find('[data-testid="page-alert-region"]').exists()).toBe(false)
    expect(diagnostics).toHaveBeenCalledWith(expect.stringContaining('Alta sync journal'), expect.any(Error))
  })
})
