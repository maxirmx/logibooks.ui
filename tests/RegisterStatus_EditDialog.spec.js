/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { h, Suspense } from 'vue'
import RegisterStatusEditDialog from '@/dialogs/RegisterStatus_EditDialog.vue'
import { defaultGlobalStubs, resolveAll } from './helpers/test-utils.js'

const store = vi.hoisted(() => ({ getById: vi.fn(), create: vi.fn(), update: vi.fn() }))
const push = vi.hoisted(() => vi.fn())
vi.mock('@/stores/register.statuses.store.js', () => ({ useRegisterStatusesStore: () => store }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({ canWriteSettings: true }) }))
vi.mock('@/router', () => ({ default: { push } }))

const saved = { id: 1, title: 'Черновик', icon: 'svg:registered', bkColor: '#FFFFFF', fgColor: '#000000' }
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
      default: () => h(RegisterStatusEditDialog, { mode, registerStatusId: saved.id })
    })
  }, {
    attachTo: document.body,
    global: { plugins: [createPinia()], stubs: defaultGlobalStubs }
  })
  await resolveAll()
}

describe('RegisterStatus_EditDialog.vue', () => {
  it('copies a native picker color to the RGB field and accepts that value in the other field', async () => {
    await openEditor('edit')
    const background = wrapper.get('#bkColor')
    const icon = wrapper.get('#fgColor')
    expect(background.element.value).toBe('255, 255, 255')
    expect(icon.element.value).toBe('0, 0, 0')

    await wrapper.get('#bkColor-picker[type="color"]').setValue('#fff76b')
    background.element.focus()
    const { value, selectionStart, selectionEnd } = background.element
    const selected = value.slice(selectionStart, selectionEnd)
    expect(selected).toBe('255, 247, 107')

    await icon.setValue(selected)
    expect(wrapper.get('#fgColor-picker[type="color"]').element.value).toBe('#fff76b')
    const preview = wrapper.get('[data-testid="register-status-icon"]').element
    expect(preview.style.backgroundColor).toBe('rgb(255, 247, 107)')
    expect(preview.style.color).toBe('rgb(255, 247, 107)')
    expect(saved.fgColor).toBe('#000000')

    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(store.update).toHaveBeenCalledExactlyOnceWith(
      saved.id, expect.objectContaining({ bkColor: '#fff76b', fgColor: '#fff76b' })
    ))
    expect(push).toHaveBeenCalledExactlyOnceWith('/registerstatuses')
  })

  it('blocks invalid RGB values and keeps corrected values after a rejected save for retry', async () => {
    await openEditor('edit')
    const background = wrapper.get('#bkColor')
    const icon = wrapper.get('#fgColor')
    await background.setValue('256, 0, 0')
    await background.trigger('blur')
    await vi.waitFor(() => expect(background.attributes('aria-invalid')).toBe('true'))
    await icon.setValue('2, 3')
    await icon.trigger('blur')
    await vi.waitFor(() => expect(icon.attributes('aria-invalid')).toBe('true'))

    await wrapper.get('form').trigger('submit')
    await resolveAll()
    const fieldErrors = wrapper.findAll('.status-settings-row > .invalid-feedback')
    expect(fieldErrors.map((error) => error.text())).toEqual([
      'Укажите цвет фона тремя числами от 0 до 255 через запятую',
      'Укажите цвет иконки тремя числами от 0 до 255 через запятую'
    ])
    expect(store.update).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()

    await background.setValue('0, 16, 255')
    await icon.setValue(' 12, 34, 56 ')
    store.update.mockRejectedValueOnce(new Error('Database diagnostic'))
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.get('hr.hr + [data-testid="page-alert-region"]').text())
      .toContain('Ошибка при сохранении статуса партии'))
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(background.element.value).toBe('0, 16, 255')
    expect(icon.element.value).toBe(' 12, 34, 56 ')
    expect(push).not.toHaveBeenCalled()

    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith('/registerstatuses'))
    expect(store.update).toHaveBeenCalledTimes(2)
    expect(store.update.mock.calls[1]).toEqual(store.update.mock.calls[0])
    expect(store.update.mock.calls[1][1]).toMatchObject({ bkColor: '#0010ff', fgColor: '#0c2238' })
  })

  it('selects a Font Awesome status icon from the visual icon selector', async () => {
    await openEditor('create')
    expect(wrapper.get('#fgColor').element.value).toBe('33, 37, 41')
    const option = wrapper.get('.status-icon-option[aria-label="fa-solid fa-plane-departure"]')
    expect(option.attributes('title')).toBeUndefined()
    expect(option.text()).toBe('')

    await option.trigger('click')
    expect(wrapper.get('.status-icon-option.selected').attributes('aria-label')).toBe(
      'fa-solid fa-plane-departure'
    )
  })

  it.each([
    ['Already exists (409)', 'Такой статус партии уже существует'],
    [undefined, 'Ошибка при создании статуса партии']
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
