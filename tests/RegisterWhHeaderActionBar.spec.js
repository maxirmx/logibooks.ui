// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

/* @vitest-environment jsdom */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import RegisterWhHeaderActionBar from '@/components/RegisterWhHeaderActionBar.vue'
import { OZON_COMPANY_ID } from '@/helpers/company.constants.js'

const confirmMock = vi.hoisted(() => vi.fn())
const download = vi.fn().mockResolvedValue(true)
const getDownloadFormats = vi.fn()
const alertError = vi.fn()
let isWhManagerPlus = true
let isSrLogistPlus = true

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    download,
    getDownloadFormats
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ error: alertError })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    hasLogistRole: true,
    isWhManagerPlus,
    isSrLogistPlus
  })
}))

const ActionButton2LStub = {
  name: 'ActionButton2L',
  props: ['options', 'disabled'],
  template: '<div data-testid="export-btn"></div>'
}

const ActionButtonStub = {
  name: 'ActionButton',
  props: ['icon', 'disabled', 'tooltipText'],
  emits: ['click'],
  template: `<button
    type="button"
    :data-testid="icon?.includes('xmark') ? 'close-btn' : icon?.includes('pen-to-square') ? 'bulk-status-btn' : 'action-btn'"
    :title="tooltipText"
    :disabled="disabled"
    @click="$emit('click')"
  />`
}

function createDeferred() {
  let resolve
  const promise = new Promise((res) => {
    resolve = res
  })

  return { promise, resolve }
}

function mountHeaderActionBar(props) {
  return mount(RegisterWhHeaderActionBar, {
    props,
    global: {
      stubs: {
        ActionButton: ActionButtonStub,
        ActionButton2L: ActionButton2LStub
      }
    }
  })
}

describe('RegisterWhHeaderActionBar.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmMock.mockReset()
    isWhManagerPlus = true
    isSrLogistPlus = true
    getDownloadFormats.mockResolvedValue({ company: { available: true, name: 'Receiver' } })
  })

  it('builds export options with "Все посылки" and normalized zone names', () => {
    const wrapper = mountHeaderActionBar({
      register: { id: 77, fileName: 'register_77.xlsx' },
      zones: [
        { value: 1, name: 'Зона 1' },
        { value: 2, name: '' }
      ]
    })

    const actionButton2L = wrapper.findComponent(ActionButton2LStub)
    const labels = actionButton2L.props('options').map((option) => option.label)
    expect(labels).toEqual(['Все посылки', 'Зона 1', 'Без зоны (не найдены)'])
  })

  it('reports a supported warehouse download failure once without alert callbacks', async () => {
    download.mockRejectedValueOnce(new Error('download failed'))
    const wrapper = mountHeaderActionBar({
      register: { id: 77, registerType: OZON_COMPANY_ID, fileName: 'register_77.xlsx' },
      zones: [{ value: 3, name: 'Zone 3' }]
    })
    await vi.waitFor(() => expect(wrapper.findComponent(ActionButton2LStub).props('options')).toHaveLength(4))
    expect(await wrapper.findComponent(ActionButton2LStub).props('options')[3].action()).toBe(false)
    expect(alertError).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
  })

  it('emits bulk status change event from header action', async () => {
    const wrapper = mountHeaderActionBar({
      register: { id: 77, fileName: 'register_77.xlsx' },
      zones: []
    })

    await wrapper.get('[data-testid="bulk-status-btn"]').trigger('click')

    expect(wrapper.emitted('bulk-change-parcel-status')).toHaveLength(1)
  })

  it('prevents another export while the correction choice dialog is open', async () => {
    const deferred = createDeferred()
    confirmMock.mockReturnValueOnce(deferred.promise)
    const wrapper = mountHeaderActionBar({
      register: {
        id: 77,
        fileName: 'register_77.xlsx',
        realWeightKg: 5,
        totalWeightKgToRelease: 10
      },
      zones: [{ value: 8, name: 'Зона A' }]
    })

    const actionButton2L = wrapper.findComponent(ActionButton2LStub)
    const allParcelsOption = actionButton2L.props('options')[0]
    const zoneOption = actionButton2L.props('options')[1]

    const firstPromise = zoneOption.action()
    await nextTick()

    expect(wrapper.findComponent(ActionButton2LStub).props('disabled')).toBe(true)

    const secondPromise = allParcelsOption.action()
    await nextTick()

    deferred.resolve(true)

    await firstPromise
    await secondPromise

    expect(download).toHaveBeenCalledTimes(1)
    expect(download).toHaveBeenCalledWith(77, 'register_77.xlsx', 8, 'Зона A', true)

    await nextTick()
    expect(wrapper.findComponent(ActionButton2LStub).props('disabled')).toBe(false)
  })

  it('emits close on close button click', async () => {
    const wrapper = mountHeaderActionBar({
      register: { id: 55, fileName: 'register_55.xlsx' },
      zones: []
    })

    await wrapper.get('[data-testid="close-btn"]').trigger('click')
    expect(wrapper.emitted('close')?.length).toBeGreaterThanOrEqual(1)
  })

  it('groups the customs toggle and Close separately and allows switching a read-only register', async () => {
    const wrapper = mountHeaderActionBar({ register: { id: 55, readOnly: true } })
    const toggle = wrapper.get('button[aria-label="Оформление"]')
    const close = wrapper.get('[data-testid="close-btn"]')
    const bulk = wrapper.get('[data-testid="bulk-status-btn"]')
    const navigationGroup = toggle.element.closest('.header-actions-group')
    expect(navigationGroup).toBe(wrapper.element.lastElementChild)
    expect(Array.from(navigationGroup.querySelectorAll('button'))).toEqual([toggle.element, close.element])
    expect(navigationGroup.previousElementSibling).toBe(bulk.element.closest('.header-actions-group'))
    expect(toggle.element.disabled).toBe(false)
    expect(bulk.element.disabled).toBe(true)

    await wrapper.setProps({ loading: true })
    expect(toggle.element.disabled).toBe(true)
    await wrapper.setProps({ loading: false, disabled: true })
    expect(toggle.element.disabled).toBe(true)
    await wrapper.setProps({ disabled: false, register: {} })
    expect(toggle.element.disabled).toBe(true)
    wrapper.unmount()
  })

  it('omits the bulk-status action group when the user cannot change parcel status', () => {
    isSrLogistPlus = false
    const wrapper = mountHeaderActionBar({ register: { id: 55 } })
    const groups = wrapper.findAll('.header-actions-group')
    expect(groups).toHaveLength(2)
    expect(groups[0].get('[data-testid="export-btn"]').exists()).toBe(true)
    expect(groups[1].get('[data-testid="close-btn"]').exists()).toBe(true)
    wrapper.unmount()
  })

})
