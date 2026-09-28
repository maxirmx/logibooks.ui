import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { Form, Field } from 'vee-validate'
import ParcelNumberExt from '@/components/ParcelNumberExt.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { useExportFeesStore } from '@/stores/export.fees.store.js'

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
  }, { global: { stubs: { ClickableCell: true, ActionButton: true } } })
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
  it.each([10, 31])('tracks typing, clearing and programmatic selections in procedure %s', async procedure => {
    const wrapper = createWrapper(procedure)
    await flushPromises()
    expect(wrapper.find(marker).exists()).toBe(true)
    for (const value of ['', '8471', '8471abcdef', '8471999999', '9999999999']) {
      await wrapper.get('input').setValue(value)
      await flushPromises()
      expect(wrapper.find(marker).exists()).toBe(false)
    }
    await wrapper.get('[data-testid=select-code]').trigger('click')
    await flushPromises()
    expect(wrapper.find(marker).exists()).toBe(true)
    await wrapper.get('input').setValue('84 71 300000')
    await flushPromises()
    expect(wrapper.find(marker).exists()).toBe(true)
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
  it.each([40, 60, 0, null])('never marks procedure %s', async procedure => {
    const wrapper = createWrapper(procedure)
    await flushPromises()
    expect(wrapper.find(marker).exists()).toBe(false)
    expect(fetchWrapper.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('waits for a shared directory load after a newer change', async () => {
    const pending = deferred()
    fetchWrapper.get.mockReturnValue(pending.promise)
    const wrapper = createWrapper()
    await wrapper.get('input').setValue('8471999999')
    pending.resolve([{ code: '8471' }])
    await flushPromises()
    expect(wrapper.find(marker).exists()).toBe(false)
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    await wrapper.get('[data-testid=select-code]').trigger('click')
    await flushPromises()
    expect(wrapper.find(marker).exists()).toBe(true)
    wrapper.unmount()
  })
  it.each(['resolve', 'reject'])('ignores stale lookup %s after the code is cleared', async outcome => {
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
  it.each(['get', 'post'])('shows %s failure once, preserves the draft and retries on next change', async method => {
    fetchWrapper[method].mockRejectedValueOnce(new Error('Category check failed'))
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Category check failed')
    expect(wrapper.get('input').element.value).toBe(code)
    expect(wrapper.find(marker).exists()).toBe(false)
    await wrapper.get('input').setValue('')
    await wrapper.get('[data-testid=select-code]').trigger('click')
    await flushPromises()
    expect(wrapper.find(marker).exists()).toBe(true)
    wrapper.unmount()
  })
  it.each([{ Results: { [code]: {} } }, { [code]: {} }, null])('supports lookup response %j', async response => {
    fetchWrapper.post.mockResolvedValue(response)
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find(marker).exists()).toBe(response !== null)
    wrapper.unmount()
  })
  it('joins concurrent directory requests', async () => {
    const pending = deferred()
    fetchWrapper.get.mockReturnValue(pending.promise)
    const store = useExportFeesStore()
    const first = store.ensureLoaded()
    const second = store.ensureLoaded()
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
    pending.resolve([{ code: '8471' }])
    await Promise.all([first, second])
    expect(store.fees).toEqual([{ code: '8471' }])
  })
})
