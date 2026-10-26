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
import { useBoxesStore } from '@/stores/boxes.store.js'
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
  it.each([
    ['administrator', true], ['shift-lead', true], ['wh-manager', true],
    ['wh-operator', false], ['logist', false], ['sr-logist', false]
  ])('uses the actual isWhManagerPlus getter for %s', async (role, allowed) => {
    useAuthStore().user = { id: 42, roles: [role] }
    const wrapper = render()
    expect(wrapper.find('[data-testid="box-export-stickers"]').exists()).toBe(allowed)
    await wrapper.getComponent(BoxStickerExportButton).vm.download()
    expect(fetchWrapper.downloadFile).toHaveBeenCalledTimes(allowed ? 1 : 0)
  })

  it.each([
    { id: 0 }, { id: 1.5 }, { id: undefined }, { area: 2 }, { area: 3 },
    { bucketIndex: 0 }, { area: 0 }
  ])('omits nonphysical boxes: %j', async (changes) => {
    const wrapper = render({ ...goodBox, ...changes })
    expect(wrapper.find('[data-testid="box-export-stickers"]').exists()).toBe(false)
    await wrapper.getComponent(BoxStickerExportButton).vm.download()
    expect(fetchWrapper.downloadFile).not.toHaveBeenCalled()
  })

  it.each([
    { code: null }, { code: '' }, { code: ' \t ' },
    { boxSticker: null }, { boxSticker: '' }, { boxSticker: ' \t ' }
  ])('disables incomplete values: %j', async (changes) => {
    const wrapper = render({ ...goodBox, ...changes })
    expect(wrapper.get('button[data-testid="box-export-stickers"]').element.disabled).toBe(true)
    await wrapper.getComponent(BoxStickerExportButton).vm.download()
    expect(fetchWrapper.downloadFile).not.toHaveBeenCalled()
  })

  it('downloads by the persisted monitor ID without scanning or printing prerequisites', async () => {
    const wrapper = render({
      boxId: 19, boxCode: '00019', area: 1, boxSticker: 'raw QR',
      boxStickerScanned: false, printableTemplates: [], companyId: 999, readOnly: true
    })
    const button = wrapper.get('button[data-testid="box-export-stickers"]')
    expect(button.element.disabled).toBe(false)
    expect(button.attributes('aria-label')).toBe('Выгрузить коды стикеров')
    expect(button.attributes('title')).toBe('Выгрузить коды стикеров')
    expect(wrapper.getComponent(BoxStickerExportButton).getComponent({ name: 'ActionButton' }).props('icon'))
      .toBe('fa-solid fa-share')
    await button.trigger('click')
    await flushPromises()
    expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(expect.stringContaining('/boxes/19/stickers.csv'), 'box-19-stickers.csv')
    expect(push).not.toHaveBeenCalled()
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

  it('shows one contextual Russian error and allows retry without navigation', async () => {
    fetchWrapper.downloadFile.mockRejectedValueOnce(new Error('ECONNRESET'))
    const errors = vi.spyOn(useAlertStore(), 'error')
    const wrapper = render()
    await wrapper.get('button[data-testid="box-export-stickers"]').trigger('click')
    await flushPromises()
    expect(errors).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось выгрузить коды стикеров коробки')
    expect(wrapper.text()).not.toContain('ECONNRESET')
    expect(wrapper.get('button[data-testid="box-export-stickers"]').element.disabled).toBe(false)
    await wrapper.get('button[data-testid="box-export-stickers"]').trigger('click')
    await flushPromises()
    expect(fetchWrapper.downloadFile).toHaveBeenCalledTimes(2)
    expect(errors).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
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

  it('keeps store downloads stateless and propagates rejections to their owner', async () => {
    const boxes = useBoxesStore()
    boxes.box = goodBox
    boxes.boxes = [goodBox]
    const failure = new Error('Сервер недоступен')
    fetchWrapper.downloadFile.mockRejectedValueOnce(failure)
    await expect(boxes.downloadStickers(7)).rejects.toBe(failure)
    expect(boxes.box).toEqual(goodBox)
    expect(boxes.boxes).toEqual([goodBox])
    expect(boxes.loading).toBe(false)
    expect(boxes.error).toBeNull()
    expect(useAlertStore().alert).toBeNull()
  })
})
