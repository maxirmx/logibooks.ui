/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RegisterStatusEditDialog from '@/dialogs/RegisterStatus_EditDialog.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { defaultGlobalStubs, resolveAll } from './helpers/test-utils.js'

const transport = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
const push = vi.hoisted(() => vi.fn())
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: transport }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({ isAdmin: true }) }))
vi.mock('@/router', () => ({ default: { push } }))

async function openEditor(mode) {
  const pinia = createPinia()
  setActivePinia(pinia)
  transport.get.mockResolvedValue([])
  if (mode === 'edit') {
    transport.get.mockResolvedValueOnce({ id: 7, title: 'Очередь', exportTo1C: true })
  }
  const wrapper = mount({
    components: { RegisterStatusEditDialog },
    template: '<Suspense><RegisterStatusEditDialog mode="' + mode + '" :register-status-id="7" /></Suspense>'
  }, { global: { plugins: [pinia], stubs: defaultGlobalStubs } })
  await resolveAll()
  return wrapper
}

beforeEach(() => {
  vi.resetAllMocks()
  transport.post.mockResolvedValue({ id: 7 })
  transport.put.mockResolvedValue()
})

describe('1C status flag with real form and store', () => {
  it('defaults to Нет and saves checked Да on creation', async () => {
    const wrapper = await openEditor('create')
    expect(wrapper.get('#exportTo1C').element.checked).toBe(false)
    await wrapper.get('#title').setValue('Очередь')
    await wrapper.get('#exportTo1C').setValue(true)
    await wrapper.get('form').trigger('submit')
    await resolveAll()
    expect(transport.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ exportTo1C: true }))
    expect(push).toHaveBeenCalledWith('/registerstatuses')
    wrapper.unmount()
  })

  it('saves unchecked Нет, retains it after failure, and retries without duplicate messages', async () => {
    const wrapper = await openEditor('edit')
    expect(wrapper.get('#exportTo1C').element.checked).toBe(true)
    const alerts = useAlertStore()
    const report = vi.spyOn(alerts, 'error')
    transport.put.mockRejectedValueOnce(new Error('Не удалось сохранить настройку 1С'))
    await wrapper.get('#exportTo1C').setValue(false)
    await wrapper.get('form').trigger('submit')
    await resolveAll()
    expect(transport.put).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ exportTo1C: false }))
    expect(wrapper.get('#exportTo1C').element.checked).toBe(false)
    expect(wrapper.get('#title').element.value).toBe('Очередь')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось сохранить настройку 1С')
    expect(report).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
    await wrapper.get('form').trigger('submit')
    await resolveAll()
    expect(transport.put).toHaveBeenCalledTimes(2)
    expect(transport.put.mock.calls[1][1].exportTo1C).toBe(false)
    expect(push).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
