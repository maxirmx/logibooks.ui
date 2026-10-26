import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, onUnmounted, reactive, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useRegisterReconciliation } from '@/composables/useRegisterReconciliation.js'
import { canReconcileRegister } from '@/helpers/register.reconciliation.helpers.js'
import { EXCEL_FILE_ACCEPT, EXCEL_ARCHIVE_FILE_ACCEPT, openExcelFilePicker, resetExcelFileInput, takeSelectedExcelFile } from '@/helpers/excel.file.helpers.js'
import { WBRN_REGISTER_ID } from '@/helpers/company.constants.js'
import { useAlertStore } from '@/stores/alert.store.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import RegisterReconciliationDialogs from '@/l2/RegisterReconciliationDialogs.vue'
import ActionDialog from '@/l2/ActionDialog.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => vi.fn().mockResolvedValue(false) }))
vi.mock('@/helpers/error.helpers.js', async importOriginal => ({ ...await importOriginal(), reportError: vi.fn() }))

const stubs = { ...vuetifyStubs,
  'v-dialog': { props: ['modelValue', 'persistent'], template: '<section v-if="modelValue" role="dialog"><slot /></section>' },
  'v-btn': { props: ['disabled', 'variant', 'color'], template: '<button :disabled="disabled"><slot /></button>' },
  'v-progress-circular': { props: ['modelValue', 'indeterminate'], template: '<div data-testid="progress" :data-indeterminate="indeterminate"><slot /></div>' }
}
const statistics = { registerId: 7, dangerousGoodsCount: 104, markedCount: 42, newlyMarkedCount: 13, excludedCount: 2, registerOnlyCount: 0, manifestOnlyCount: 0 }
const complete = { percent: 100, finished: true, result: statistics }
const failure = (code, status = 500, details = {}) => Object.assign(new Error('Ошибка сверки реестра'), {
  status, data: { code, msg: 'Ошибка сверки реестра', errors: {}, details }
})
let wrappers

function harness(options = {}) {
  const alertStore = useAlertStore()
  const notify = vi.spyOn(alertStore, 'error')
  const store = { startReconciliation: vi.fn().mockResolvedValue({ id: 'op-1' }), getReconciliation: vi.fn().mockResolvedValue(complete), ...options.store }
  const register = reactive({ id: 7, registerType: WBRN_REGISTER_ID, theOtherCountryCode: 762, readOnly: false })
  const authStore = reactive({ isSrLogistPlus: true })
  const runningAction = ref(false)
  const mounted = ref(true)
  const refreshRegister = vi.fn().mockResolvedValue(undefined)
  const refreshParcels = vi.fn().mockResolvedValue(true)
  const confirm = vi.fn().mockResolvedValue(false)
  let flow
  const component = defineComponent({ components: { PageAlertRegion, RegisterReconciliationDialogs }, setup() {
    flow = useRegisterReconciliation({ store, alertStore, authStore, register: () => register, busy: () => false,
      runningAction, mounted, refreshRegister, refreshParcels, confirm, makeId: () => 'op-1', ...options })
    onUnmounted(flow.stop)
    return { flow }
  }, template: `<div><hr><PageAlertRegion />
    <button v-if="flow.state.phase === 'retry-start' || flow.state.phase === 'retry-status'" data-testid="retry" @click="flow.retry">Повторить</button>
    <button v-if="flow.state.phase === 'unknown'" data-testid="new" @click="flow.acknowledgeUnknown">Новая сверка</button>
    <RegisterReconciliationDialogs :state="flow.state" @close-error="flow.state.error.show = false" @summary-visible="flow.state.summaryVisible = $event" />
    </div>` })
  const wrapper = mount(component, { global: { stubs } })
  wrappers.push(wrapper)
  const file = new File(['manifest'], 'manifest.xlsx')
  const event = { target: { value: 'selected', files: [file] } }
  return { wrapper, flow, store, register, authStore, runningAction, mounted, refreshRegister, refreshParcels, confirm, notify, file, event }
}

beforeEach(() => { setActivePinia(createPinia()); wrappers = [] })
afterEach(() => { for (const w of wrappers) w.unmount(); vi.useRealTimers(); vi.restoreAllMocks() })

describe('register reconciliation', () => {
  it('shares Excel picking/reset and limits eligibility without confusing formats', () => {
    expect(EXCEL_FILE_ACCEPT).toBe('.xls,.xlsx,.xlsm')
    expect(EXCEL_ARCHIVE_FILE_ACCEPT).toContain('.zip,.rar')
    expect(openExcelFilePicker(null)).toBe(false)
    expect(openExcelFilePicker({})).toBe(false)
    const input = { value: 'old', click: vi.fn() }
    expect(openExcelFilePicker(input)).toBe(true)
    expect(input.value).toBe('')
    expect(input.click).toHaveBeenCalledOnce()
    resetExcelFileInput(null)
    expect(takeSelectedExcelFile()).toBeUndefined()
    const file = new File(['a'], 'x.xlsx')
    expect(takeSelectedExcelFile({ target: { value: 'selected', files: [file] } })).toBe(file)
    expect(canReconcileRegister({ registerType: WBRN_REGISTER_ID, theOtherCountryCode: '762' }, true)).toBe(true)
    expect(canReconcileRegister(undefined, true)).toBe(false)
    expect(canReconcileRegister({ registerType: 1, theOtherCountryCode: 762 }, true)).toBe(false)
    expect(canReconcileRegister({ registerType: WBRN_REGISTER_ID, theOtherCountryCode: 762 }, false)).toBe(false)
  })

  it('shows all six committed statistics and resets the input for an explicit later import', async () => {
    const reported = { ...statistics, registerOnlyCount: 5, manifestOnlyCount: 6 }
    const h = harness()
    h.store.getReconciliation.mockResolvedValue({ ...complete, result: reported })
    await h.flow.selectFile(h.event)
    await flushPromises()
    expect(h.event.target.value).toBe('')
    expect(h.store.startReconciliation).toHaveBeenCalledWith(7, h.file, 'op-1')
    expect(h.store.getReconciliation).toHaveBeenCalledWith(7, 'op-1')
    for (const [key, value] of Object.entries(reported).filter(([key]) => key !== 'registerId'))
      expect(h.wrapper.get(`[data-testid="reconciliation-${key}"]`).text()).toBe(String(value))
    const report = h.wrapper.get('[data-testid="reconciliation-statistics"]')
    expect(report.findAll('dt').slice(3).map(label => label.text())).toEqual([
      'Посылок, не переданных партнёру:',
      'Посылок в реестре, но не в манифесте:',
      'Посылок в манифесте, но не в реестре:'
    ])
    expect(report.findAll('dd').map(value => Number(value.text()))).toEqual([104, 42, 13, 2, 5, 6])
    expect(h.refreshRegister).toHaveBeenCalledOnce()
    expect(h.refreshParcels).toHaveBeenCalledOnce()
    expect(h.notify).not.toHaveBeenCalled()
    expect(h.runningAction.value).toBe(false)
    const close = h.wrapper.findAll('button').find(b => b.text() === 'Закрыть')
    await close.trigger('click')
    expect(h.wrapper.find('[data-testid="reconciliation-statistics"]').exists()).toBe(false)
  })

  it.each([[0, 0], [5, 0], [0, 6], [5, 6]])('hides only zero N5/N6 rows for counts %i/%i', async (registerOnlyCount, manifestOnlyCount) => {
    const h = harness()
    const result = { registerId: 7, dangerousGoodsCount: 0, markedCount: 0, newlyMarkedCount: 0, excludedCount: 0,
      registerOnlyCount, manifestOnlyCount }
    h.store.getReconciliation.mockResolvedValue({ ...complete, result })
    await h.flow.selectFile(h.event)
    await flushPromises()
    const report = h.wrapper.get('[data-testid="reconciliation-statistics"]')
    expect(report.find('[data-testid="reconciliation-registerOnlyCount"]').exists()).toBe(registerOnlyCount !== 0)
    expect(report.find('[data-testid="reconciliation-manifestOnlyCount"]').exists()).toBe(manifestOnlyCount !== 0)
    for (const key of ['dangerousGoodsCount', 'markedCount', 'newlyMarkedCount', 'excludedCount'])
      expect(report.get(`[data-testid="reconciliation-${key}"]`).text()).toBe('0')
    expect(report.findAll('dt').map(label => label.text())).toEqual([
      'Посылок с признаком «Опасный груз»:', 'Всего запретов:', 'Новых запретов:', 'Посылок, не переданных партнёру:',
      ...(registerOnlyCount ? ['Посылок в реестре, но не в манифесте:'] : []),
      ...(manifestOnlyCount ? ['Посылок в манифесте, но не в реестре:'] : [])
    ])
  })

  it('suppresses disallowed, empty, busy and read-only selections without notifications', async () => {
    const h = harness()
    expect(h.flow.openFile()).toBe(false)
    const picker = { value: 'old', click: vi.fn() }
    h.flow.fileInput.value = picker
    expect(h.flow.openFile()).toBe(true)
    await h.flow.selectFile({ target: { value: 'x', files: [] } })
    h.authStore.isSrLogistPlus = false
    await h.flow.selectFile(h.event)
    expect(h.flow.openFile()).toBe(false)
    h.authStore.isSrLogistPlus = true
    h.register.readOnly = true
    await h.flow.selectFile(h.event)
    expect(h.flow.openFile()).toBe(false)
    const busy = harness({ busy: () => true })
    expect(busy.flow.openFile()).toBe(false)
    await busy.flow.selectFile(busy.event)
    expect(h.store.startReconciliation).not.toHaveBeenCalled()
    expect(busy.store.startReconciliation).not.toHaveBeenCalled()
    expect(h.notify).not.toHaveBeenCalled()
  })

  it('recovers upload uncertainty by reading the same operation without resending the file', async () => {
    const h = harness()
    h.store.startReconciliation.mockRejectedValueOnce(new Error('network technical failure'))
    await h.flow.selectFile(h.event)
    await flushPromises()
    expect(h.flow.state.phase).toBe('retry-start')
    expect(h.flow.state.progress.show).toBe(false)
    expect(h.runningAction.value).toBe(true)
    expect(h.wrapper.get('[data-testid="retry"]').attributes('disabled')).toBeUndefined()
    expect(h.wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(h.notify).toHaveBeenCalledOnce()
    expect(h.flow.openFile()).toBe(false)
    await h.flow.selectFile(h.event)
    expect(h.store.startReconciliation).toHaveBeenCalledOnce()
    await h.wrapper.get('[data-testid="retry"]').trigger('click')
    await flushPromises()
    expect(h.store.startReconciliation).toHaveBeenCalledOnce()
    expect(h.store.getReconciliation).toHaveBeenCalledWith(7, 'op-1')
    expect(h.flow.state.result).toEqual(statistics)
  })

  it('retries only GET after a temporary read failure', async () => {
    const h = harness()
    h.store.getReconciliation.mockRejectedValueOnce(failure(undefined))
    await h.flow.selectFile(h.event)
    await flushPromises()
    expect(h.flow.state.phase).toBe('retry-status')
    expect(h.flow.state.progress.show).toBe(false)
    expect(h.runningAction.value).toBe(true)
    expect(h.wrapper.get('[data-testid="page-alert-region"]').text()).toContain('Ошибка сверки')
    await h.wrapper.get('[data-testid="retry"]').trigger('click')
    await flushPromises()
    expect(h.store.startReconciliation).toHaveBeenCalledOnce()
    expect(h.store.getReconciliation).toHaveBeenCalledTimes(2)
    expect(h.flow.state.summaryVisible).toBe(true)
  })

  it.each(['ReconciliationOutcomeUnknown', 'ReconciliationOperationNotFound'])('does not replay %s without explicit acknowledgement', async code => {
    const h = harness()
    h.store.getReconciliation.mockRejectedValueOnce(failure(code, 409))
    await h.flow.selectFile(h.event)
    await flushPromises()
    expect(h.flow.state.phase).toBe('unknown')
    expect(h.flow.state.progress.show).toBe(false)
    expect(h.runningAction.value).toBe(true)
    await h.wrapper.get('[data-testid="new"]').trigger('click')
    await flushPromises()
    expect(h.store.startReconciliation).toHaveBeenCalledOnce()
    expect(h.flow.state.phase).toBe('unknown')
    h.confirm.mockResolvedValue(true)
    const picker = { value: 'old', click: vi.fn() }
    h.flow.fileInput.value = picker
    await h.flow.acknowledgeUnknown()
    expect(picker.click).toHaveBeenCalledOnce()
    expect(h.runningAction.value).toBe(false)
    expect(h.store.startReconciliation).toHaveBeenCalledOnce()
  })

  it.each(['InvalidManifest', 'Unexpected'])('presents terminal %s exactly once and unlocks', async failureKind => {
    const h = harness()
    h.store.getReconciliation.mockRejectedValueOnce(failure('ReconciliationFailed', 400, { finished: true, failureKind }))
    await h.flow.selectFile(h.event)
    await flushPromises()
    expect(h.runningAction.value).toBe(false)
    expect(h.flow.state.phase).toBe('idle')
    if (failureKind === 'InvalidManifest') {
      expect(h.wrapper.get('[data-testid="error-dialog-message"]').text()).toBe('Ошибка сверки реестра')
      expect(h.notify).not.toHaveBeenCalled()
      await h.wrapper.get('[data-testid="error-dialog-close"]').trigger('click')
      expect(h.flow.state.error.show).toBe(false)
    } else {
      expect(h.wrapper.findAll('[role="alert"]')).toHaveLength(1)
      expect(h.notify).toHaveBeenCalledOnce()
    }
    expect(h.flow.state.result).toBeNull()
  })

  it.each([400, 403])('handles definite upload rejection %i without a retry loop', async status => {
    const h = harness()
    h.store.startReconciliation.mockRejectedValueOnce(failure('ReconciliationInvalidManifest', status))
    await h.flow.selectFile(h.event)
    expect(h.flow.state.phase).toBe('idle')
    expect(h.flow.state.error.show).toBe(status === 400)
    expect(h.runningAction.value).toBe(false)
    expect(h.store.getReconciliation).not.toHaveBeenCalled()
  })

  it('allows an initiator to recover their already-running operation through GET', async () => {
    const h = harness()
    h.store.startReconciliation.mockRejectedValueOnce(failure('ReconciliationAlreadyRunning', 409, { activeHandle: 'previous-op' }))
    await h.flow.selectFile(h.event)
    expect(h.flow.state.phase).toBe('retry-status')
    await h.flow.retry()
    expect(h.store.getReconciliation).toHaveBeenCalledWith(7, 'previous-op')
    expect(h.store.startReconciliation).toHaveBeenCalledOnce()
  })

  it.each(['register', 'table'])('retains confirmed statistics after %s refresh failure and retries only refresh', async where => {
    const h = harness()
    if (where === 'register') h.refreshRegister.mockRejectedValueOnce(new Error('Ошибка обновления реестра'))
    else h.refreshParcels.mockImplementationOnce(async () => { useAlertStore().error('Ошибка загрузки посылок'); return false })
    await h.flow.selectFile(h.event)
    await flushPromises()
    expect(h.flow.state.result).toEqual(statistics)
    expect(h.wrapper.get('[data-testid="reconciliation-statistics"]').isVisible()).toBe(true)
    expect(h.flow.state.refreshFailed).toBe(true)
    expect(h.notify).toHaveBeenCalledOnce()
    expect(h.wrapper.findAll('[role="alert"]')).toHaveLength(1)
    await h.flow.refresh()
    expect(h.flow.state.refreshFailed).toBe(false)
    expect(h.store.startReconciliation).toHaveBeenCalledOnce()
  })

  it('does not overlap progress polling and stops its timer on teardown', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const h = harness()
    let resolve
    h.store.getReconciliation.mockReturnValueOnce(new Promise(r => { resolve = r }))
    const start = h.flow.selectFile(h.event)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(3000)
    expect(h.store.getReconciliation).toHaveBeenCalledOnce()
    resolve({ finished: false, percent: 55 })
    await start
    expect(h.flow.state.progress.percent).toBe(55)
    await vi.advanceTimersByTimeAsync(1000)
    expect(h.store.getReconciliation).toHaveBeenCalledTimes(2)
    const pending = harness()
    pending.store.getReconciliation.mockResolvedValue({ finished: false, percent: 10 })
    await pending.flow.selectFile(pending.event)
    pending.wrapper.unmount()
    await vi.advanceTimersByTimeAsync(3000)
    expect(pending.store.getReconciliation).toHaveBeenCalledOnce()
  })

  it('ignores late start and poll results or rejections after unmount', async () => {
    for (const phase of ['start', 'poll']) {
      const h = harness()
      let reject
      const promise = new Promise((_, r) => { reject = r })
      if (phase === 'start') h.store.startReconciliation.mockReturnValueOnce(promise)
      else h.store.getReconciliation.mockReturnValueOnce(promise)
      const work = h.flow.selectFile(h.event)
      await flushPromises()
      h.wrapper.unmount()
      reject(new Error('teardown network diagnostic'))
      await work
      expect(h.notify).not.toHaveBeenCalled()
      expect(h.flow.state.result).toBeNull()
    }
  })

  it('keeps ActionDialog default spinner behavior and supports bounded percentages', async () => {
    const wrapper = mount(ActionDialog, { props: { actionDialog: { show: true } }, global: { stubs } })
    wrappers.push(wrapper)
    expect(wrapper.get('[data-testid="progress"]').attributes('data-indeterminate')).toBe('true')
    await wrapper.setProps({ actionDialog: { show: true, title: 'Сверка', percent: 101 } })
    expect(wrapper.text()).toContain('100%')
    expect(wrapper.get('[data-testid="progress"]').attributes('data-indeterminate')).toBe('false')
    await wrapper.setProps({ actionDialog: { show: true, percent: -1 } })
    expect(wrapper.text()).toContain('0%')
  })
  it.each(['expiry', 'restart'])('requires acknowledgement after a lost POST and server %s', async () => {
    const makeId = vi.fn().mockReturnValueOnce('old-op').mockReturnValueOnce('new-op')
    const h = harness({ makeId })
    h.store.startReconciliation.mockRejectedValueOnce(new Error('Ответ сервера потерян'))
    await h.flow.selectFile(h.event)
    h.store.getReconciliation.mockRejectedValueOnce(failure('ReconciliationOperationNotFound', 404))
    await h.flow.retry()
    expect(h.store.startReconciliation).toHaveBeenCalledOnce()
    expect(h.store.getReconciliation).toHaveBeenCalledWith(7, 'old-op')
    expect(h.flow.state.phase).toBe('unknown')
    await h.flow.retry()
    expect(h.store.startReconciliation).toHaveBeenCalledOnce()
    h.confirm.mockResolvedValue(true)
    h.flow.fileInput.value = { value: '', click: vi.fn() }
    await h.flow.acknowledgeUnknown()
    expect(h.store.startReconciliation).toHaveBeenCalledOnce()
    await h.flow.selectFile(h.event)
    expect(h.store.startReconciliation).toHaveBeenNthCalledWith(2, 7, h.file, 'new-op')
  })

  it.each(['start', 'response', 'timer'])('continues polling across transient store loading during %s', async phase => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    let currentRegister = { id: 7, registerType: WBRN_REGISTER_ID, theOtherCountryCode: 762 }
    const h = harness({ register: () => currentRegister, registerId: () => 7 })
    let resolve
    const pending = new Promise(r => { resolve = r })
    if (phase === 'start') h.store.startReconciliation.mockReturnValueOnce(pending)
    else if (phase === 'response') h.store.getReconciliation.mockReturnValueOnce(pending)
    else h.store.getReconciliation.mockResolvedValueOnce({ percent: 10, finished: false })
    const work = h.flow.selectFile(h.event)
    await flushPromises()
    currentRegister = { loading: true }
    if (phase === 'timer') await vi.advanceTimersByTimeAsync(1000)
    else { resolve(phase === 'start' ? { id: 'op-1' } : complete); await work }
    await flushPromises()
    currentRegister = { id: 7, registerType: WBRN_REGISTER_ID, theOtherCountryCode: 762 }
    expect(h.flow.state.result).toEqual(statistics)
    expect(h.flow.state.progress.show).toBe(false)
    expect(h.runningAction.value).toBe(false)
    expect(h.store.startReconciliation).toHaveBeenCalledOnce()
  })

  it('discards an old route response without leaving a spinner or mutation lock', async () => {
    const routeId = ref(7)
    const h = harness({ registerId: () => routeId.value })
    let resolve
    h.store.getReconciliation.mockReturnValueOnce(new Promise(r => { resolve = r }))
    const work = h.flow.selectFile(h.event)
    await flushPromises()
    routeId.value = 8
    expect(h.flow.state.phase).toBe('idle')
    expect(h.flow.state.progress.show).toBe(false)
    expect(h.runningAction.value).toBe(false)
    resolve(complete)
    await work
    expect(h.flow.state.result).toBeNull()
  })

})
