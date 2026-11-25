// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { Form, Field } from 'vee-validate'
import ParcelNumberExt from '@/components/ParcelNumberExt.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn(), post: vi.fn() }
}))
const code = '8471300000'
const marker = '.export-fee-category-marker'
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function createWrapper(procedure = 10) {
  return mount({
    components: { Form, Field, ParcelNumberExt, PageAlertRegion },
    setup: () => ({ procedure: ref(procedure), item: { tnVed: code, matchesExportFeeCategory: true } }),
    template: '<div><PageAlertRegion /><Form :initial-values="{ tnVed: item.tnVed }" v-slot="{ values, setFieldValue }"><Field name="tnVed" /><button data-testid="select-code" type="button" @click="setFieldValue(\'tnVed\', \'8471300000\')">Select</button><ParcelNumberExt :item="item" live-category :tn-ved="values.tnVed" :customs-procedure-code="procedure" /></Form></div>'
  }, { global: { stubs: { ClickableCell: true, ActionButton: true,
    'v-tooltip': { template: '<div><slot name="activator" :props="{}" /></div>' } } } })
}
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  fetchWrapper.get.mockResolvedValue([{ code: ' ' }, { code: null }, { code: '84 71' }])
  fetchWrapper.post.mockImplementation(async (_, { codes }) => ({
    results: Object.fromEntries(codes.map(value => [value, value === code ? { code: value } : null]))
  }))
})
describe('live category marker', () => {
  it.each([
    'reject'
  ])('ignores stale lookup %s after the code is cleared', async outcome => {
    const pending = deferred()
    fetchWrapper.post.mockReturnValueOnce(pending.promise)
    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.get('input').setValue('')
    pending[outcome](outcome === 'resolve' ? { results: { [code]: {} } } : new Error('obsolete'))
    await flushPromises()
    expect(wrapper.find(marker).exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    wrapper.unmount()
  })
  it.each([
    'get'
  ])('shows %s failure once, preserves the draft and retries on next change', async method => {
    fetchWrapper[method].mockRejectedValueOnce(new Error('Ошибка проверки категории'))
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка проверки категории')
    expect(wrapper.get('input').element.value).toBe(code)
    expect(wrapper.find(marker).exists()).toBe(false)
    await wrapper.get('input').setValue('')
    await wrapper.get('[data-testid=select-code]').trigger('click')
    await flushPromises()
    expect(wrapper.find(marker).exists()).toBe(true)
    wrapper.unmount()
  })
  it.each([
    { [code]: {} }
  ])('supports lookup response %j', async response => {
    fetchWrapper.post.mockResolvedValue(response)
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find(marker).exists()).toBe(response !== null)
    wrapper.unmount()
  })
})
