import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed, defineComponent, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VDataTable } from 'vuetify/components'
import ScanjobParcelsMonitorTable from '@/dialogs/Scanjob_Parcels_Monitor_Table.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useManualParcelScan } from '@/composables/useManualParcelScan.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { vuetifyStubs } from './helpers/test-utils.js'

const { scanParcel, getById, confirm } = vi.hoisted(() => ({ scanParcel: vi.fn(), getById: vi.fn(), confirm: vi.fn() }))
vi.mock('@/stores/scanjobs.store.js', () => ({ useScanjobsStore: () => ({ ops: { constants: { inProgressStatus: 15, boxOnlyType: 20, parcelScanSource: 10 } }, scanParcel, getById, ensureOpsLoaded: vi.fn().mockResolvedValue(true), getScanJobLabel: job => `#${job.id}` }) }))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => confirm }))
const job = { id: 7, registerId: 1, status: 15, type: 30, operation: 10 }
const rows = [
  { parcelId: 1, parcelNumber: 'A' }, { parcelId: 2, parcelNumber: 'B' },
  { parcelId: 3, parcelNumber: 'C' }, { parcelId: 4, parcelNumber: 'D' },
  { parcelId: 5, parcelNumber: 'E', isInRegister: false }
]
let wrapper, scan, focused, scope, snapshotRows
function render() {
  wrapper = mount(defineComponent({
    components: { ScanjobParcelsMonitorTable, PageAlertRegion },
    setup() {
      focused = ref(null)
      scope = ref('box-1')
      snapshotRows = ref([...rows])
      scan = useManualParcelScan({ registerId: ref(1), job: ref(job), scopeKey: scope, refresh: vi.fn().mockResolvedValue(true) })
      return { rows: snapshotRows, focused, headers: [
        { key: 'actions', title: '' }, { key: 'parcelNumber', title: 'Посылка' }
      ], disabled: computed(() => scan.busy.value) }
    },
    template: '<div><PageAlertRegion/><ScanjobParcelsMonitorTable :headers="headers" :parcels="rows" :selected-parcel-id="focused" :defect-action-loading="disabled"/></div>'
  }), { attachTo: document.body, global: {
    plugins: [createVuetify({ components: { VDataTable } })],
    stubs: { ...vuetifyStubs, 'v-data-table': false, 'v-btn': false }
  } })
  return wrapper
}
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  setActivePinia(createPinia())
  vi.resetAllMocks()
  const auth = useAuthStore()
  auth.user = { id: 1, roles: ['administrator'] }
  auth.scanjobmonitor_parcels_per_page = 2
  auth.scanjobmonitor_parcels_page = 1
  auth.scanjobmonitor_parcels_sort_by = [{ key: 'parcelNumber', order: 'desc' }]
  scanParcel.mockResolvedValue({ parcelCount: 1, scanSource: 10 })
  getById.mockResolvedValue(job)
  confirm.mockResolvedValue(true)
})
afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals() })

describe('monitor manual selection with the real Vuetify table', () => {
  it('right-clicks a multi-selection and disables row and footer actions until scanning completes', async () => {
    let accept, finish
    confirm.mockImplementationOnce(() => new Promise(resolve => { accept = resolve }))
    scanParcel.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    useAuthStore().scanjobmonitor_parcels_per_page = 10
    render()
    await flushPromises()
    const table = wrapper.findComponent(ScanjobParcelsMonitorTable)
    const visibleRows = wrapper.findAll('tbody tr')
    await visibleRows[1].trigger('click')
    await visibleRows[2].trigger('click', { ctrlKey: true })
    await visibleRows[1].trigger('contextmenu')
    await flushPromises()
    expect(table.vm.selection.selectedItems.value.map(row => row.parcelId).sort()).toEqual([3, 4])
    expect(confirm.mock.calls[0][0].content).toContain('Количество: 2')
    expect(scan.busy.value).toBe(false)
    expect(wrapper.find('[data-testid="parcel-scan-selection"]').exists()).toBe(false)
    expect(scanParcel).not.toHaveBeenCalled()
    accept(true)
    await flushPromises()
    expect(scan.busy.value).toBe(true)
    expect(wrapper.findAll('[data-testid="manual-parcel-scan"]').every(button => button.element.disabled)).toBe(true)
    expect(wrapper.findAll('.v-data-table-footer button').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.v-data-table-footer button').every(button => button.element.disabled)).toBe(true)
    finish({ parcelCount: 1, scanSource: 10 })
    await flushPromises()
    expect(scanParcel.mock.calls).toEqual([[7, 4], [7, 3]])
    expect(scan.busy.value).toBe(false)
    expect(table.vm.selection.selectedItems.value).toEqual([])
  })
  it('uses the actual sorted page, excludes unregistered rows, and keeps follow focus separate', async () => {
    render()
    await flushPromises()
    const table = wrapper.findComponent(ScanjobParcelsMonitorTable)
    const visibleRows = wrapper.findAll('tbody tr')
    expect(visibleRows.map(row => row.text())).toEqual(expect.arrayContaining([expect.stringContaining('E'), expect.stringContaining('D')]))
    await visibleRows[1].trigger('click', { ctrlKey: true })
    expect(table.vm.selection.selectedItems.value.map(row => row.parcelId)).toEqual([4])
    await visibleRows[0].trigger('click', { ctrlKey: true })
    expect(table.vm.selection.selectedItems.value.map(row => row.parcelId)).toEqual([4])
    focused.value = 3
    await flushPromises()
    expect(wrapper.find('.monitor-followed-parcel-row').text()).toContain('C')
    expect(table.vm.selection.selectedItems.value).toEqual([])
    table.vm.selection.selectAllCurrentPage()
    expect(table.vm.selection.selectedItems.value.map(row => row.parcelId)).toEqual([3, 2])
    await scan.run(table.vm.selection.selectedItems.value, 7, true)
    await nextTick()
    expect(scanParcel.mock.calls).toEqual([[7, 3], [7, 2]])
    expect(table.vm.selection.selectedItems.value).toEqual([])
  })
  it.each(['update:page', 'update:itemsPerPage', 'update:sortBy'])('invalidates pending batches on %s but not automatic follow movement', async event => {
    render()
    await flushPromises()
    scanParcel.mockRejectedValueOnce(Object.assign(new Error('Scan failed'), { status: 400 }))
    await scan.run([rows[3]], 7, true)
    expect(scan.pendingBatch.value.parcels).toHaveLength(1)
    focused.value = 3
    await flushPromises()
    expect(scan.pendingBatch.value.parcels).toHaveLength(1)
    const table = wrapper.findComponent(VDataTable)
    table.vm.$emit(event, event === 'update:sortBy' ? [] : 1)
    await flushPromises()
    expect(scan.pendingBatch.value).toBeNull()
  })
  it('retains unfinished IDs when a smaller snapshot automatically clamps the last page', async () => {
    useAuthStore().scanjobmonitor_parcels_page = 3
    render()
    await flushPromises()
    expect(useAuthStore().scanjobmonitor_parcels_page).toBe(3)
    scanParcel.mockRejectedValueOnce(Object.assign(new Error('Scan failed'), { status: 400 }))
    await scan.run([rows[0]], 7, true)
    snapshotRows.value = rows.slice(0, 2)
    await flushPromises()
    expect(useAuthStore().scanjobmonitor_parcels_page).toBe(1)
    expect(scan.pendingBatch.value.parcels.map(row => row.parcelId)).toEqual([1])
  })
})
