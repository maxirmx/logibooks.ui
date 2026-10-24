import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed, defineComponent, reactive, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VDataTable, VDataTableFooter, VDefaultsProvider } from 'vuetify/components'
import BoxesList from '@/lists/Boxes_List.vue'
import BoxesMonitor from '@/dialogs/Scanjob_Boxes_Monitor.vue'
import BoxScanAction from '@/components/BoxScanAction.vue'
import BoxScanConfirmationContent from '@/components/BoxScanConfirmationContent.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useManualBoxScan } from '@/composables/useManualBoxScan.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { boxScanId, boxScanDisabledReason, boxScanSuccessMessage } from '@/helpers/manual.scan.helpers.js'
import { scanSelectionMessage } from '@/helpers/manual.scan.messages.js'
import { vuetifyStubs } from './helpers/test-utils.js'

const { api, confirm, getBoxes, getRegister, push } = vi.hoisted(() => ({
  api: { ops: {}, ensureOpsLoaded: vi.fn(), scanBox: vi.fn(), getInProgress: vi.fn(), createScanJobsListChannel: vi.fn() },
  confirm: vi.fn(), getBoxes: vi.fn(), getRegister: vi.fn(), push: vi.fn()
}))
const rows = ref([])
const register = ref({})
const loading = ref(false)
const boxesStore = reactive({ boxes: rows, loading, getAll: getBoxes })
const registersStore = reactive({ item: register, loading: ref(false), getById: getRegister,
  ensureOpsLoaded: vi.fn().mockResolvedValue(true), getTransportationDocument: () => 'AWB' })
vi.mock('@/stores/scanjobs.store.js', () => ({ useScanjobsStore: () => api }))
vi.mock('@/stores/boxes.store.js', () => ({ useBoxesStore: () => boxesStore }))
vi.mock('@/stores/registers.store.js', () => ({ useRegistersStore: () => registersStore }))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => confirm }))
vi.mock('@/router', () => ({ default: { push } }))

const job = { id: 7, name: 'Поиск коробок', registerId: 1, status: 15, type: 30, operation: 10 }
const boxes = [1, 2, 3].map(id => ({ id, code: `BOX-${id}` }))
const wrappers = []
const globals = () => ({
  plugins: [createVuetify({ components: { VDataTable, VDataTableFooter, VDefaultsProvider } })],
  stubs: { ...vuetifyStubs, 'v-data-table': false, 'v-btn': false }
})
function harness({ monitor = false, candidate = job, options = {}, actions = false } = {}) {
  let scan
  const opts = { registerId: ref(1), job: monitor ? ref(candidate) : null,
    refresh: vi.fn().mockResolvedValue(true), scopeKey: ref('boxes'), ...options }
  const snapshot = ref({ scanJobId: 7 })
  const wrapper = mount(defineComponent({
    components: { BoxesMonitor, BoxScanAction, PageAlertRegion },
    setup() {
      scan = useManualBoxScan(opts)
      return { rows, snapshot, actions, busy: computed(() => scan.busy.value) }
    },
    template: '<div><PageAlertRegion/><BoxScanAction v-if="actions" :boxes="rows"/><BoxesMonitor v-else :snapshot="snapshot" :boxes="rows" :loading="busy"/></div>'
  }), { attachTo: document.body, global: globals() })
  wrappers.push(wrapper)
  return { wrapper, scan, opts, snapshot }
}
function renderList() {
  const wrapper = mount(BoxesList, { props: { registerId: 1 }, attachTo: document.body, global: globals() })
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.clearAllMocks()
  setActivePinia(createPinia())
  const auth = useAuthStore()
  auth.user = { id: 1, roles: ['administrator'] }
  auth.boxes_page = auth.scanjobmonitor_boxes_page = 1
  auth.boxes_per_page = auth.scanjobmonitor_boxes_per_page = 10
  auth.boxes_sort_by = [{ key: 'code', order: 'desc' }]
  auth.scanjobmonitor_boxes_sort_by = [{ key: 'boxCode', order: 'desc' }]
  auth.boxes_search = ''
  rows.value = boxes.map(box => ({ ...box, boxId: box.id, boxCode: box.code, area: 1 }))
  register.value = { id: 1, dealNumber: 'TEST', companyId: 2 }
  loading.value = false
  api.ops = reactive({ constants: { inProgressStatus: 15, parcelOnlyType: 10, lookupOperation: 30 } })
  api.ensureOpsLoaded.mockResolvedValue(true)
  api.getInProgress.mockResolvedValue([job])
  api.createScanJobsListChannel.mockReturnValue({ start: vi.fn().mockResolvedValue(true), stop: vi.fn().mockResolvedValue(true) })
  api.scanBox.mockResolvedValue({ count: 2, boxCount: 1, parcelCount: 2 })
  getBoxes.mockResolvedValue(true)
  getRegister.mockResolvedValue(register.value)
  confirm.mockResolvedValue(true)
})
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.unstubAllGlobals() })

describe('manual box adapters', () => {
  it.each([[null, null], [{ id: 0 }, null], [{ id: 1.5 }, null], [{ id: '2' }, 2],
    [{ boxId: 7, id: 2, area: 1 }, 7], [{ area: 2, boxId: null, bucketIndex: 0 }, null], [{ area: 3, id: 1 }, null]])('normalizes only physical box identities: %j', (row, id) => expect(boxScanId(row)).toBe(id))
  it.each([[null, 'Нет активного задания сканирования'], [{ ...job, status: 18 }, 'Нет активного задания сканирования'],
    [{ ...job, type: 10 }, 'Задание поддерживает только сканирование посылок'], [job, '']])('filters compatible jobs: %j', (candidate, reason) => {
    expect(boxScanDisabledReason(candidate, api.ops.constants)).toBe(reason)
  })
  it('requires Core definitions', () => expect(boxScanDisabledReason(job)).toBe('Нет активного задания сканирования'))
  it.each([[1, 'Выбрана 1 коробка'], [2, 'Выбрано 2 коробки'], [5, 'Выбрано 5 коробок'], [11, 'Выбрано 11 коробок'], [21, 'Выбрана 21 коробка']])('reuses confirmation with Russian box counts', (count, message) => {
    expect(scanSelectionMessage(count, 'box')).toBe(message)
    const wrapper = mount(BoxScanConfirmationContent, { props: { count, jobs: [{ id: 7, label: job.name }], choice: { jobId: 7 } } })
    expect(wrapper.get('p').text()).toBe(message)
    expect(wrapper.get('#box-scan-job').text()).toBe(job.name)
    wrapper.unmount()
  })
  it.each([
    [{ completed: 1, empty: 1 }, 'В коробке нет посылок'],
    [{ completed: 1, empty: 0, lookup: true, matched: 0 }, 'В коробке нет посылок, соответствующих условиям поиска'],
    [{ completed: 1, empty: 0, lookup: true, matched: 1, matchedParcels: 2 }, 'В коробке есть посылки, соответствующие условиям поиска: 2'],
    [{ completed: 3, empty: 0, lookup: false }, 'Отсканировано коробок: 3.'],
    [{ completed: 3, empty: 1, lookup: true, matched: 1, matchedParcels: 2 }, 'Отсканировано коробок: 2. Содержат посылки, соответствующие условиям поиска: 1. Найдено посылок: 2. Пустых коробок: 1.']
  ])('describes the returned result: %j', (result, message) => expect(boxScanSuccessMessage(result)).toBe(message))
})

describe('manual box workflow', () => {
  it.each([[[], false, true], [[job], false, false], [[job, { ...job, id: 8 }], true, false],
    [[{ ...job, type: 10 }, job], false, false]])('applies compatible-job 0/1/n actions', async (jobs, menu, disabled) => {
    api.getInProgress.mockResolvedValue(jobs)
    const { wrapper } = harness({ actions: true })
    await flushPromises()
    expect(wrapper.findComponent(ActionButton2L).exists()).toBe(menu)
    const button = wrapper.get('[data-testid^="manual-box-scan"]')
    expect(button.element.disabled).toBe(disabled)
    if (menu) expect(wrapper.findComponent(ActionButton2L).props('options').map(option => option.label)).toEqual([job.name, job.name])
  })
  it('hides actions without warehouse permission', async () => {
    useAuthStore().user = { id: 1, roles: ['logist'] }
    const { wrapper } = harness({ actions: true })
    await flushPromises()
    expect(wrapper.find('[data-testid^="manual-box-scan"]').exists()).toBe(false)
  })
  it('keeps scanning unavailable when Core has not supplied the parcel-only type', async () => {
    delete api.ops.constants.parcelOnlyType
    const { wrapper } = harness({ actions: true })
    await flushPromises()
    expect(wrapper.get('[data-testid="manual-box-scan"]').element.disabled).toBe(true)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить параметры сканирования')
  })
  it.each([[0, 1, 'success', 'В коробке нет посылок, соответствующих условиям поиска'],
    [2, 1, 'info', 'В коробке есть посылки, соответствующие условиям поиска: 2'],
    [0, 0, 'warning', 'В коробке нет посылок']])('presents fulfilled Lookup outcomes (count %s, boxes %s)', async (count, boxCount, type, message) => {
    api.scanBox.mockResolvedValueOnce({ count, boxCount })
    const { wrapper, scan } = harness({ monitor: true, candidate: { ...job, operation: 30 } })
    await flushPromises()
    expect(await scan.run([boxes[0]], 7)).toBe(true)
    expect(useAlertStore().alert.severity).toBe(type)
    expect(wrapper.get('.page-alert-region__message').text()).toContain(message)
    expect(api.scanBox).toHaveBeenCalledWith(7, 1)
  })
  it('preserves unfinished selection and reports a rejected request exactly once', async () => {
    api.scanBox.mockResolvedValueOnce({ boxCount: 1 }).mockRejectedValueOnce(Object.assign(new Error('Изменения запрещены'), { status: 409 }))
    const { wrapper, scan } = harness({ monitor: true })
    await flushPromises()
    const table = wrapper.findComponent(BoxesMonitor)
    const visible = wrapper.findAll('tbody tr')
    await visible[0].trigger('click')
    await visible[1].trigger('click', { ctrlKey: true })
    await visible[0].trigger('contextmenu')
    await flushPromises()
    expect(api.scanBox.mock.calls).toEqual([[7, 3], [7, 2]])
    expect(table.vm.selection.selectedItems.value.map(row => row.boxId)).toEqual([2])
    expect(scan.pendingBatch.value.parcels.map(row => row.boxId)).toEqual([2])
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('на коробке #2')
    expect(wrapper.get('[role="alert"]').text()).toContain('Изменения запрещены')
  })
  it('retains the uncertain-outcome lock after changing scope', async () => {
    api.scanBox.mockRejectedValueOnce(new Error('Connection closed'))
    const { scan, wrapper, opts } = harness({ monitor: true })
    await flushPromises()
    await scan.run([boxes[0]], 7)
    opts.scopeKey.value = 'other'
    await flushPromises()
    expect(scan.disabled.value).toBe(true)
    expect(await scan.run([boxes[0]], 7)).toBe(false)
    expect(api.scanBox).toHaveBeenCalledOnce()
    expect(wrapper.get('[role="alert"]').text()).not.toContain('Connection closed')
    expect(wrapper.get('[role="alert"]').text()).toContain('проверьте коробку')
  })
  it('keeps refresh errors visible after a committed scan', async () => {
    const { scan, wrapper } = harness({ monitor: true, options: { refresh: vi.fn().mockRejectedValue(new Error('Refresh failed')) } })
    await flushPromises()
    await scan.run([boxes[0]], 7)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось обновить данные после сканирования')
  })
})

describe.each(['party', 'monitor'])('box selection in %s', location => {
  function render() { return location === 'party' ? renderList() : harness({ monitor: true }).wrapper }
  it('scans a single row directly', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.findAll('[data-testid="manual-box-scan"]')[0].trigger('click')
    await flushPromises()
    expect(api.scanBox).toHaveBeenCalledWith(7, 3)
    expect(confirm).not.toHaveBeenCalled()
  })
  it('limits selection and the scan target to the current sorted page', async () => {
    const auth = useAuthStore()
    auth.boxes_per_page = auth.scanjobmonitor_boxes_per_page = 2
    const wrapper = render()
    await flushPromises()
    await wrapper.findAll('tbody tr')[0].trigger('click')
    if (location === 'party') auth.boxes_page = 2
    else auth.scanjobmonitor_boxes_page = 2
    await flushPromises()
    expect(wrapper.findAll('.selected-parcel-row')).toHaveLength(0)
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    await wrapper.findAll('tbody tr')[0].trigger('contextmenu')
    await flushPromises()
    expect(api.scanBox.mock.calls).toEqual([[7, 1]])
    expect(confirm.mock.calls[0][0].contentComponentProps.count).toBe(1)
  })
  it('uses sorted page selection, confirmation and disables controls until completion', async () => {
    let accept, finish
    confirm.mockImplementationOnce(() => new Promise(resolve => { accept = resolve }))
    api.scanBox.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const wrapper = render()
    await flushPromises()
    const visible = wrapper.findAll('tbody tr')
    await visible[0].trigger('click')
    await visible[1].trigger('click', { shiftKey: true })
    await visible[0].trigger('contextmenu')
    await flushPromises()
    expect(confirm.mock.calls[0][0].title).toBe('Сканирование коробок')
    expect(confirm.mock.calls[0][0].contentComponentProps.count).toBe(2)
    expect(api.scanBox).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-testid="manual-box-scan"]').every(button => button.element.disabled)).toBe(true)
    accept(true)
    await flushPromises()
    if (location === 'party') expect(wrapper.find('.spinner-border').exists()).toBe(true)
    expect(wrapper.findAll('.v-data-table-footer button').every(button => button.element.disabled)).toBe(true)
    finish({ boxCount: 1 })
    await flushPromises()
    expect(api.scanBox.mock.calls).toEqual([[7, 3], [7, 2]])
    expect(wrapper.findAll('.selected-parcel-row')).toHaveLength(0)
  })
  it('does not scan when confirmation is cancelled', async () => {
    confirm.mockResolvedValueOnce(false)
    const wrapper = render()
    await flushPromises()
    await wrapper.findAll('tbody tr')[0].trigger('contextmenu')
    await flushPromises()
    expect(api.scanBox).not.toHaveBeenCalled()
  })
  it('clears selection when the sorted page or filters change', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.findAll('tbody tr')[0].trigger('click')
    const auth = useAuthStore()
    if (location === 'party') auth.boxes_search = 'BOX-1'
    else auth.scanjobmonitor_boxes_sort_by = [{ key: 'boxCode', order: 'asc' }]
    await flushPromises()
    expect(wrapper.findAll('.selected-parcel-row')).toHaveLength(0)
  })
})

it('excludes virtual monitor groups from selection and actions', async () => {
  rows.value = [{ area: 2, boxId: null, bucketIndex: 0, boxCode: 'Без коробки' }]
  const { wrapper } = harness({ monitor: true })
  await flushPromises()
  await wrapper.findAll('tbody tr')[0].trigger('contextmenu')
  expect(confirm).not.toHaveBeenCalled()
  expect(wrapper.find('[data-testid^="manual-box-scan"]').exists()).toBe(false)
})
