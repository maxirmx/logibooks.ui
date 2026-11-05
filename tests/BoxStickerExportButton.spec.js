/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BoxStickerExportButton from '@/components/BoxStickerExportButton.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

const push = vi.hoisted(() => vi.fn())
vi.mock('@/router', () => ({ default: { push } }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { downloadFile: vi.fn() } }))

const goodBox = { id: 7, code: '0007', boxSticker: 'QR', readOnly: true, boxStickerScanned: false }
const wrappers = []
const host = {
  components: { BoxStickerExportButton, PageAlertRegion },
  props: ['box', 'disabled'],
  template: '<div><PageAlertRegion /><BoxStickerExportButton :box="box" :disabled="disabled" /></div>'
}
function render(box = goodBox, disabled = false) {
  const wrapper = mount(host, { props: { box, disabled }, global: { stubs: {
    ActionButton: {
      name: 'ActionButton',
      props: ['disabled', 'tooltipText', 'icon'],
      emits: ['click'],
      template: '<button type="button" :disabled="disabled" :title="tooltipText" @click="$emit(\'click\')" />'
    }
  } } })
  wrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.clearAllMocks()
  useAuthStore().user = { id: 42, roles: ['wh-manager'] }
  fetchWrapper.downloadFile.mockResolvedValue(true)
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
})

describe('box sticker CSV export', () => {
  it('downloads a persisted box with a sticker code even if its old second field is blank', async () => {
    const wrapper = render({ ...goodBox, code: '' })
    await wrapper.get('button[data-testid="box-export-stickers"]').trigger('click')
    expect(fetchWrapper.downloadFile).toHaveBeenCalledOnce()
  })

  it('locks a pending export, respects external loading and permits a subsequent download', async () => {
    let complete
    fetchWrapper.downloadFile.mockReturnValueOnce(new Promise(resolve => { complete = resolve }))
    const wrapper = render()
    const button = wrapper.get('button[data-testid="box-export-stickers"]')
    await button.trigger('click')
    expect(button.element.disabled).toBe(true)
    await wrapper.getComponent(BoxStickerExportButton).vm.download()
    expect(fetchWrapper.downloadFile).toHaveBeenCalledTimes(1)
    complete(true)
    await flushPromises()
    expect(button.element.disabled).toBe(false)
    await wrapper.setProps({ disabled: true })
    expect(button.element.disabled).toBe(true)
    await wrapper.getComponent(BoxStickerExportButton).vm.download()
    expect(fetchWrapper.downloadFile).toHaveBeenCalledTimes(1)
    await wrapper.setProps({ disabled: false })
    await button.trigger('click')
    await flushPromises()
    expect(fetchWrapper.downloadFile).toHaveBeenCalledTimes(2)
  })

  it('reports a late failure diagnostically after unmount without publishing a stale alert', async () => {
    let fail
    fetchWrapper.downloadFile.mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject }))
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    const alerts = useAlertStore()
    const wrapper = render()
    await wrapper.get('button[data-testid="box-export-stickers"]').trigger('click')
    wrapper.unmount()
    fail(new Error('late export failure'))
    await flushPromises()
    expect(alerts.alert).toBeNull()
    expect(diagnostic).toHaveBeenCalledTimes(1)
  })

})
