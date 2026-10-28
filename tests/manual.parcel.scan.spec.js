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
import { parcelScanDisabledReason, parcelScanSuccessMessage } from '@/helpers/parcel.scan.helpers.js'
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
})
