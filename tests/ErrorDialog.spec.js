/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorDialog from '@/l2/ErrorDialog.vue'

const VDialogStub = {
  name: 'VDialog',
  props: ['modelValue', 'width', 'maxWidth', 'persistent'],
  template: '<div data-testid="v-dialog"><slot /></div>'
}

const VButtonStub = {
  name: 'VBtn',
  emits: ['click'],
  template: '<button data-testid="v-btn" @click="$emit(\'click\')"><slot /></button>'
}

const stubs = {
  'v-dialog': VDialogStub,
  'v-card': { template: '<div><slot /></div>' },
  'v-card-title': { template: '<div><slot /></div>' },
  'v-card-text': { template: '<div><slot /></div>' },
  'v-card-actions': { template: '<div><slot /></div>' },
  'v-btn': VButtonStub
}

function mountDialog(props = {}) {
  return mount(ErrorDialog, {
    props: {
      show: true,
      title: 'Ошибка загрузки файла реестра',
      message: 'Файл не соответствует формату реестра.',
      ...props
    },
    global: { stubs }
  })
}

describe('ErrorDialog', () => {
  it('uses a compact responsive layout and shows the summary with import details', () => {
    const wrapper = mountDialog({
      missingHeaders: ['Неизвестный столбец'],
      missingColumns: ['ShipmentWeightKg (Вес отправления)']
    })

    const dialog = wrapper.findComponent(VDialogStub)
    expect(dialog.props('width')).toBe(560)
    expect(dialog.props('maxWidth')).toBe('calc(100vw - 32px)')
    expect(wrapper.get('[data-testid="error-dialog-message"]').text()).toBe(
      'Файл не соответствует формату реестра.'
    )
    expect(wrapper.get('[data-testid="error-dialog-missing-headers"]').text()).toContain(
      'Неизвестный столбец'
    )
    expect(wrapper.get('[data-testid="error-dialog-missing-columns"]').text()).toContain(
      'ShipmentWeightKg (Вес отправления)'
    )
  })

  it('emits close from the visible close action', async () => {
    const wrapper = mountDialog()

    await wrapper.get('[data-testid="error-dialog-close"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.text()).toContain('Закрыть')
  })

  it('removes the keyboard listener when unmounted', () => {
    const removeEventListener = vi.spyOn(document, 'removeEventListener')
    const wrapper = mountDialog()

    wrapper.unmount()

    expect(removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})
