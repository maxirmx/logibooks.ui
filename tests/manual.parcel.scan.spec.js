import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, reactive, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useManualParcelScan } from '@/composables/useManualParcelScan.js'
import { useAlertStore } from '@/stores/alert.store.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import ParcelScanAction from '@/components/ParcelScanAction.vue'
import ParcelScanConfirmationContent from '@/components/ParcelScanConfirmationContent.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { useParcelMultiSelect } from '@/composables/useParcelMultiSelect.js'
import { parcelScanDisabledReason, parcelScanId, parcelScanSuccessMessage } from '@/helpers/parcel.scan.helpers.js'
import { vuetifyStubs } from './helpers/test-utils.js'

const { api, confirm, reportError } = vi.hoisted(() => ({
  api: { ops: null, getOps: vi.fn(), ensureOpsLoaded: vi.fn(), getInProgress: vi.fn(), getById: vi.fn(), scanParcel: vi.fn(), startScanJobsListMonitor: vi.fn(), stopScanJobsListMonitor: vi.fn(), createScanJobsListChannel: vi.fn() },
  confirm: vi.fn(), reportError: vi.fn()
}))
const auth = reactive({ isAdmin: true, isWhManager: false, isWhOperator: false })
vi.mock('@/stores/scanjobs.store.js', () => ({ useScanjobsStore: () => api }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => auth }))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => confirm }))
vi.mock('@/helpers/error.helpers.js', async importOriginal => ({ ...await importOriginal(), reportError }))

const job = { id: 7, registerId: 1, type: 30, operation: 10, status: 15, name: 'Приёмка' }
const scanConstants = { inProgressStatus: 15, boxOnlyType: 20, parcelScanSource: 10, lookupOperation: 30 }
const parcels = [{ id: 1, statusId: 5 }, { id: 2, statusId: 5 }, { id: 3, statusId: 5 }]
const wrappers = []
function harness(overrides = {}, renderActions = false) {
  let scan, selection
  const renderedParcels = ref(parcels.map(parcel => ({ ...parcel })))
  const opts = { registerId: ref(1), scopeKey: ref('box-1'), refresh: vi.fn().mockResolvedValue(true), ...overrides }
  opts.onScanned ??= id => selection.removeSelected([id])
  const wrapper = mount(defineComponent({
    components: { PageAlertRegion, ParcelScanAction },
    setup() {
      scan = useManualParcelScan(opts)
      selection = useParcelMultiSelect({ items: renderedParcels, loading: ref(false), page: ref(1),
        selectedParcelId: ref(null), dataTableRef: ref(null), disabled: scan.locked,
        onContextMenu: () => scan.run(selection.selectedItems.value, null, true) })
      return { scan, selection, parcels: renderedParcels, renderActions }
    },
    template: '<div><PageAlertRegion/><template v-if="renderActions"><div v-for="parcel in parcels" :key="parcel.id" data-testid="selectable-row" @click="selection.handleRowClick($event, { item: parcel })" @contextmenu="selection.handleRowContextMenu($event, { item: parcel })"><ParcelScanAction :parcels="[parcel]" :selection="selection"/></div></template></div>'
  }), { global: { stubs: vuetifyStubs } })
  wrappers.push(wrapper)
  return { wrapper, scan, selection, opts, parcels: renderedParcels }
}
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  auth.isAdmin = true
  auth.isWhManager = false
  auth.isWhOperator = false
  api.getInProgress.mockResolvedValue([job])
  api.ops = reactive({ constants: { ...scanConstants } })
  api.getOps.mockResolvedValue(true)
  api.ensureOpsLoaded.mockResolvedValue(true)
  api.scanParcel.mockResolvedValue({ parcelCount: 1, scanSource: 10, hasIssues: true })
  api.startScanJobsListMonitor.mockResolvedValue(true)
  api.stopScanJobsListMonitor.mockResolvedValue(true)
  api.createScanJobsListChannel.mockReturnValue({ start: api.startScanJobsListMonitor, stop: api.stopScanJobsListMonitor })
  confirm.mockResolvedValue(true)
})
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()) })

describe('manual parcel scan eligibility', () => {
  it.each([
    [null, null], [{ id: -1 }, null], [{ id: 1.5 }, null], [{ id: 1, isInRegister: false }, null],
    [{ id: '3' }, 3], [{ id: 1, parcelId: 2 }, 2]
  ])('normalizes registered parcel identity %j', (parcel, id) => expect(parcelScanId(parcel)).toBe(id))
  it.each([
    [null, 'Нет активного задания сканирования'],
    [{ ...job, status: 18 }, 'Нет активного задания сканирования'],
    [{ ...job, type: 20 }, 'Задание поддерживает только сканирование коробок'],
    [{ ...job, registerId: 2 }, ''], [{ ...job, readOnly: true }, ''],
    [{ ...job, operation: 30 }, ''], [{ ...job, type: 99 }, ''],
    [{ ...job, operation: 30, lookupStatusId: 6 }, ''],
    [{ ...job, operation: 30, lookupStatusId: 5, type: 10 }, '']
  ])('limits disabled reasons to active-job availability and box-only capability: %j', (candidate, reason) => {
    expect(parcelScanDisabledReason(candidate, scanConstants)).toBe(reason)
  })
  it('defers job availability until Core constants are available', () => {
    expect(parcelScanDisabledReason(job)).toBe('Нет активного задания сканирования')
  })
  it.each([
    [{ completed: 2, matched: 0, lookup: false }, 'Отсканировано посылок: 2.'],
    [{ completed: 1, matched: 1, lookup: true }, 'Посылка соответствует условиям поиска'],
    [{ completed: 1, matched: 0, lookup: true }, 'Посылка не соответствует условиям поиска'],
    [{ completed: 3, matched: 2, lookup: true }, 'Отсканировано посылок: 3. Соответствуют условиям поиска: 2. Не соответствуют: 1.']
  ])('describes the Core result without checking criteria in UI', (result, expected) => {
    expect(parcelScanSuccessMessage(result)).toBe(expected)
  })
})

describe('manual parcel scan workflow', () => {
  it('locks actions during confirmation and starts the busy indicator only after acceptance', async () => {
    let accept, finish
    confirm.mockImplementationOnce(() => new Promise(resolve => { accept = resolve }))
    api.scanParcel.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const { scan, wrapper } = harness({}, true)
    await flushPromises()
    const run = scan.run(parcels, null, true)
    await flushPromises()
    expect(scan.locked.value).toBe(true)
    expect(scan.busy.value).toBe(false)
    expect(wrapper.findAll('[data-testid="manual-parcel-scan"]').every(button => button.attributes('disabled') !== undefined)).toBe(true)
    expect(api.scanParcel).not.toHaveBeenCalled()
    expect(await scan.run(parcels, null, true)).toBe(false)
    accept(true)
    await flushPromises()
    expect(scan.busy.value).toBe(true)
    finish({ parcelCount: 1, scanSource: 10 })
    await run
    expect(scan.locked.value).toBe(false)
    expect(scan.busy.value).toBe(false)
    expect(api.scanParcel.mock.calls).toEqual([[7, 1], [7, 2], [7, 3]])
  })
  it('chooses a compatible job in the shared confirmation for a context-menu bulk action', async () => {
    api.getInProgress.mockResolvedValue([{ ...job, id: 8, type: 20 }, job, { ...job, id: 9, name: 'Поиск посылок' }])
    confirm.mockImplementationOnce(async options => {
      expect(options.contentComponent).toBe(ParcelScanConfirmationContent)
      expect(options.contentComponentProps.jobs.map(candidate => candidate.id)).toEqual([7, 9])
      expect(options.contentComponentProps.jobs.map(candidate => candidate.label)).toEqual(['Приёмка', 'Поиск посылок'])
      const content = mount(options.contentComponent, { props: options.contentComponentProps, global: { stubs: vuetifyStubs } })
      expect(content.text()).toContain('Выбрано 3 посылки')
      content.findComponent({ name: 'v-select' }).vm.$emit('update:modelValue', 9)
      content.unmount()
      return true
    })
    const { scan } = harness()
    await flushPromises()
    expect(await scan.run(parcels, null, true)).toBe(true)
    expect(api.scanParcel.mock.calls).toEqual([[9, 1], [9, 2], [9, 3]])
  })
  it('presents a rejected confirmation once without scanning and unlocks a subsequent attempt', async () => {
    confirm.mockRejectedValueOnce(new Error('Диалог недоступен'))
    const { scan, wrapper } = harness()
    await flushPromises()
    expect(await scan.run(parcels, null, true)).toBe(false)
    expect(api.scanParcel).not.toHaveBeenCalled()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Диалог недоступен')
    expect(scan.locked.value).toBe(false)
    expect(scan.pendingBatch.value.uncertain).toBe(false)
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    await scan.run(parcels, null, true)
    expect(api.scanParcel.mock.calls).toEqual([[7, 1], [7, 2], [7, 3]])
  })
  it.each([false, true])('shows a job-definition load failure once without alert actions (monitor: %s)', async monitor => {
    api.ops.constants = null
    api.ensureOpsLoaded.mockRejectedValueOnce(new Error('Не удалось получить типы сканирования'))
    const { wrapper, scan } = harness(monitor ? { job: ref(job) } : {}, true)
    const report = vi.spyOn(useAlertStore(), 'error')
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось получить типы сканирования')
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    expect(report).toHaveBeenCalledOnce()
    expect(scan.jobs.value).toEqual([])
    expect(api.scanParcel).not.toHaveBeenCalled()
  })
  it('keeps scanning unavailable for incomplete ops with a message-only alert', async () => {
    api.ops.constants = { inProgressStatus: 15 }
    const { wrapper, scan } = harness({}, true)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить параметры сканирования.')
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    expect(scan.jobs.value).toEqual([])
    expect(wrapper.get('[data-testid="manual-parcel-scan"]').attributes('disabled')).toBeDefined()
    expect(api.scanParcel).not.toHaveBeenCalled()
  })
  it('uses Core values for active status and box-only capability and accepts completed requests', async () => {
    api.ops.constants = { inProgressStatus: 115, boxOnlyType: 120, parcelScanSource: 110, lookupOperation: 130 }
    const activeJob = { ...job, status: 115 }
    const boxJob = { ...activeJob, id: 8, type: 120 }
    api.getInProgress.mockResolvedValue([job, boxJob, activeJob])
    api.scanParcel.mockResolvedValueOnce({ parcelCount: 1, scanSource: 110 })
    const { wrapper, scan } = harness({}, true)
    await flushPromises()
    expect(scan.jobs.value.map(candidate => candidate.id)).toEqual([8, 7])
    expect(scan.compatibleJobs().map(candidate => candidate.id)).toEqual([7])
    expect(scan.disabledReason(boxJob)).toBe('Задание поддерживает только сканирование коробок')
    const button = wrapper.get('[data-testid="manual-parcel-scan"]')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('aria-label')).toBe('Отметить как отсканированную')
    await button.trigger('click')
    await flushPromises()
    expect(api.scanParcel).toHaveBeenCalledWith(7, 1)
    expect(scan.completedIds.value).toEqual([1])
    expect(wrapper.text()).toContain('Отсканировано посылок: 1')
    await scan.run([parcels[1]], 7)
    expect(scan.completedIds.value).toEqual([2])
    expect(scan.pendingBatch.value).toBeNull()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
  it('observes a definitions failure after teardown without publishing a stale alert', async () => {
    let rejectLabels
    api.ensureOpsLoaded.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectLabels = reject }))
    const { wrapper } = harness()
    wrapper.unmount()
    rejectLabels(new Error('Late definitions failure'))
    await flushPromises()
    expect(useAlertStore().alert).toBeNull()
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { context: 'manual scan definitions after unmount' })
  })
  it('blocks scanning when only the Lookup operation constant is missing', async () => {
    delete api.ops.constants.lookupOperation
    const { wrapper, scan } = harness({}, true)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить параметры сканирования.')
    expect(scan.jobs.value).toEqual([])
    expect(wrapper.get('[data-testid="manual-parcel-scan"]').element.disabled).toBe(true)
    expect(api.scanParcel).not.toHaveBeenCalled()
  })
  it('loads only active jobs for this party, refreshes on notifications and cleans up', async () => {
    api.getInProgress.mockResolvedValue([job, { ...job, id: 8, registerId: 2 }, { ...job, id: 9, status: 18 }])
    const { scan } = harness()
    await flushPromises()
    expect(scan.jobs.value).toEqual([job])
    await api.startScanJobsListMonitor.mock.calls[0][0].onChanged()
    expect(api.getInProgress).toHaveBeenCalledTimes(2)
  })
  it('uses the monitor job directly without a list subscription', async () => {
    const { scan } = harness({ job: ref(job) })
    await flushPromises()
    expect(scan.jobs.value).toEqual([job])
    expect(api.getInProgress).not.toHaveBeenCalled()
    await scan.run([parcels[1]], job.id)
    expect(api.scanParcel).toHaveBeenCalledWith(7, 2)
    expect(confirm).not.toHaveBeenCalled()
  })
  it('scans a frozen selection sequentially and accepts hasIssues as a normal scan', async () => {
    let finish
    api.scanParcel.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const onScanned = vi.fn()
    const { scan, opts } = harness({ onScanned })
    await flushPromises()
    const run = scan.run(parcels, 7, true)
    await flushPromises()
    expect(api.scanParcel).toHaveBeenCalledTimes(1)
    expect(scan.busy.value).toBe(true)
    expect(confirm.mock.calls[0][0].contentComponentProps.count).toBe(3)
    expect(confirm.mock.calls[0][0].contentComponentProps.jobs).toEqual([{ id: 7, label: 'Приёмка' }])
    await scan.run(parcels, 7, true)
    finish({ parcelCount: 1, scanSource: 10 })
    await run
    expect(api.scanParcel.mock.calls).toEqual([[7, 1], [7, 2], [7, 3]])
    expect(onScanned.mock.calls).toEqual([[1], [2], [3]])
    expect(scan.pendingBatch.value).toBeNull()
    expect(scan.busy.value).toBe(false)
    expect(opts.refresh).toHaveBeenCalledOnce()
  })
  it('cancels confirmation without scanning or refreshing', async () => {
    confirm.mockResolvedValue(false)
    const { scan, opts } = harness()
    await flushPromises()
    expect(await scan.run(parcels, 7, true)).toBe(false)
    expect(api.scanParcel).not.toHaveBeenCalled()
    expect(opts.refresh).not.toHaveBeenCalled()
  })
  it('stops on a rejection, visibly reports once, and retries only unfinished IDs', async () => {
    api.scanParcel.mockResolvedValueOnce({ parcelCount: 1, scanSource: 10 })
      .mockRejectedValueOnce(Object.assign(new Error('Изменения запрещены'), { status: 409 }))
    const { scan, wrapper } = harness()
    await flushPromises()
    const report = vi.spyOn(useAlertStore(), 'error')
    expect(await scan.run(parcels, 7, true)).toBe(false)
    expect(api.scanParcel.mock.calls).toEqual([[7, 1], [7, 2]])
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Отсканировано: 1 из 3')
    expect(wrapper.text()).toContain('Изменения запрещены')
    expect(report).toHaveBeenCalledOnce()
    expect(scan.pendingBatch.value.parcels.map(parcel => parcel.id)).toEqual([2, 3])
    await scan.run(scan.pendingBatch.value.parcels, scan.pendingBatch.value.jobId, true)
    expect(api.scanParcel.mock.calls).toEqual([[7, 1], [7, 2], [7, 2], [7, 3]])
  })
  it.each([false, true])('accepts zero-match Lookup results, marks all selected parcels and shows success (monitor: %s)', async monitor => {
    const lookupJob = { ...job, operation: 30, lookupStatusId: 6 }
    api.getInProgress.mockResolvedValue([lookupJob])
    api.scanParcel.mockResolvedValue({ count: 0, parcelCount: 0, scanSource: 0 })
    const { scan, wrapper, selection, opts } = harness(monitor ? { job: ref(lookupJob) } : {})
    await flushPromises()
    selection.selectAllCurrentPage()
    const error = vi.spyOn(useAlertStore(), 'error')
    expect(await scan.run(selection.selectedItems.value, 7, true)).toBe(true)
    expect(api.scanParcel.mock.calls).toEqual([[7, 1], [7, 2], [7, 3]])
    expect(scan.completedIds.value).toEqual([1, 2, 3])
    expect(selection.selectedItems.value).toEqual([])
    expect(scan.pendingBatch.value).toBeNull()
    expect(opts.refresh).toHaveBeenCalledOnce()
    expect(wrapper.get('[role="status"]').classes()).toContain('alert-success')
    expect(wrapper.text()).toContain('Отсканировано посылок: 3')
    expect(wrapper.text()).toContain('Соответствуют условиям поиска: 0. Не соответствуют: 3.')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(error).not.toHaveBeenCalled()
  })
  it.each([false, true])('uses an info alert for a Core-confirmed Lookup match (monitor: %s)', async monitor => {
    api.ops.constants.lookupOperation = 130
    const lookupJob = { ...job, operation: 130, lookupStatusId: 6 }
    api.getInProgress.mockResolvedValue([lookupJob])
    api.scanParcel.mockResolvedValueOnce({ count: 1, parcelCount: 1, scanSource: 10, hasIssues: true })
    const { scan, wrapper, opts } = harness(monitor ? { job: ref(lookupJob) } : {})
    await flushPromises()
    const success = vi.spyOn(useAlertStore(), 'success')
    const info = vi.spyOn(useAlertStore(), 'info')
    expect(await scan.run([parcels[0]], 7)).toBe(true)
    expect(wrapper.get('[role="status"]').classes()).toContain('alert-info')
    expect(wrapper.text()).toContain('Посылка соответствует условиям поиска')
    expect(info).toHaveBeenCalledOnce()
    expect(success).not.toHaveBeenCalled()
    expect(scan.completedIds.value).toEqual([1])
    expect(opts.refresh).toHaveBeenCalledOnce()
  })
  it.each([[1, 0, 1], [1, 1, 1]])('uses info and reports matched and unmatched totals for Lookup batch %j', async (...counts) => {
    const lookupJob = { ...job, operation: 30, lookupStatusId: 6 }
    api.getInProgress.mockResolvedValue([lookupJob])
    for (const count of counts) api.scanParcel.mockResolvedValueOnce({ count, parcelCount: 1, scanSource: 10 })
    const { scan, wrapper } = harness()
    await flushPromises()
    expect(await scan.run(parcels, 7, true)).toBe(true)
    const matched = counts.filter(Boolean).length
    expect(wrapper.get('[role="status"]').classes()).toContain('alert-info')
    expect(wrapper.text()).toContain(`Отсканировано посылок: 3. Соответствуют условиям поиска: ${matched}. Не соответствуют: ${3 - matched}.`)
    expect(scan.completedIds.value).toEqual([1, 2, 3])
  })
  it('preserves a genuine rejection after a Lookup match without publishing a completion alert', async () => {
    const lookupJob = { ...job, operation: 30, lookupStatusId: 6 }
    api.getInProgress.mockResolvedValue([lookupJob])
    api.scanParcel.mockResolvedValueOnce({ count: 1, parcelCount: 1, scanSource: 10 })
      .mockRejectedValueOnce(Object.assign(new Error('Задание приостановлено'), { status: 409 }))
    const { scan, wrapper, opts } = harness()
    await flushPromises()
    const alerts = useAlertStore()
    const info = vi.spyOn(alerts, 'info')
    const success = vi.spyOn(alerts, 'success')
    const error = vi.spyOn(alerts, 'error')
    expect(await scan.run(parcels, 7, true)).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toContain('Задание приостановлено')
    expect(wrapper.text()).toContain('Отсканировано: 1 из 3')
    expect(error).toHaveBeenCalledOnce()
    expect(info).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
    expect(scan.completedIds.value).toEqual([1])
    expect(opts.refresh).toHaveBeenCalledOnce()
  })
  it('requires a page reload after an ambiguous network failure without injecting recovery controls', async () => {
    api.scanParcel.mockRejectedValueOnce(new Error('Соединение прервано'))
    const { scan, wrapper } = harness({}, true)
    await flushPromises()
    await scan.run(parcels, 7, true)
    expect(wrapper.get('[role="alert"]').text()).toContain('Обновите страницу и проверьте посылку перед повтором')
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="manual-parcel-scan"]').every(button => button.element.disabled)).toBe(true)
    expect(await scan.run(parcels, 7, true)).toBe(false)
    expect(api.scanParcel).toHaveBeenCalledOnce()
    wrapper.unmount()
    const reloaded = harness({}, true)
    await flushPromises()
    expect(reloaded.scan.disabled.value).toBe(false)
  })
  it.each(['scope', 'table controls'])('preserves the uncertain-result lock after changing %s', async transition => {
    api.scanParcel.mockRejectedValueOnce(new Error('Соединение прервано'))
    const { scan, opts, wrapper } = harness({}, true)
    await flushPromises()
    await scan.run(parcels, 7, true)
    if (transition === 'scope') opts.scopeKey.value = 'another-box'
    else scan.invalidateBatch()
    await flushPromises()
    expect(scan.pendingBatch.value).toBeNull()
    expect(scan.disabled.value).toBe(true)
    expect(await scan.run(parcels, 7, true)).toBe(false)
    expect(api.scanParcel).toHaveBeenCalledOnce()
    expect(wrapper.findAll('[data-testid="manual-parcel-scan"]').every(button => button.element.disabled)).toBe(true)
  })
  it.each([400, null])('shows the scan error after a slow automatic refresh without alert actions (status: %s)', async status => {
    let finishRefresh
    const refresh = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finishRefresh = resolve })).mockResolvedValue(true)
    api.scanParcel.mockRejectedValueOnce(Object.assign(new Error('Сбой сканирования'), status ? { status } : {}))
    const { scan, wrapper } = harness({ refresh })
    await flushPromises()
    const run = scan.run(parcels, 7, true)
    await flushPromises()
    expect(scan.locked.value).toBe(true)
    finishRefresh(true)
    await run
    await flushPromises()
    expect(scan.locked.value).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toContain('Сбой сканирования')
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    expect(api.scanParcel).toHaveBeenCalledOnce()
  })
  it('reports a scan failure technically when scope changes during the automatic refresh', async () => {
    let finishRefresh
    const failure = Object.assign(new Error('Сбой сканирования'), { status: 400 })
    api.scanParcel.mockRejectedValueOnce(failure)
    const refresh = vi.fn(() => new Promise(resolve => { finishRefresh = resolve }))
    const { scan, wrapper, opts } = harness({ refresh })
    await flushPromises()
    const run = scan.run(parcels, 7, true)
    await flushPromises()
    opts.scopeKey.value = 'another-box'
    finishRefresh(true)
    await run
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(reportError).toHaveBeenCalledWith(failure, { context: 'manual scan after scope change' })
  })
  it('invalidates active and pending batches after explicit monitor table changes', async () => {
    let finish
    api.scanParcel.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const { scan } = harness({ job: ref(job) })
    await flushPromises()
    const run = scan.run(parcels, 7, true)
    await flushPromises()
    scan.invalidateBatch()
    finish({ parcelCount: 1, scanSource: 10 })
    await run
    expect(api.scanParcel).toHaveBeenCalledOnce()
    expect(scan.pendingBatch.value).toBeNull()
  })
  it.each(['scope', 'unmount'])('does not publish a late refresh rejection after %s', async transition => {
    let rejectRefresh
    const refresh = vi.fn(() => new Promise((resolve, reject) => { rejectRefresh = reject }))
    const { scan, wrapper, opts } = harness({ refresh })
    await flushPromises()
    const run = scan.run([parcels[0]], 7)
    await flushPromises()
    if (transition === 'scope') opts.scopeKey.value = 'box-2'
    else wrapper.unmount()
    rejectRefresh(new Error('Late refresh failure'))
    await run
    expect(useAlertStore().alert).toBeNull()
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { context: 'manual scan failure refresh' })
  })
  it('keeps an uncertain result locked after the automatic refresh fails', async () => {
    api.scanParcel.mockRejectedValueOnce(new Error('Ответ потерян'))
    const { scan, wrapper } = harness({ refresh: vi.fn().mockRejectedValue(new Error('Refresh failed')) })
    await flushPromises()
    await scan.run([parcels[0]], 7)
    expect(scan.pendingBatch.value.uncertain).toBe(true)
    expect(wrapper.get('[role="alert"]').text()).toContain('Ответ потерян')
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    expect(await scan.run([parcels[0]], 7)).toBe(false)
  })
  it('shows a message without recovery actions after a committed scan and failed refresh', async () => {
    const refresh = vi.fn().mockRejectedValueOnce(new Error('Ошибка обновления'))
    const { scan, wrapper } = harness({ refresh })
    await flushPromises()
    await scan.run([parcels[0]], 7)
    expect(wrapper.text()).toContain('Ошибка обновления')
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    expect(api.scanParcel).toHaveBeenCalledOnce()
  })
  it('preserves the scan error when refresh also rejects', async () => {
    const scanError = Object.assign(new Error('Ошибка сканирования'), { status: 400 })
    api.scanParcel.mockRejectedValue(scanError)
    const { scan, wrapper } = harness({ refresh: vi.fn().mockRejectedValue(new Error('Ошибка обновления')) })
    await flushPromises()
    await scan.run(parcels, 7, true)
    expect(wrapper.text()).toContain('Ошибка сканирования')
    expect(wrapper.text()).not.toContain('Ошибка обновления')
    expect(reportError).toHaveBeenCalled()
  })
  it('lets Core reject a job that changed after selection without substituting another job', async () => {
    api.scanParcel.mockRejectedValueOnce(Object.assign(new Error('Задание на сканирование больше не выполняется'), { status: 409 }))
    const { scan, wrapper } = harness()
    await flushPromises()
    await scan.run(parcels, 7, true)
    expect(api.getById).not.toHaveBeenCalled()
    expect(api.scanParcel.mock.calls).toEqual([[7, 1]])
    expect(wrapper.text()).toContain('больше не выполняется')
    expect(scan.pendingBatch.value.jobId).toBe(7)
  })
  it('guards unauthorized, empty and temporarily disabled operations without extra error tooltips', async () => {
    const disabled = ref(true)
    const { scan } = harness({ disabled })
    await flushPromises()
    expect(await scan.run(parcels, 7)).toBe(false)
    disabled.value = false
    auth.isAdmin = false
    expect(scan.disabledReason(job)).toBe('')
    expect(await scan.run(parcels, 7)).toBe(false)
    expect(await scan.run([], 7)).toBe(false)
    expect(api.scanParcel).not.toHaveBeenCalled()
  })
  it('stops scheduling requests and feedback after unmount', async () => {
    let finish
    api.scanParcel.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const { scan, wrapper, opts } = harness()
    await flushPromises()
    const run = scan.run(parcels, 7, true)
    await flushPromises()
    wrapper.unmount()
    finish({ parcelCount: 1, scanSource: 10 })
    await run
    expect(api.scanParcel).toHaveBeenCalledOnce()
    expect(opts.refresh).not.toHaveBeenCalled()
    expect(useAlertStore().alert).toBeNull()
  })
  it('reports a detached request rejection technically without showing it on the new page', async () => {
    let rejectScan
    api.scanParcel.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectScan = reject }))
    const { scan, wrapper } = harness()
    await flushPromises()
    const run = scan.run(parcels, 7)
    await flushPromises()
    wrapper.unmount()
    rejectScan(new Error('Late request failure'))
    await run
    expect(useAlertStore().alert).toBeNull()
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { context: 'manual scan after scope change' })
  })
  it('observes startup failure after teardown without publishing a stale alert', async () => {
    let rejectStart
    api.startScanJobsListMonitor.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectStart = reject }))
    const { wrapper } = harness()
    wrapper.unmount()
    rejectStart(new Error('Late startup failure'))
    await flushPromises()
    expect(useAlertStore().alert).toBeNull()
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { context: 'manual scan startup cleanup' })
  })
  it('clears pending batches when scope changes and ignores stale job responses', async () => {
    const { scan, opts } = harness()
    await flushPromises()
    api.scanParcel.mockRejectedValueOnce(Object.assign(new Error('Сбой'), { status: 400 }))
    await scan.run(parcels, 7)
    let finish
    api.getInProgress.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const oldRequest = scan.jobsLoading.value ? null : api.startScanJobsListMonitor.mock.calls[0][0].onChanged()
    opts.scopeKey.value = 'box-2'
    await flushPromises()
    finish([{ ...job, id: 88 }])
    await oldRequest
    expect(scan.pendingBatch.value).toBeNull()
    expect(scan.jobs.value).toEqual([job])
  })
  it('shows list loading and subscription errors without retry controls', async () => {
    api.startScanJobsListMonitor.mockRejectedValueOnce(new Error('Нет соединения'))
    api.getInProgress.mockRejectedValueOnce(new Error('Нет списка'))
    const { wrapper, scan } = harness()
    await flushPromises()
    expect(wrapper.text()).toContain('Нет списка')
    expect(scan.jobs.value).toEqual([])
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
  })
  it('reports connection loss and technical cleanup failures', async () => {
    const { wrapper } = harness()
    await flushPromises()
    api.startScanJobsListMonitor.mock.calls[0][0].onClosed(new Error('Соединение закрыто'))
    await flushPromises()
    expect(wrapper.text()).toContain('Соединение закрыто')
    api.stopScanJobsListMonitor.mockRejectedValueOnce(new Error('Cleanup'))
    wrapper.unmount()
    await flushPromises()
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { context: 'manual scan jobs cleanup' })
  })
})

describe('shared scan action controls', () => {
  it('uses only reactive job names in menu labels and bulk confirmation', async () => {
    api.getInProgress.mockResolvedValue([job, { ...job, id: 9, name: 'Поиск для сделки XX-2' }])
    const { wrapper, selection } = harness({}, true)
    await flushPromises()
    const row = wrapper.findAllComponents(ParcelScanAction)[0]
    expect(row.findComponent(ActionButton2L).props('options').map(option => option.label)).toEqual(['Приёмка', 'Поиск для сделки XX-2'])
    api.getInProgress.mockResolvedValueOnce([{ ...job, name: 'Сканирование сделки XX-2' }, { ...job, id: 9, name: 'Поиск для сделки XX-2' }])
    await api.startScanJobsListMonitor.mock.calls[0][0].onChanged()
    await flushPromises()
    expect(row.findComponent(ActionButton2L).props('options')[0].label).toBe('Сканирование сделки XX-2')
    selection.selectAllCurrentPage()
    await flushPromises()
    const bulk = wrapper.findAllComponents(ParcelScanAction)[1]
    await bulk.get('[data-testid="manual-parcel-scan-menu"]').trigger('click')
    await flushPromises()
    await bulk.findAll('[role="menuitem"]')[0].trigger('click')
    await flushPromises()
    expect(confirm.mock.calls[0][0].contentComponentProps.jobs).toEqual([{ id: 7, label: 'Сканирование сделки XX-2' }])
    expect(api.ensureOpsLoaded).toHaveBeenCalledOnce()
  })
  it.each([
    ['read-only', { readOnly: true }, 409, 'Изменения запрещены для реестра 1'],
    ['register membership', { registerId: 2 }, 404, 'Посылка 1 не найдена в партии задания'],
    ['unsupported job type', { type: 99 }, 400, 'Задание не поддерживает сканирование посылок']
  ])('leaves %s validation to Core with the normal scan tooltip', async (scenario, metadata, status, message) => {
    api.scanParcel.mockRejectedValueOnce(Object.assign(new Error(message), { status }))
    const { wrapper } = harness({ job: ref({ ...job, ...metadata }) }, true)
    await flushPromises()
    const row = wrapper.findAllComponents(ParcelScanAction)[0]
    const button = row.get('[data-testid="manual-parcel-scan"]')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('aria-label')).toBe('Отметить как отсканированную')
    await button.trigger('click')
    await flushPromises()
    expect(api.getById).not.toHaveBeenCalled()
    expect(api.scanParcel).toHaveBeenCalledWith(7, 1)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain(message)
  })
  it('uses exactly the three single-parcel tooltips, including during execution and uncertain recovery', async () => {
    const currentJob = ref(null)
    const { wrapper, scan } = harness({ job: currentJob }, true)
    await flushPromises()
    const row = wrapper.findAllComponents(ParcelScanAction)[0]
    const tooltips = new Set()
    const recordTooltip = () => tooltips.add(row.get('[data-testid="manual-parcel-scan"]').attributes('aria-label'))
    recordTooltip()
    currentJob.value = { ...job, type: 20 }
    await flushPromises()
    recordTooltip()
    currentJob.value = { ...job, readOnly: true }
    await flushPromises()
    recordTooltip()
    let rejectScan
    api.scanParcel.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectScan = reject }))
    const run = scan.run([parcels[0]], 7)
    await flushPromises()
    expect(row.get('[data-testid="manual-parcel-scan"]').attributes('disabled')).toBeDefined()
    recordTooltip()
    rejectScan(new Error('Ответ потерян'))
    await run
    await flushPromises()
    expect(row.get('[data-testid="manual-parcel-scan"]').attributes('disabled')).toBeDefined()
    recordTooltip()
    currentJob.value = { ...job, status: 18 }
    await flushPromises()
    recordTooltip()
    expect(tooltips).toEqual(new Set([
      'Отметить как отсканированную',
      'Нет активного задания сканирования',
      'Задание поддерживает только сканирование коробок'
    ]))
  })
  it('offers read-only jobs and lets Core present the rejection after submission', async () => {
    const lockedJob = { ...job, readOnly: true }
    api.getInProgress.mockResolvedValue([lockedJob, { ...lockedJob, id: 9 }])
    api.scanParcel.mockRejectedValueOnce(Object.assign(new Error('Изменения запрещены для реестра 1'), { status: 409 }))
    const { wrapper, scan } = harness({}, true)
    await flushPromises()
    expect(scan.compatibleJobs().map(candidate => candidate.id)).toEqual([7, 9])
    const row = wrapper.findAllComponents(ParcelScanAction)[0]
    const menu = row.get('[data-testid="manual-parcel-scan-menu"]')
    expect(menu.attributes('disabled')).toBeUndefined()
    expect(menu.attributes('aria-label')).toBe('Отметить как отсканированную')
    await menu.trigger('click')
    await flushPromises()
    await row.findAll('[role="menuitem"]')[0].trigger('click')
    await flushPromises()
    expect(api.getById).not.toHaveBeenCalled()
    expect(api.scanParcel).toHaveBeenCalledWith(7, 1)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Изменения запрещены для реестра 1')
  })
  it.each([false, true])('hides row and bulk scan controls without permission (monitor: %s)', async monitor => {
    auth.isAdmin = false
    const { scan, wrapper } = harness(monitor ? { job: ref(job) } : {}, true)
    await flushPromises()
    expect(scan.canScan.value).toBe(false)
    expect(wrapper.find('[data-testid="manual-parcel-scan"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="manual-parcel-scan-menu"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="parcel-scan-selection"]').exists()).toBe(false)
    expect(await scan.run(parcels, 7)).toBe(false)
    expect(api.scanParcel).not.toHaveBeenCalled()
    auth.isWhOperator = true
    await flushPromises()
    expect(wrapper.find('[data-testid="manual-parcel-scan"]').exists()).toBe(true)
    auth.isWhOperator = false
    await flushPromises()
    expect(wrapper.find('[data-testid="manual-parcel-scan"]').exists()).toBe(false)
  })
  it.each(['isAdmin', 'isWhManager', 'isWhOperator'])('shows scan controls for %s', async role => {
    auth.isAdmin = false
    auth[role] = true
    const { wrapper } = harness({}, true)
    await flushPromises()
    expect(wrapper.findAll('[data-testid="manual-parcel-scan"]')).toHaveLength(3)
    expect(wrapper.find('[data-testid="parcel-scan-selection"]').exists()).toBe(false)
  })
  it.each([false, true])('uses a disabled plain action when only box-only jobs exist (monitor: %s)', async monitor => {
    const boxJob = { ...job, id: 8, name: 'Только коробки', type: 20 }
    api.getInProgress.mockResolvedValue([boxJob, { ...boxJob, id: 9 }])
    const { wrapper, scan } = harness(monitor ? { job: ref(boxJob) } : {}, true)
    await flushPromises()
    expect(scan.compatibleJobs()).toEqual([])
    expect(wrapper.find('[data-testid="manual-parcel-scan-menu"]').exists()).toBe(false)
    const actions = wrapper.findAll('[data-testid="manual-parcel-scan"]')
    expect(actions).toHaveLength(3)
    expect(actions.every(button => button.attributes('disabled') !== undefined)).toBe(true)
    expect(actions[0].attributes('aria-label')).toBe('Задание поддерживает только сканирование коробок')
    expect(wrapper.text()).not.toContain('Только коробки')
    expect(api.scanParcel).not.toHaveBeenCalled()
  })
  it('keeps Lookup jobs available for mixed parcel statuses and lets Core decide the result', async () => {
    const boxJob = { ...job, id: 8, name: 'Только коробки', type: 20 }
    const lookupFive = { ...job, id: 9, name: 'Поиск статуса 5', operation: 30, lookupStatusId: 5 }
    const lookupSix = { ...job, id: 10, name: 'Поиск статуса 6', operation: 30, lookupStatusId: 6 }
    const lockedJob = { ...job, id: 11, readOnly: true }
    const invalidLookup = { ...job, id: 12, operation: 30 }
    api.getInProgress.mockResolvedValue([boxJob, lookupSix, lookupFive, lockedJob, invalidLookup, job])
    const { wrapper, scan, selection, parcels: renderedParcels } = harness({}, true)
    await flushPromises()
    expect(scan.compatibleJobs().map(candidate => candidate.id)).toEqual([10, 9, 11, 12, 7])
    const rowAction = wrapper.findAllComponents(ParcelScanAction)[0]
    expect(rowAction.findComponent(ActionButton2L).props('options').map(option => option.label)).toEqual([
      'Поиск статуса 6', 'Поиск статуса 5', 'Приёмка', 'Приёмка', 'Приёмка'
    ])
    const bulkAction = wrapper.findAllComponents(ParcelScanAction)[1]
    expect(bulkAction.get('[data-testid="manual-parcel-scan-menu"]').attributes('disabled')).toBeUndefined()
    expect(bulkAction.get('[data-testid="manual-parcel-scan-menu"]').attributes('aria-label')).toBe('Отметить как отсканированную')
    renderedParcels.value[1].statusId = 6
    selection.selectAllCurrentPage()
    await flushPromises()
    const menu = bulkAction.get('[data-testid="manual-parcel-scan-menu"]')
    expect(menu.attributes('disabled')).toBeUndefined()

    api.scanParcel.mockResolvedValueOnce({ parcelCount: 0, scanSource: 0 })
    await menu.trigger('click')
    await flushPromises()
    await bulkAction.findAll('[role="menuitem"]')[0].trigger('click')
    await flushPromises()
    expect(api.scanParcel.mock.calls).toEqual([[10, 1], [10, 2], [10, 3]])
    expect(wrapper.get('[role="status"]').text()).toContain('Отсканировано посылок: 3')
    expect(scan.pendingBatch.value).toBeNull()
    expect(selection.selectedItems.value).toEqual([])
  })
  it('submits a parcel with a different Lookup status from the plain row action', async () => {
    const lookupJob = { ...job, operation: 30, lookupStatusId: 6 }

    api.scanParcel.mockResolvedValueOnce({ parcelCount: 0, scanSource: 0 })
    const { wrapper, scan } = harness({ job: ref(lookupJob) }, true)
    await flushPromises()
    const rowAction = wrapper.findAllComponents(ParcelScanAction)[0]
    const button = rowAction.get('[data-testid="manual-parcel-scan"]')
    expect(button.attributes('disabled')).toBeUndefined()
    await button.trigger('click')
    await flushPromises()
    expect(api.scanParcel).toHaveBeenCalledWith(7, 1)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('[role="status"]').text()).toContain('Посылка не соответствует условиям поиска')
    expect(scan.completedIds.value).toEqual([1])
  })
  it('leaves Lookup configuration validation to Core and displays its rejection once', async () => {
    const lookupJob = { ...job, operation: 30 }

    api.scanParcel.mockRejectedValueOnce(Object.assign(new Error('Для задания поиска не задан статус'), { status: 400 }))
    const { wrapper } = harness({ job: ref(lookupJob) }, true)
    await flushPromises()
    await wrapper.findAllComponents(ParcelScanAction)[0].get('[data-testid="manual-parcel-scan"]').trigger('click')
    await flushPromises()
    expect(api.scanParcel).toHaveBeenCalledWith(7, 1)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Для задания поиска не задан статус')
  })
  it('keeps compatible job choices stable while scanning is busy or recovery is required', async () => {
    api.getInProgress.mockResolvedValue([job, { ...job, id: 9 }])
    api.scanParcel.mockRejectedValueOnce(new Error('Ответ потерян'))
    const { wrapper, scan } = harness({}, true)
    await flushPromises()
    expect(wrapper.findAll('[data-testid="manual-parcel-scan-menu"]')).toHaveLength(3)
    await scan.run([parcels[0]], 7)
    await flushPromises()
    expect(wrapper.findAll('[data-testid="manual-parcel-scan-menu"]')).toHaveLength(3)
    expect(wrapper.findAll('[data-testid="manual-parcel-scan-menu"]').every(button => button.attributes('disabled') !== undefined)).toBe(true)
    expect(scan.compatibleJobs().map(candidate => candidate.id)).toEqual([7, 9])
    expect(await scan.run([parcels[0]], 7)).toBe(false)
    expect(api.scanParcel).toHaveBeenCalledOnce()
  })
  it('repeats only unfinished selected parcels through their row action after a definite failure', async () => {
    api.scanParcel.mockResolvedValueOnce({ parcelCount: 1, scanSource: 10 })
      .mockRejectedValueOnce(Object.assign(new Error('Rejected'), { status: 400 }))
    const { wrapper, selection } = harness({}, true)
    await flushPromises()
    selection.selectAllCurrentPage()
    await wrapper.findAll('[data-testid="manual-parcel-scan"]')[0].trigger('click')
    await flushPromises()
    expect(selection.selectedItems.value.map(parcel => parcel.id)).toEqual([2, 3])
    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
    await wrapper.findAll('[data-testid="manual-parcel-scan"]')[1].trigger('click')
    await flushPromises()
    expect(api.scanParcel.mock.calls).toEqual([[7, 1], [7, 2], [7, 2], [7, 3]])
  })
  it('applies disabled/plain/menu variants to compatible jobs and excludes box-only jobs', async () => {
    api.getInProgress.mockResolvedValueOnce([])
    const { wrapper, scan } = harness({}, true)
    await flushPromises()
    expect(wrapper.get('[data-testid="manual-parcel-scan"]').attributes('disabled')).toBeDefined()
    api.getInProgress.mockResolvedValueOnce([job])
    await api.startScanJobsListMonitor.mock.calls[0][0].onChanged()
    await flushPromises()
    expect(wrapper.get('[data-testid="manual-parcel-scan"]').attributes('disabled')).toBeUndefined()
    await wrapper.get('[data-testid="manual-parcel-scan"]').trigger('click')
    await flushPromises()
    expect(api.scanParcel).toHaveBeenCalledWith(7, 1)
    api.getInProgress.mockResolvedValueOnce([{ ...job, id: 8, type: 20 }, job])
    await api.startScanJobsListMonitor.mock.calls[0][0].onChanged()
    await flushPromises()
    expect(wrapper.find('[data-testid="manual-parcel-scan-menu"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="manual-parcel-scan"]').attributes('disabled')).toBeUndefined()
    api.getInProgress.mockResolvedValueOnce([{ ...job, id: 8, type: 20 }, job, { ...job, id: 9 }])
    await api.startScanJobsListMonitor.mock.calls[0][0].onChanged()
    await flushPromises()
    await wrapper.get('[data-testid="manual-parcel-scan-menu"]').trigger('click')
    await flushPromises()
    const options = wrapper.findAll('[role="menuitem"]')
    expect(options).toHaveLength(2)
    expect(options.every(option => option.attributes('disabled') === undefined)).toBe(true)
    expect(options.map(option => option.text())).toEqual(['Приёмка', 'Приёмка'])
    expect(wrapper.text()).not.toContain('#8')

    await options[1].trigger('click')
    await flushPromises()
    expect(api.scanParcel).toHaveBeenLastCalledWith(9, 1)
    expect(scan.busy.value).toBe(false)
  })
  it('right-clicks the selected rows to confirm bulk scanning without a selection control', async () => {
    const { wrapper, selection } = harness({}, true)
    await flushPromises()
    const rows = wrapper.findAll('[data-testid="selectable-row"]')
    await rows[0].trigger('click')
    await rows[2].trigger('click', { shiftKey: true })
    expect(selection.selectedItems.value).toHaveLength(3)
    expect(wrapper.text()).not.toContain('Выбрать все на странице')
    expect(wrapper.text()).not.toContain('Снять выделение')
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    await rows[1].trigger('contextmenu')
    await flushPromises()
    expect(confirm).toHaveBeenCalledOnce()
    expect(confirm.mock.calls[0][0].contentComponentProps.count).toBe(3)
    expect(api.scanParcel.mock.calls).toEqual([[7, 1], [7, 2], [7, 3]])
    expect(selection.selectedItems.value).toEqual([])
  })})
