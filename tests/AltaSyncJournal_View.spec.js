// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import View from '@/views/AltaSyncJournal_View.vue'

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

  function open() {
    wrapper = mount(View, {
      attachTo: document.body,
      global: {
        plugins: [createPinia(), createVuetify()],
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

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    fetchWrapper.get.mockReset().mockResolvedValue(populatedPage)
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

  it('renders server field errors locally and shows one general alert for a rejected query', async () => {
    open()
    await flushPromises()
    await from().setValue('2026-11-19T11:00')
    await cmr().setValue('CMR+1')

    fetchWrapper.get.mockRejectedValueOnce(Object.assign(new Error('период'), {
      data: { msg: 'Уточните период', errors: { from: ['Укажите корректные дату и время начала периода (МСК)'] } }
    }))
    await apply()
    await flushPromises()
    expect(wrapper.get('#alta-journal-from-error').text()).toContain('Укажите корректные дату и время')
    expect(wrapper.find('[data-testid="page-alert-region"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Повторить загрузку журнала"]').exists()).toBe(false)

    fetchWrapper.get.mockRejectedValueOnce(new Error('Unexpected query failure'))
    await apply()
    await flushPromises()
    const [alert] = wrapper.findAll('[data-testid="page-alert-region"]')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(alert.element.previousElementSibling).toBe(wrapper.get('hr.hr').element)
    expect(alert.text()).toContain('Не удалось загрузить журнал синхронизации Альта Софт')
    expect(alert.text()).not.toContain('Unexpected query failure')
    expect(from().element.value).toBe('2026-11-19T11:00')
    expect(cmr().element.value).toBe('CMR+1')

    await wrapper.get('[aria-label="Повторить загрузку журнала"]').trigger('click')
    await flushPromises()
    expect(queryAt(3)).toEqual(queryAt(2))
    expect(wrapper.text()).toContain('Выпущено без уплаты')
  })

  it('retries a failed page without changing the applied filters or the page number', async () => {
    open()
    await flushPromises()
    await parcel().setValue('000A')
    await apply()
    await flushPromises()

    fetchWrapper.get.mockRejectedValueOnce(new Error('Ошибка загрузки страницы'))
    await nextPage()
    await flushPromises()
    expect(queryAt(2)).toMatchObject({ page: '2', parcelNumber: '000A' })
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).not.toContain('Повторить загрузку журнала')

    await wrapper.get('[aria-label="Повторить загрузку журнала"]').trigger('click')
    await flushPromises()
    expect(queryAt(3)).toEqual(queryAt(2))
    expect(wrapper.find('[aria-label="Повторить загрузку журнала"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Выпущено без уплаты')
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
