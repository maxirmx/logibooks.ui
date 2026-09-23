/* @vitest-environment jsdom */
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h, ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import Editor from '@/components/CompanyRegisterOutputFormatEditor.vue'
import Summary from '@/components/CompanyRegisterOutputFormatsTable.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import EditView from '@/views/CompanyRegisterOutputFormat_EditView.vue'
import router from '@/router'
import { useAlertStore } from '@/stores/alert.store.js'
import { OFFERED_COMPANY_REGISTER_OUTPUT_TYPES } from '@/helpers/company.constants.js'

const { store, confirm } = vi.hoisted(() => ({
  store: { companies: [], getAll: vi.fn(), getRegisterOutputColumns: vi.fn(),
    getRegisterOutputFormat: vi.fn(), deleteRegisterOutputFormat: vi.fn(), saveRegisterOutputFormat: vi.fn() },
  confirm: vi.fn()
}))
vi.mock('@/stores/companies.store.js', () => ({ useCompaniesStore: () => store }))
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => confirm }))

function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
let alerts, diagnostic
const vuetify = createVuetify({ components, directives })
function mountPage(component) {
  const visible = ref(true)
  const wrapper = mount({ setup: () => () => h('div', [
    h(PageAlertRegion), visible.value ? h(component, { companyId: 42, id: 42, registerType: OFFERED_COMPANY_REGISTER_OUTPUT_TYPES[0] }) : null
  ]) }, { global: { plugins: [createPinia(), vuetify], stubs: { ActionButton: true } } })
  return { wrapper, visible }
}

beforeEach(() => {
  vi.resetAllMocks()
  setActivePinia(createPinia())
  diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
  store.getAll.mockResolvedValue()
  store.getRegisterOutputColumns.mockResolvedValue({ inputColumns: [], generatedColumns: [] })
  store.getRegisterOutputFormat.mockResolvedValue({ entries: [{ kind: 'optional', title: 'Extra' }] })
  store.deleteRegisterOutputFormat.mockResolvedValue(true)
  store.saveRegisterOutputFormat.mockResolvedValue(true)
  confirm.mockResolvedValue(true)
})
afterEach(() => { diagnostic.mockRestore() })

async function startWrite(wrapper, operation) {
  if (operation === 'save') return { completion: wrapper.findComponent(Editor).vm.save() }
  if (operation === 'editor delete') {
    await wrapper.findAll('button').find(button => button.text() === 'Удалить формат').trigger('click')
  } else {
    wrapper.findAllComponents({ name: 'ActionButton' })
      .find(button => button.props('tooltipText') === 'Удалить формат').vm.$emit('click')
  }
  await flushPromises()
  return {}
}

describe.each([
  ['save', Editor, 'saveRegisterOutputFormat'],
  ['editor delete', Editor, 'deleteRegisterOutputFormat'],
  ['summary delete', Summary, 'deleteRegisterOutputFormat']
])('%s lifecycle', (operation, component, method) => {
  it.each(['resolve', 'reject'])('keeps next-page messages when the pending write %s', async outcome => {
    const request = deferred()
    store[method].mockReturnValueOnce(request.promise)
    const { wrapper, visible } = mountPage(component)
    await flushPromises()
    const { completion } = await startWrite(wrapper, operation)
    expect(store[method]).toHaveBeenCalledTimes(1)
    visible.value = false
    await nextTick()
    useAlertStore().info('Next page')
    if (outcome === 'resolve') request.resolve(true)
    else request.reject(new Error('late write failure'))
    if (completion) expect(await completion).toBe(false)
    await flushPromises()
    expect(wrapper.text()).toContain('Next page')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(diagnostic).toHaveBeenCalledTimes(outcome === 'reject' ? 1 : 0)
    wrapper.unmount()
  })

  it('shows one live error and makes its retry a no-op after leaving', async () => {
    store[method].mockRejectedValueOnce(new Error('write failed'))
    const { wrapper, visible } = mountPage(component)
    await flushPromises()
    const { completion } = await startWrite(wrapper, operation)
    if (completion) expect(await completion).toBe(false)
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('write failed')
    const retry = useAlertStore().alert.action.handler
    visible.value = false
    await nextTick()
    expect(await retry()).toBe(false)
    expect(store[method]).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})

it('does not navigate back when a routed editor save completes after leaving', async () => {
  const request = deferred()
  store.saveRegisterOutputFormat.mockReturnValueOnce(request.promise)
  const { wrapper, visible } = mountPage(EditView)
  await flushPromises()
  wrapper.findAllComponents({ name: 'ActionButton' })
    .find(button => button.props('tooltipText') === 'Сохранить').vm.$emit('click')
  await flushPromises()
  expect(store.saveRegisterOutputFormat).toHaveBeenCalledTimes(1)
  visible.value = false
  await nextTick()
  request.resolve(true)
  await flushPromises()
  expect(router.push).not.toHaveBeenCalled()
  wrapper.unmount()
})

describe('summary delete confirmation lifecycle', () => {
  it.each(['resolve', 'reject'])('ignores confirmation %s after disposal', async outcome => {
    const request = deferred()
    confirm.mockReturnValueOnce(request.promise)
    const { wrapper, visible } = mountPage(Summary)
    await flushPromises()
    await startWrite(wrapper, 'summary delete')
    visible.value = false
    await nextTick()
    if (outcome === 'resolve') request.resolve(true)
    else request.reject(new Error('late confirmation'))
    await flushPromises()
    expect(store.deleteRegisterOutputFormat).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(diagnostic).toHaveBeenCalledTimes(outcome === 'reject' ? 1 : 0)
    wrapper.unmount()
  })

  it('does not retry confirmation after disposal', async () => {
    confirm.mockRejectedValueOnce(new Error('confirmation failed'))
    const { wrapper, visible } = mountPage(Summary)
    await flushPromises()
    await startWrite(wrapper, 'summary delete')
    const retry = useAlertStore().alert.action.handler
    visible.value = false
    await nextTick()
    expect(await retry()).toBe(false)
    expect(confirm).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})

describe.each([['editor', Editor], ['summary', Summary]])('%s load lifecycle', (_name, component) => {
  it('does not publish a late failure on the next page', async () => {
    const request = deferred()
    store.getAll.mockReturnValueOnce(request.promise)
    const { wrapper, visible } = mountPage(component)
    alerts = useAlertStore()
    visible.value = false
    await nextTick()
    alerts.info('Next page')
    request.reject(new Error('late failure'))
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Next page')
    expect(diagnostic).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('ignores completion after teardown', async () => {
    const request = deferred()
    store.getAll.mockReturnValueOnce(request.promise)
    const { wrapper, visible } = mountPage(component)
    visible.value = false
    await nextTick()
    request.resolve()
    await flushPromises()
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(diagnostic).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows a load failure once and prevents its retry after unmount', async () => {
    store.getAll.mockRejectedValueOnce(new Error('load failed'))
    const { wrapper, visible } = mountPage(component)
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('load failed')
    const retry = useAlertStore().alert.action.handler
    visible.value = false
    await nextTick()
    expect(await retry()).toBe(false)
    expect(store.getAll).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})

describe('editor delete confirmation', () => {
  it('shows one confirmation failure and retries confirmation before deleting', async () => {
    confirm.mockRejectedValueOnce(new Error('confirmation failed'))
    const { wrapper } = mountPage(Editor)
    await flushPromises()
    await wrapper.findAll('button').find(button => button.text() === 'Удалить формат').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('confirmation failed')
    expect(store.deleteRegisterOutputFormat).not.toHaveBeenCalled()
    await wrapper.get('#register-output-type').setValue(String(OFFERED_COMPANY_REGISTER_OUTPUT_TYPES[1]))
    await wrapper.get('.page-alert-region__action').trigger('click')
    await flushPromises()
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(store.deleteRegisterOutputFormat).toHaveBeenCalledTimes(1)
    expect(store.deleteRegisterOutputFormat).toHaveBeenCalledWith(42, OFFERED_COMPANY_REGISTER_OUTPUT_TYPES[0])
    wrapper.unmount()
  })

  it.each(['resolve', 'reject'])('does not delete or alert when confirmation %s happens after leaving', async outcome => {
    const choice = deferred()
    confirm.mockReturnValueOnce(choice.promise)
    const { wrapper, visible } = mountPage(Editor)
    await flushPromises()
    await wrapper.findAll('button').find(button => button.text() === 'Удалить формат').trigger('click')
    visible.value = false
    await nextTick()
    if (outcome === 'resolve') choice.resolve(true)
    else choice.reject(new Error('closed'))
    await flushPromises()
    expect(store.deleteRegisterOutputFormat).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(diagnostic).toHaveBeenCalledTimes(outcome === 'reject' ? 1 : 0)
    wrapper.unmount()
  })

  it('does not reopen a failed confirmation after leaving', async () => {
    confirm.mockRejectedValueOnce(new Error('confirmation failed'))
    const { wrapper, visible } = mountPage(Editor)
    await flushPromises()
    await wrapper.findAll('button').find(button => button.text() === 'Удалить формат').trigger('click')
    await flushPromises()
    const retry = useAlertStore().alert.action.handler
    visible.value = false
    await nextTick()
    expect(await retry()).toBe(false)
    expect(confirm).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
