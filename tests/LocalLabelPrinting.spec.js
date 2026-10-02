import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, reactive, ref } from 'vue'
import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import LocalLabelPrinting from '@/components/LocalLabelPrinting.vue'
import MonitorLabelActions from '@/components/MonitorLabelActions.vue'
import PrinterSelectionDialog from '@/dialogs/PrinterSelectionDialog.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { LABEL_PRINTING_KEY } from '@/helpers/label.printing.helpers.js'
import { automaticPrintHistory } from '@/services/label.printing.coordinator.js'
const env = vi.hoisted(() => ({}))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => env.auth }))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => env.confirm }))
vi.mock('@/services/qz.printing.js', async (original) => ({ ...await original(), createQzPrinting: () => env.qz }))
vi.mock('@/services/printing.ownership.js', () => ({ createPrintingOwnership: () => env.ownership }))
vi.mock('@/services/printing.api.js', () => ({ printingApi: { label: (...args) => env.label(...args) }, createPrintChannel: (event, error) => { env.event = event; env.failure = error; return env.channel } }))

const stubs = {
  'v-btn': { props: ['disabled', 'loading'], template: '<button :disabled="disabled || loading"><slot /></button>' },
  'v-select': { props: ['modelValue', 'items', 'disabled', 'label'], emits: ['update:modelValue'], template: '<label>{{ label }}<select :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><option value=""></option><option v-for="item in items" :key="item" :value="item">{{ item }}</option></select></label>' },
  'v-dialog': { props: ['modelValue'], template: '<div v-if="modelValue" role="dialog"><slot /></div>' },
  'v-card': { template: '<div><slot /></div>' }, 'v-card-title': { template: '<div><slot /></div>' }, 'v-card-text': { template: '<div><slot /></div>' }, 'v-card-actions': { template: '<div><slot /></div>' }
}
const host = defineComponent({ components: { LocalLabelPrinting, PageAlertRegion }, template: '<div><hr class="hr" /><PageAlertRegion /><LocalLabelPrinting ref="printing" :scan-job-id="job" :user-id="user" :active="active" /></div>', setup: () => ({ job: ref(42), user: ref(9), active: ref(true) }) })
let wrapper, alerts, errorSpy
beforeEach(() => {
  automaticPrintHistory.clear()
  env.auth = reactive({ user: { token: 'token' } })
  env.confirm = vi.fn().mockResolvedValue(true)
  env.label = vi.fn().mockResolvedValue({ revision: 'r1', language: 'TSPL' })
  env.channel = { resume: vi.fn().mockResolvedValue(true), start: vi.fn().mockResolvedValue(), stop: vi.fn().mockResolvedValue() }
  env.ownership = { acquire: vi.fn().mockResolvedValue(true), release: vi.fn().mockResolvedValue() }
  const state = reactive({ printer: 'TSC TE200', printers: ['Office', 'TSC TE200'], connected: true })
  env.qz = { state, connect: vi.fn().mockResolvedValue(state.printers), ready: vi.fn().mockResolvedValue(), select: vi.fn((name) => { state.printer = name }), submit: vi.fn().mockResolvedValue(), disconnect: vi.fn().mockResolvedValue(), onDisconnect: vi.fn() }
  const pinia = createPinia()
  alerts = useAlertStore(pinia)
  errorSpy = vi.spyOn(alerts, 'error')
  wrapper = mount(host, { global: { plugins: [pinia], stubs } })
})
afterEach(async () => { if (wrapper) wrapper.unmount(); await flushPromises(); vi.restoreAllMocks() })
const panel = () => wrapper.getComponent(LocalLabelPrinting)
const target = { parcelId: 7, template: 'WBRN' }
const scan = (id = 8) => ({ scanJobId: 42, userId: 9, printCandidates: [{ scanJobId: 42, scanCodeId: id, parcelId: 7, template: 'KGT', revision: 'r1' }] })
async function arm() { await panel().get('[data-testid="auto-print-mode"] select').setValue('KGT'); await flushPromises() }
describe('local printing UI', () => {
  it('shows queued success, fetches fresh on repeat and presents manual rejection exactly once', async () => {
    await panel().vm.printParcel(target)
    expect(env.label).toHaveBeenCalledWith({ ...target, scanJobId: 42 })
    expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain('Физическая печать не подтверждена')
    env.label.mockRejectedValueOnce({ data: { code: 'Overflow' } })
    await panel().vm.printParcel(target)
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('не помещается')
    expect(wrapper.vm.job).toBe(42)
    await panel().vm.printParcel(target)
    expect(env.label).toHaveBeenCalledTimes(3)
  })
  it('coalesces clicks and retains captured parcel/job through first-use selection', async () => {
    env.qz.state.printer = ''
    const captured = { ...target }
    await panel().vm.printParcel(captured)
    captured.parcelId = 99
    await panel().vm.printParcel(target)
    expect(env.qz.connect).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[role="dialog"]').text()).toContain('Локальный принтер')
    await wrapper.get('[data-testid="save-printer"]').trigger('click')
    await flushPromises()
    expect(env.qz.select).toHaveBeenCalledWith('TSC TE200')
    expect(env.label).toHaveBeenCalledWith({ ...target, scanJobId: 42 })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
  it('preserves failed selection with visible failure and explicit cancel', async () => {
    env.qz.connect.mockRejectedValueOnce({ code: 'PrinterMissing' })
    await panel().get('[data-testid="choose-printer"]').trigger('click'); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('отсутствует')
    const dialog = wrapper.getComponent(PrinterSelectionDialog)
    dialog.get('[data-testid="printer-selection"] select').element.value = 'Office'
    await dialog.get('[data-testid="printer-selection"] select').trigger('change')
    env.qz.select.mockImplementationOnce(() => { throw new Error('storage denied') })
    await wrapper.get('[data-testid="save-printer"]').trigger('click'); await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(dialog.get('select').element.value).toBe('Office')
    expect(wrapper.get('[role="alert"]').text()).toContain('storage denied')
    dialog.vm.$emit('cancel'); await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(errorSpy).toHaveBeenCalledTimes(2)
  })
  it('does not submit when selection is canceled or scope changes during selection', async () => {
    env.qz.state.printer = ''
    await panel().vm.printParcel(target)
    wrapper.getComponent(PrinterSelectionDialog).vm.$emit('cancel'); await flushPromises()
    expect(env.label).not.toHaveBeenCalled()
    await panel().vm.printParcel(target)
    wrapper.vm.job = 43; await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(env.label).not.toHaveBeenCalled()
  })
  it('prints live candidates, pauses, confirms explicit retry, and permits manual last-label repeat', async () => {
    await arm()
    env.qz.submit.mockRejectedValueOnce({ code: 'SubmissionFailed' })
    env.event(scan())
    await flushPromises()
    expect(wrapper.get('[data-testid="failed-print"]').text()).toContain('скан 8')
    expect(wrapper.get('[role="alert"]').text()).toContain('дубликат')
    expect(errorSpy).toHaveBeenCalledTimes(1)
    env.confirm.mockResolvedValueOnce(false)
    await panel().get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
    expect(env.qz.submit).toHaveBeenCalledTimes(1)
    await panel().get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
    expect(env.qz.submit).toHaveBeenCalledTimes(2)
    await panel().get('[data-testid="reprint-label"]').trigger('click'); await flushPromises()
    expect(env.qz.submit).toHaveBeenCalledTimes(3)
    expect(env.label).toHaveBeenCalledTimes(3)
  })
  it('presents arm, retry and disconnect rejection once and retains monitor input', async () => {
    env.channel.start.mockRejectedValueOnce(new Error('follow failed'))
    await arm()
    expect(wrapper.get('[role="alert"]').text()).toContain('follow failed')
    await arm()
    env.failure(new Error('connection lost')); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('connection lost')
    env.confirm.mockRejectedValueOnce(new Error('confirmation failed'))
    // A failed print needs confirmation; a connection-only pause resumes directly.
    await panel().get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
    env.qz.submit.mockRejectedValueOnce(new Error('submission'))
    env.event(scan()); await flushPromises()
    await panel().get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('confirmation failed')
    env.qz.ready.mockRejectedValueOnce(new Error('retry unavailable'))
    await panel().get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('retry unavailable')
    env.qz.disconnect.mockRejectedValueOnce(new Error('disconnect failed'))
    await panel().get('[data-testid="disconnect-printer"]').trigger('click'); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('disconnect failed')
    expect(wrapper.vm.user).toBe(9)
    expect(errorSpy).toHaveBeenCalledTimes(6)
  })
  it('reselects a missing queue while keeping the failed scan for explicit retry', async () => {
    await arm()
    env.qz.ready.mockImplementationOnce(async () => { env.qz.state.printer = ''; throw { code: 'PrinterMissing' } })
    env.event(scan())
    await flushPromises()
    expect(wrapper.get('[data-testid="failed-print"]').text()).toContain('скан 8')
    expect(panel().get('[data-testid="choose-printer"]').element.disabled).toBe(false)
    await panel().get('[data-testid="choose-printer"]').trigger('click'); await flushPromises()
    await wrapper.get('[data-testid="printer-selection"] select').setValue('Office')
    await wrapper.get('[data-testid="save-printer"]').trigger('click'); await flushPromises()
    expect(env.qz.state.printer).toBe('Office')
    expect(wrapper.get('[data-testid="failed-print"]').text()).toContain('скан 8')
    expect(env.qz.submit).not.toHaveBeenCalled()
    await panel().get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
    expect(env.qz.submit).toHaveBeenCalledTimes(1)
    expect(env.channel.resume).toHaveBeenCalledTimes(1)
    env.qz.state.printer = ''
    await panel().get('[data-testid="stop-auto-print"]').trigger('click'); await flushPromises()
    expect(env.channel.stop).toHaveBeenCalled()
    expect(panel().find('[data-testid="stop-auto-print"]').exists()).toBe(false)
  })
  it('retains connection pause until scanner subscription is verified', async () => {
    await arm()
    env.failure(new Error('terminal closure')); await flushPromises()
    env.channel.resume.mockRejectedValueOnce(new Error('subscribe failed'))
    await panel().get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('subscribe failed')
    expect(panel().find('[data-testid="retry-print"]').exists()).toBe(true)
    await panel().get('[data-testid="retry-print"]').trigger('click'); await flushPromises()
    expect(panel().find('[data-testid="retry-print"]').exists()).toBe(false)
    env.event(scan()); await flushPromises()
    expect(env.qz.submit).toHaveBeenCalledTimes(1)
  })
  it('stops acceptance on logout, operator/job change, closed job and teardown', async () => {
    await arm()
    wrapper.vm.user = 10; await flushPromises()
    env.event(scan()); await flushPromises()
    expect(env.label).not.toHaveBeenCalled()
    wrapper.vm.user = 9; await flushPromises(); await arm()
    env.auth.user = null; await flushPromises()
    env.event(scan()); await flushPromises()
    expect(env.label).not.toHaveBeenCalled()
    wrapper.vm.active = false; await flushPromises()
    const report = vi.spyOn(console, 'error').mockImplementation(() => {})
    env.channel.stop.mockRejectedValueOnce(new Error('scope cleanup'))
    wrapper.vm.job = 43; await flushPromises()
    expect(report).toHaveBeenCalledWith('[local printing scope cleanup]', expect.any(Error))
    env.channel.stop.mockRejectedValueOnce(new Error('teardown failed'))
    wrapper.unmount(); wrapper = null; await flushPromises()
    expect(report).toHaveBeenCalledWith('[local printing teardown]', expect.any(Error))
  })
  it('displays overflow pause, and renders field validation beneath the selection control', async () => {
    await arm()
    env.event({ ...scan(), printCandidates: Array.from({ length: 51 }, (_, i) => ({ ...scan().printCandidates[0], scanCodeId: i })) })
    await flushPromises()
    expect(wrapper.get('[data-testid="print-overflow"]').text()).toContain('скана 50')
    expect(wrapper.find('[data-testid="retry-print"]').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toContain('переполнена')
    const selection = mount(PrinterSelectionDialog, { props: { open: true, printers: [] }, global: { stubs } })
    await selection.get('[data-testid="save-printer"]').trigger('click')
    expect(selection.get('[role="alert"]').text()).toContain('Выберите доступный принтер')
    expect(selection.get('[role="alert"]').element.previousElementSibling.tagName).toBe('LABEL')
    selection.unmount()
  })
})
describe('server-advertised monitor actions', () => {
  it('shows only manual capabilities, honors busy state and emits captured identity', async () => {
    const print = vi.fn(), busy = ref(false)
    const actions = mount(MonitorLabelActions, { props: { item: { id: 7, printableTemplates: ['WBRN', 'OZON', 'KGT'] } }, global: {
      provide: { [LABEL_PRINTING_KEY]: { print, busy: computed(() => busy.value) } }, stubs: { ActionButton: { props: ['disabled'], template: '<button :disabled="disabled" @click="$emit(\'click\')" />' } }
    } })
    expect(actions.findAll('button')).toHaveLength(2)
    await actions.findAll('button')[0].trigger('click')
    expect(print).toHaveBeenCalledWith({ parcelId: 7, template: 'WBRN' })
    busy.value = true; await flushPromises()
    expect(actions.get('button').element.disabled).toBe(true)
    await actions.setProps({ item: { parcelId: 8 } })
    expect(actions.findAll('button')).toHaveLength(0)
    actions.unmount()
    const unprovided = mount(MonitorLabelActions, { props: { item: {} } })
    expect(unprovided.findAll('button')).toHaveLength(0)
    unprovided.unmount()
  })
})
