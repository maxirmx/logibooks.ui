/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { h, Suspense } from 'vue'
import ParcelStatusSettings from '@/dialogs/ParcelStatus_Settings.vue'
import { defaultGlobalStubs, resolveAll } from './helpers/test-utils.js'

const store = vi.hoisted(() => ({ getById: vi.fn(), create: vi.fn(), update: vi.fn() }))
const push = vi.hoisted(() => vi.fn())
vi.mock('@/stores/parcel.statuses.store.js', () => ({ useParcelStatusesStore: () => store }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({ canWriteSettings: true }) }))
vi.mock('@/router', () => ({ default: { push } }))

const saved = { id: 1, title: 'Черновик', bkColor: '#112233', useAtCustomsProcessing: true }
let wrapper

beforeEach(() => {
  vi.resetAllMocks()
  store.getById.mockResolvedValue(saved)
  store.update.mockResolvedValue(undefined)
})

afterEach(() => wrapper?.unmount())

async function openEditor(mode) {
  wrapper = mount({
    render: () => h(Suspense, null, {
      default: () => h(ParcelStatusSettings, { mode, orderStatusId: saved.id })
    })
  }, { global: { plugins: [createPinia()], stubs: defaultGlobalStubs } })
  await resolveAll()
}

describe('ParcelStatus_Settings.vue', () => {
  it('clears the export color and submits null', async () => {
    await openEditor('edit')
    const rgb = wrapper.get('#bkColor')
    const clear = wrapper.get('button[data-testid="bk-color-clear-action"]')
    expect(rgb.element.value).toBe('17, 34, 51')
    expect(clear.element.disabled).toBe(false)

    await clear.trigger('click')
    expect(saved.bkColor).toBe('#112233')
    expect(rgb.element.value).toBe('')
    expect(rgb.attributes('placeholder')).toBe('Не задан')
    expect(wrapper.get('.status-color-swatch').classes()).toContain('status-color-swatch--empty')
    expect(clear.element.disabled).toBe(true)

    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(store.update).toHaveBeenCalledExactlyOnceWith(
      saved.id, expect.objectContaining({ bkColor: null })
    ))
  })

  it.each([
    ['Already exists (409)', 'Такой статус посылки уже существует'],
    [undefined, 'Ошибка при создании статуса посылки']
  ])('shows a rejected create request with message %s', async (diagnostic, message) => {
    store.create.mockRejectedValueOnce(new Error(diagnostic))
    await openEditor('create')
    await wrapper.get('#title').setValue('Черновик')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.get('hr.hr + [data-testid="page-alert-region"]').text())
      .toContain(message))
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(push).not.toHaveBeenCalled()
  })
})
