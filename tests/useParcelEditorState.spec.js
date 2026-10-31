// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { Form, Field } from 'vee-validate'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useParcelEditorState } from '@/composables/useParcelEditorState.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelViewsStore } from '@/stores/parcel.views.store.js'
import * as errorHelpers from '@/helpers/error.helpers.js'

const transport = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: transport }))
vi.mock('@/helpers/config.js', () => ({ apiUrl: 'http://test/api' }))
vi.mock('@/router', () => ({ default: {} }))
function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
let wrappers, dependencies, onReady, report
function harness() {
  const parcelId = ref(3)
  const wrapper = mount({
    components: { Form, Field, PageAlertRegion },
    setup() {
      const formRef = ref(null)
      return { formRef, ...useParcelEditorState({ parcelId, formRef, loadDependencies: dependencies, onReady }) }
    },
    template: '<Form ref="formRef"><hr class="hr" /><PageAlertRegion /><Field v-if="ready" name="productName" /></Form>'
  })
  wrappers.push(wrapper)
  return { wrapper, parcelId }
}
beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  transport.get.mockResolvedValue({ id: 3, productName: 'Product', nested: { text: 'Original' } })
  transport.post.mockResolvedValue()
  dependencies = vi.fn().mockResolvedValue()
  onReady = vi.fn()
  wrappers = []
  report = vi.spyOn(errorHelpers, 'reportError').mockImplementation(() => {})
})
afterEach(async () => {
  wrappers.forEach((wrapper) => wrapper.unmount())
  await flushPromises()
  report.mockRestore()
})

describe('parcel editor initialization lifecycle', () => {
  it('copies the response into the real form and rejects an unexpected parcel identity', async () => {
    const { wrapper } = harness()
    await flushPromises()
    // Form returns a render function; its public methods are on the exposed instance.
    const form = wrapper.getComponent(Form).vm.$.exposed
    form.setFieldValue('nested.text', 'Draft')
    expect(form.getValues().nested.text).toBe('Draft')
    expect(useParcelsStore().item.nested.text).toBe('Original')
    transport.get.mockResolvedValueOnce({ id: 99 })
    await wrapper.vm.initialize()
    await flushPromises()
    expect(wrapper.vm.phase).toBe('error')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Сервер вернул некорректные данные посылки')
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('ignores a superseded dependency load before starting its parcel request', async () => {
    const old = deferred()
    dependencies.mockReturnValueOnce(old.promise)
    const { wrapper } = harness()
    await wrapper.vm.initialize()
    old.resolve()
    await flushPromises()
    expect(transport.get).toHaveBeenCalledTimes(1)
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it.each(['resolve', 'reject'])('ignores a superseded parcel request that finishes with %s', async (outcome) => {
    const old = deferred()
    transport.get.mockReturnValueOnce(old.promise)
    const { wrapper, parcelId } = harness()
    await flushPromises()
    parcelId.value = 4
    transport.get.mockResolvedValueOnce({ id: 4, productName: 'Destination' })
    await wrapper.vm.initialize()
    old[outcome](outcome === 'resolve' ? { id: 3, productName: 'Stale' } : new Error('Stale failure'))
    await flushPromises()
    expect(wrapper.get('input').element.value).toBe('Destination')
    expect(useParcelsStore().item.id).toBe(4)
    expect(useAlertStore().alert).toBeNull()
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(report).toHaveBeenCalledTimes(outcome === 'reject' ? 1 : 0)
  })

  it.each(['dependencies', 'parcel', 'history'])('reports a late %s failure without alerting another page', async (stage) => {
    const pending = deferred()
    if (stage === 'dependencies') dependencies.mockReturnValueOnce(pending.promise)
    if (stage === 'parcel') transport.get.mockReturnValueOnce(pending.promise)
    if (stage === 'history') transport.post.mockReturnValueOnce(pending.promise)
    const { wrapper } = harness()
    const retry = wrapper.vm.initialize
    await flushPromises()
    wrapper.unmount()
    useAlertStore().info('Destination page message')
    pending.reject(new Error('Late technical failure'))
    await flushPromises()
    expect(useAlertStore().alert.message).toBe('Destination page message')
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ message: 'Late technical failure' }), expect.any(Object))
    const count = dependencies.mock.calls.length
    expect(await retry()).toBe(false)
    expect(dependencies).toHaveBeenCalledTimes(count)
  })

  it('handles synchronous editor history failures without alert callbacks', async () => {
    vi.spyOn(useParcelViewsStore(), 'add').mockImplementationOnce(() => { throw new Error('History failed') })
    const { wrapper } = harness()
    await flushPromises()
    expect(wrapper.get('input').element.value).toBe('Product')
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    wrapper.unmount()
  })
})
