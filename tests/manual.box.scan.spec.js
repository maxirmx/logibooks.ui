import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed, defineComponent, reactive, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VDataTable, VDataTableFooter, VDefaultsProvider, VList, VListItem, VMenu } from 'vuetify/components'
import BoxesList from '@/lists/Boxes_List.vue'
import BoxesMonitor from '@/dialogs/Scanjob_Boxes_Monitor.vue'
import BoxScanAction from '@/components/BoxScanAction.vue'
import BoxScanConfirmationContent from '@/components/BoxScanConfirmationContent.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useManualBoxScan } from '@/composables/useManualBoxScan.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { boxScanId, boxScanSuccessMessage } from '@/helpers/manual.scan.helpers.js'
import { scanSelectionMessage } from '@/helpers/manual.scan.messages.js'
import { vuetifyStubs } from './helpers/test-utils.js'

const { api, confirm, getBoxes, getRegister, push } = vi.hoisted(() => ({
  api: { ops: {}, ensureOpsLoaded: vi.fn(), scanBox: vi.fn(), scanBoxes: vi.fn(), getInProgress: vi.fn(), createScanJobsListChannel: vi.fn() },
  confirm: vi.fn(), getBoxes: vi.fn(), getRegister: vi.fn(), push: vi.fn()
}))
const rows = ref([])
const register = ref({})
const loading = ref(false)
const downloadSelectedStickers = vi.fn()
const downloadRegisterStickers = vi.fn()
const boxesStore = reactive({ boxes: rows, loading, getAll: getBoxes, downloadSelectedStickers, downloadRegisterStickers })
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
  plugins: [createVuetify({ components: { VDataTable, VDataTableFooter, VDefaultsProvider, VList, VListItem, VMenu } })],
  stubs: {
    ...vuetifyStubs,
    'v-data-table': false,
    'v-btn': false,
    'v-list': false,
    'v-list-item': false,
    'v-overlay': false,
    // Printer discovery has its own tests; scan selection uses no local hardware.
    LocalLabelPrinting: true
  }
})
function harness({ monitor = false, candidate = job, options = {}, actions = false, readOnly = false } = {}) {
  let scan
  const opts = { registerId: ref(1), job: monitor ? ref(candidate) : null,
    refresh: vi.fn().mockResolvedValue(true), scopeKey: ref('boxes'), ...options }
  const snapshot = ref({ scanJobId: 7 })
  const wrapper = mount(defineComponent({
    components: { BoxesMonitor, BoxScanAction, PageAlertRegion },
    setup() {
      scan = useManualBoxScan(opts)
      return { rows, snapshot, actions, readOnly, busy: computed(() => scan.busy.value) }
    },
    template: '<div><PageAlertRegion/><BoxScanAction v-if="actions" :boxes="rows"/><BoxesMonitor v-else :register-id="1" :snapshot="snapshot" :boxes="rows" :loading="busy" :read-only="readOnly"/></div>'
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
  vi.stubGlobal('visualViewport', null)
  document.elementsFromPoint = () => [document.body]
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
  downloadSelectedStickers.mockResolvedValue(true)
  downloadRegisterStickers.mockResolvedValue(true)
  confirm.mockReset().mockResolvedValue(true)
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  delete document.elementsFromPoint
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('manual box adapters', () => {
  it.each([
    [null, null]
  ])('normalizes only physical box identities: %j', (row, id) => expect(boxScanId(row)).toBe(id))
  it.each([
    [1, 'Выбрана 1 коробка']
  ])('reuses confirmation with Russian box counts', (count, message) => {
    expect(scanSelectionMessage(count, 'box')).toBe(message)
    const wrapper = mount(BoxScanConfirmationContent, { props: { count, jobs: [{ id: 7, label: job.name }], choice: { jobId: 7 } } })
    expect(wrapper.get('p').text()).toBe(message)
    expect(wrapper.get('#box-scan-job').text()).toBe(job.name)
    wrapper.unmount()
  })
  it.each([
    [{ completed: 1, empty: 0, lookup: true, matched: 0 }, 'В коробке нет посылок, соответствующих условиям поиска'],
    [{ completed: 3, empty: 1, lookup: true, matched: 1, matchedParcels: 2 }, 'Отсканировано коробок: 2. Содержат посылки, соответствующие условиям поиска: 1. Найдено посылок: 2. Пустых коробок: 1.']
  ])('describes the returned result: %j', (result, message) => expect(boxScanSuccessMessage(result)).toBe(message))
})

describe('manual box workflow', () => {
  it.each([
    [[{ ...job, type: 10 }, job], false, false]
  ])('applies compatible-job 0/1/n actions', async (jobs, menu, disabled) => {
    api.getInProgress.mockResolvedValue(jobs)
    const { wrapper } = harness({ actions: true })
    await flushPromises()
    expect(wrapper.findComponent(ActionButton2L).exists()).toBe(menu)
    const button = wrapper.get('[data-testid^="manual-box-scan"]')
    expect(button.element.disabled).toBe(disabled)
    if (menu) expect(wrapper.findComponent(ActionButton2L).props('options').map(option => option.label)).toEqual([job.name, job.name])
  })
  it('keeps scanning unavailable when Core has not supplied the parcel-only type', async () => {
    delete api.ops.constants.parcelOnlyType
    const { wrapper } = harness({ actions: true })
    await flushPromises()
    expect(wrapper.get('[data-testid="manual-box-scan"]').element.disabled).toBe(true)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить параметры сканирования')
  })
  it.each([
    [2, 1, 'info', 'В коробке есть посылки, соответствующие условиям поиска: 2'],
    [0, 0, 'warning', 'В коробке нет посылок']
  ])('presents fulfilled Lookup outcomes inline (count %s, boxes %s)', async (count, boxCount, tone, message) => {
    api.scanBox.mockResolvedValueOnce({ count, boxCount })
    const { wrapper, scan, opts } = harness({ monitor: true, candidate: { ...job, operation: 30 } })
    await flushPromises()
    expect(await scan.run([boxes[0]], 7)).toBe(true)
    const region = wrapper.get('[data-testid="page-alert-region"]')
    expect(region.get('[role="status"]').text()).toContain(message)
    expect(region.get('[role="status"]').classes()).toContain(`alert-${tone}`)
    expect(region.classes()).toEqual(['page-alert-region'])
    expect(opts.refresh).toHaveBeenCalledOnce()
    expect(api.scanBox).toHaveBeenCalledWith(7, 1)
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
})

describe.each(['party', 'monitor'])('box selection in %s', location => {
  function render() { return location === 'party' ? renderList() : harness({ monitor: true }).wrapper }
  function action(name) {
    return document.body.querySelector(`[data-testid="${name}"]`)
  }

  it('highlights rows selected by Ctrl-click and Shift-click with the shared table styles', async () => {
    const style = document.createElement('style')
    const mainStyles = readFileSync(resolve(import.meta.dirname, '../src/assets/main.css'), 'utf8')
    style.textContent = mainStyles.replace(/^@import .+;\r?\n/gm, '')
    document.head.append(style)
    try {
      const wrapper = render()
      await flushPromises()
      const [first, middle, last] = wrapper.findAll('tbody tr').map(row => row.get('td:nth-child(2)'))
      const background = cell => window.getComputedStyle(cell.element).backgroundColor
      const selectedColor = 'var(--parcel-row-selected-bg)'

      await first.trigger('click')
      await last.trigger('click', { ctrlKey: true })
      expect([first, middle, last].map(background)).toEqual([selectedColor, 'rgba(0, 0, 0, 0)', selectedColor])

      await first.trigger('click')
      await last.trigger('click', { shiftKey: true })
      expect([first, middle, last].map(background)).toEqual([selectedColor, selectedColor, selectedColor])
    } finally {
      style.remove()
    }
  })

  it('does not scan when confirmation is cancelled', async () => {
    confirm.mockResolvedValueOnce(false)
    const wrapper = render()
    await flushPromises()
    await wrapper.findAll('tbody tr')[0].trigger('contextmenu')
    await flushPromises()
    action('selected-boxes-scan').click()
    await flushPromises()
    expect(api.scanBoxes).not.toHaveBeenCalled()
  })

  it('exports the selected boxes, preserves selection on failure, and retries by keyboard', async () => {
    const getClientRects = HTMLElement.prototype.getClientRects
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function () {
      return this.matches('[role="menuitem"]') ? [this.getBoundingClientRect()] : getClientRects.call(this)
    })
    downloadSelectedStickers.mockRejectedValueOnce(new Error('У коробки отсутствует код стикера'))
    const wrapper = render()
    await flushPromises()
    const [first, second, third] = wrapper.findAll('tbody tr')
    await first.trigger('click')
    await second.trigger('click', { ctrlKey: true })
    await first.trigger('contextmenu', { clientX: 45, clientY: 72 })
    await flushPromises()
    action('selected-boxes-export-stickers').click()
    await flushPromises()
    expect(downloadSelectedStickers).toHaveBeenCalledExactlyOnceWith(1, [3, 2])
    expect(wrapper.get('[role="alert"]').text()).toContain('У коробки отсутствует код стикера')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.findAll('.selected-parcel-row')).toHaveLength(2)

    first.element.focus()
    await first.trigger('keydown', { shiftKey: true, key: 'F10' })
    await vi.waitFor(() => expect(document.activeElement).toBe(action('selected-boxes-export-stickers')))
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(document.activeElement).toBe(first.element)
    expect(first.attributes('aria-haspopup')).toBe('menu')
    await first.trigger('keydown', { key: 'ContextMenu' })
    await vi.waitFor(() => expect(document.activeElement).toBe(action('selected-boxes-export-stickers')))
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()
    expect(downloadSelectedStickers).toHaveBeenNthCalledWith(2, 1, [3, 2])

    await third.trigger('contextmenu')
    await flushPromises()
    action('selected-boxes-export-stickers').click()
    await flushPromises()
    expect(downloadSelectedStickers).toHaveBeenNthCalledWith(3, 1, [1])
    expect(api.scanBox).not.toHaveBeenCalled()
  })

  it('keeps direct context-menu scanning for operators without CSV permission', async () => {
    useAuthStore().user = { id: 1, roles: ['wh-operator'] }
    api.scanBoxes.mockResolvedValueOnce({ completed: [{ id: 3, boxCount: 1 }], skippedIds: [] })
    const wrapper = render()
    await flushPromises()
    const first = wrapper.findAll('tbody tr')[0]
    expect(first.attributes('tabindex')).toBeUndefined()
    await first.trigger('contextmenu')
    await flushPromises()
    expect(action('selected-boxes-export-stickers')).toBeNull()
    expect(api.scanBoxes).toHaveBeenCalledExactlyOnceWith(7, [3])
  })

})

it('exports the entire party with a filter active and allows retry after one visible failure', async () => {
  useAuthStore().boxes_search = 'BOX-1'
  downloadRegisterStickers.mockRejectedValueOnce(new Error('В партии нет коробок для выгрузки'))
  const wrapper = renderList()
  await flushPromises()
  expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  const button = wrapper.get('[data-testid="register-export-stickers"]')
  const headerButtons = [...button.element.closest('.header-actions-group').querySelectorAll('button')]
  expect(headerButtons.at(-2)).toBe(button.element)
  await button.trigger('click')
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('В партии нет коробок для выгрузки')
  expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
  await button.trigger('click')
  await flushPromises()
  expect(downloadRegisterStickers.mock.calls).toEqual([[1], [1]])
  expect(useAuthStore().boxes_search).toBe('BOX-1')
})
