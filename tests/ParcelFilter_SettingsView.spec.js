/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import ParcelFilterSettingsView from '@/views/ParcelFilter_SettingsView.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { listPrototypeParcelFilters } from '@/helpers/parcel.filters.prototype.js'

const push = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const statusStores = vi.hoisted(() => ({
  parcels: {
    parcelStatuses: [{ id: 2, title: 'Реальный статус' }, { id: 3, title: 'Другой статус' }],
    ensureLoaded: vi.fn(() => Promise.resolve())
  },
  registers: {
    ops: { passportCheckStatuses: [{ value: 30, name: 'Несуществующий' }, { value: 40, name: 'Недействительный' }] },
    ensureOpsLoaded: vi.fn(() => Promise.resolve())
  }
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return { ...actual, useRouter: () => ({ push }) }
})
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({ user: { id: 7 } }) }))
vi.mock('@/stores/parcel.statuses.store.js', () => ({ useParcelStatusesStore: () => statusStores.parcels }))
vi.mock('@/stores/registers.store.js', () => ({ useRegistersStore: () => statusStores.registers }))

const ActionButtonStub = {
  props: ['item', 'disabled', 'tooltipText'],
  emits: ['click'],
  template: '<button type="button" :disabled="disabled" :aria-label="tooltipText" @click="$emit(\'click\', item)"></button>'
}

function mountView(props) {
  const pinia = createPinia()
  const wrapper = mount(ParcelFilterSettingsView, {
    props,
    global: { plugins: [pinia], stubs: { ActionButton: ActionButtonStub } }
  })
  return { wrapper, alertStore: useAlertStore(pinia) }
}

beforeEach(() => {
  push.mockReset()
  push.mockResolvedValue()
  statusStores.parcels.ensureLoaded.mockReset()
  statusStores.parcels.ensureLoaded.mockResolvedValue()
  statusStores.registers.ensureOpsLoaded.mockReset()
  statusStores.registers.ensureOpsLoaded.mockResolvedValue()
})

describe('ParcelFilter_SettingsView', () => {
  it('loads real parcel and passport statuses and shows five checkbox groups', async () => {
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    expect(statusStores.parcels.ensureLoaded).toHaveBeenCalledOnce()
    expect(statusStores.registers.ensureOpsLoaded).toHaveBeenCalledOnce()
    expect(wrapper.findAll('fieldset')).toHaveLength(5)
    expect(wrapper.find('[data-testid="parcel-filter-statuses"]').text()).toContain('Реальный статус')
    expect(wrapper.find('[data-testid="parcel-filter-passport"]').text()).toContain('Недействительный')
    expect(wrapper.findAll('.parcel-filter-settings__left-column fieldset').map((group) => group.find('legend').text())).toEqual([
      'Общие статусы проверки', 'Проверка стоп-слов', 'Проверка ТН ВЭД', 'Проверка паспорта'
    ])
    expect(wrapper.find('.parcel-filter-settings__right-column [data-testid="parcel-filter-statuses"]').exists()).toBe(true)
    expect(wrapper.findAll('fieldset legend.label')).toHaveLength(5)
    expect(wrapper.text()).not.toContain('Проверка на складе')
    expect(wrapper.text()).not.toContain('Дубликат (устаревший)')
    const partner = wrapper.find('[data-testid="parcel-filter-common"] input:disabled')
    expect(partner.element.checked).toBe(true)
    expect(partner.element.value).toBe(String(0x01ff))
    expect(wrapper.find('[data-testid="parcel-filter-common"]').text()).not.toContain('всегда исключается')
    expect(wrapper.vm.draft.excludedCheckStatuses.common).toEqual([])
    expect(wrapper.find('[data-testid="parcel-filter-name"]').element.value).toBe('')
    expect(wrapper.find('.header-actions-group [data-testid="parcel-filter-save"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.header-actions-group [data-testid="parcel-filter-back"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="parcel-filter-prototype-notice"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('aria-label')).toContain('без сохранения')
    expect(wrapper.findAll('.custom-checkbox-box').length).toBe(wrapper.findAll('fieldset input[type="checkbox"]').length)
  })

  it('keeps invalid values on the page with a visible field error', async () => {
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    const name = wrapper.find('[data-testid="parcel-filter-name"]')
    await name.setValue('   ')
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    expect(wrapper.find('[role="alert"]').text()).toContain('Укажите название фильтра')
    expect(name.element.value).toBe('   ')
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeDefined()
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="page-alert-region"]').exists()).toBe(false)
    await name.setValue('Новый фильтр')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeUndefined()
  })

  it('disables Save for an overlong name and enables it after correction', async () => {
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    const name = wrapper.find('[data-testid="parcel-filter-name"]')
    await name.setValue('x'.repeat(101))
    expect(wrapper.find('[role="alert"]').text()).toContain('100 символов')
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeDefined()
    await name.setValue('Допустимое имя')
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeUndefined()
  })

  it('accepts empty exclusions but visibly says a valid form was not saved', async () => {
    const before = listPrototypeParcelFilters()
    const { wrapper, alertStore } = mountView({ mode: 'create' })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-name"]').setValue('Новый фильтр')
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    expect(alertStore.alert?.severity).toBe('info')
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('не сохранён')
    expect(wrapper.find('[data-testid="parcel-filter-name"]').element.value).toBe('Новый фильтр')
    expect(listPrototypeParcelFilters()).toEqual(before)
    expect(push).not.toHaveBeenCalled()
  })

  it('opens edit fixture, toggles every category, and does not mutate the fixture', async () => {
    const before = listPrototypeParcelFilters()
    const { wrapper } = mountView({ mode: 'edit', id: 1 })
    await flushPromises()
    expect(wrapper.find('[data-testid="parcel-filter-name"]').element.value).toBe('Исключить проблемы')
    const groups = wrapper.findAll('fieldset')
    expect(groups.map((group) => group.findAll('input:checked').length)).toEqual([2, 1, 1, 1, 0])
    for (const group of groups) await group.find('input:not(:checked)').setValue(true)
    expect(groups.map((group) => group.findAll('input:checked').length)).toEqual([3, 2, 2, 2, 1])
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    expect(listPrototypeParcelFilters()).toEqual(before)
    expect(push).not.toHaveBeenCalled()
  })

  it('rejects a duplicate fixture name and remains open', async () => {
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-name"]').setValue('  ИСКЛЮЧИТЬ ПРОБЛЕМЫ  ')
    await wrapper.find('[data-testid="parcel-filter-save"]').trigger('click')
    expect(wrapper.find('[role="alert"]').text()).toContain('уже есть')
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('form').exists()).toBe(true)
    expect(push).not.toHaveBeenCalled()
  })

  it('shows one visible error for an unknown fixture and allows close', async () => {
    const { wrapper } = mountView({ mode: 'edit', id: 999 })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('не найден')
    await wrapper.find('[data-testid="parcel-filter-back"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/user/edit/7')
    expect(statusStores.parcels.ensureLoaded).not.toHaveBeenCalled()
  })

  it('shows a navigation failure once and keeps the configuration page open', async () => {
    push.mockRejectedValueOnce(new Error('Navigation failed'))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    await wrapper.find('[data-testid="parcel-filter-back"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Navigation failed')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.find('form').exists()).toBe(true)
    expect(push).toHaveBeenCalledOnce()
  })

  it('shows a retryable load failure and restores real status options after retry', async () => {
    statusStores.parcels.ensureLoaded.mockRejectedValueOnce(new Error('Statuses unavailable'))
    const { wrapper } = mountView({ mode: 'create' })
    await flushPromises()
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('Statuses unavailable')
    expect(wrapper.findAll('fieldset')).toHaveLength(0)
    expect(wrapper.find('[data-testid="parcel-filter-save"]').attributes('disabled')).toBeDefined()
    await wrapper.find('[data-testid="page-alert-region"] button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('fieldset')).toHaveLength(5)
    expect(wrapper.find('[data-testid="page-alert-region"]').exists()).toBe(false)
    expect(statusStores.parcels.ensureLoaded).toHaveBeenCalledTimes(2)
  })

  it('does not show an abandoned load failure after leaving the page', async () => {
    let rejectLoad
    statusStores.parcels.ensureLoaded.mockImplementationOnce(() => new Promise((resolve, reject) => {
      rejectLoad = reject
    }))
    const { wrapper, alertStore } = mountView({ mode: 'create' })
    wrapper.unmount()
    rejectLoad(new Error('Late status failure'))
    await flushPromises()
    expect(alertStore.alert).toBeNull()
  })

  it('reloads a different fixture when the route reuses the page component', async () => {
    const { wrapper } = mountView({ mode: 'edit', id: 1 })
    await flushPromises()
    await wrapper.setProps({ mode: 'edit', id: 2 })
    expect(wrapper.find('[data-testid="parcel-filter-name"]').element.value).toBe('Пустой фильтр')
    await wrapper.setProps({ mode: 'edit', id: 999 })
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('[data-testid="page-alert-region"]').text()).toContain('не найден')
  })

  it('loads status options when an unknown edit route changes to a valid fixture', async () => {
    const { wrapper } = mountView({ mode: 'edit', id: 999 })
    expect(statusStores.parcels.ensureLoaded).not.toHaveBeenCalled()
    await wrapper.setProps({ mode: 'edit', id: 1 })
    await flushPromises()
    expect(statusStores.parcels.ensureLoaded).toHaveBeenCalledOnce()
    expect(wrapper.findAll('fieldset')).toHaveLength(5)
  })
})
