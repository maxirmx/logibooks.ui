/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount as mountComponent, flushPromises } from '@vue/test-utils'
import { ref, unref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import CustomsReportsList from '@/lists/CustomsReports_List.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

import { customsReportOps } from './helpers/customs-report-ops.fixture.js'

const reportsRef = ref([])
const loadingRef = ref(false)
const errorRef = ref(null)
const reportsTotalCountRef = ref(0)
const alertRef = ref(null)
const perPageRef = ref(10)
const sortByRef = ref([{ key: 'id', order: 'desc' }])
const pageRef = ref(1)
const searchRef = ref('')

const getReportsMock = vi.hoisted(() => vi.fn())
const uploadMock = vi.hoisted(() => vi.fn())
const removeMock = vi.hoisted(() => vi.fn())
const clearMock = vi.hoisted(() => vi.fn())
const alertErrorMock = vi.hoisted(() => vi.fn())

let customsReportsStoreMock
let alertStoreMock
let authStoreMock
const confirmMock = vi.hoisted(() => vi.fn())
const routerPushMock = vi.hoisted(() => vi.fn())

const testStubs = {
  ...defaultGlobalStubs,
  'font-awesome-icon': { template: '<i class="fa-icon-stub" />' },
  'v-btn': {
    inheritAttrs: false,
    emits: ['click'],
    template:
      '<button class="v-btn-stub" data-testid="v-btn" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot></slot></button>'
  },
  'v-data-table-server': {
    inheritAttrs: false,
    emits: [
      'update:itemsPerPage',
      'update:items-per-page',
      'update:page',
      'update:sortBy',
      'update:sort-by'
    ],
    props: [
      'items',
      'headers',
      'loading',
      'itemsPerPage',
      'itemsPerPageOptions',
      'page',
      'sortBy',
      'density',
      'class',
      'itemValue',
      'itemsLength'
    ],
    template: `
      <div class="v-data-table-stub" data-testid="v-data-table">
        <div v-for="(item, i) in items" :key="i" class="v-data-table-row">
          <template v-if="$slots.item">
            <slot name="item" :item="item" :columns="headers"></slot>
          </template>
          <template v-else>
            <div v-for="header in headers" :key="header.key" class="v-data-table-cell">
              <slot :name="'item.' + header.key" :item="item">
                {{ item[header.key] }}
              </slot>
            </div>
          </template>
        </div>
        <slot></slot>
      </div>
    `
  },
  ActionButton: {
    inheritAttrs: false,
    emits: ['click'],
    template:
      '<button class="action-button-stub" data-testid="action-button" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot></slot></button>'
  },
  PaginationFooter: {
    inheritAttrs: false,
    props: ['itemsPerPage', 'itemsPerPageOptions', 'page', 'pageOptions', 'totalCount', 'maxPage'],
    template: '<div class="pagination-footer-stub" data-testid="pagination-footer"></div>'
  },
  ActionDialog: {
    props: ['actionDialog'],
    template:
      '<div class="action-dialog-stub" :data-show="actionDialog?.show" :data-title="actionDialog?.title"></div>'
  }
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      const refs = {}
      Object.keys(store).forEach((key) => {
        const value = store[key]
        if (value && typeof value === 'object' && 'value' in value) {
          refs[key] = value
        }
      })
      return refs
    }
  }
})

vi.mock('@/stores/customs.reports.store.js', () => ({
  useCustomsReportsStore: () => customsReportsStoreMock
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStoreMock
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStoreMock
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('@/router', () => ({
  default: {
    push: routerPushMock
  }
}))

const mounted = new Set()

function mount(component, options) {
  const wrapper = mountComponent(component, options)
  mounted.add(wrapper)
  return wrapper
}

function dispose(wrapper) {
  mounted.delete(wrapper)
  wrapper.unmount()
}

describe('CustomsReports_List.vue', () => {
  afterEach(() => {
    for (const wrapper of mounted) dispose(wrapper)
  })

  beforeEach(() => {
    vi.resetAllMocks()
    getReportsMock.mockResolvedValue()
    reportsRef.value = []
    loadingRef.value = false
    errorRef.value = null
    reportsTotalCountRef.value = 0
    alertRef.value = null

    customsReportsStoreMock = {
      accountVersion: ref(0),
      ops: ref(customsReportOps),
      reportStage: report => customsReportOps.stages[report?.stage],
      reports: reportsRef,
      loading: loadingRef,
      error: errorRef,
      reportsTotalCount: reportsTotalCountRef,
      getReports: getReportsMock,
      upload: uploadMock,
      remove: removeMock
    }

    alertStoreMock = {
      alert: alertRef,
      clear: clearMock,
      error: alertErrorMock
    }

    authStoreMock = {}
    Object.defineProperties(authStoreMock, {
      uploadcustomsreports_per_page: {
        get: () => perPageRef.value,
        set: (val) => {
          perPageRef.value = val
        }
      },
      uploadcustomsreports_sort_by: {
        get: () => sortByRef.value,
        set: (val) => {
          sortByRef.value = val
        }
      },
      uploadcustomsreports_page: {
        get: () => pageRef.value,
        set: (val) => {
          pageRef.value = val
        }
      },
      uploadcustomsreports_search: {
        get: () => searchRef.value,
        set: (val) => {
          searchRef.value = val
        }
      }
    })
    authStoreMock.isSrLogistPlus = true
    authStoreMock.isShiftLeadPlus = true
  })

  it('renders report data with calculated fields', async () => {
    reportsRef.value = [
      {
        id: 1,
        success: true,
        stage: 'completed',
        fileName: 'report.xlsx',
        customsProcedure: 'IM',
        masterInvoice: 'INV-1',
        processedRows: 50,
        emptyRows: 1,
        errorInvalidTnVedRecords: 2,
        errorDecisionRecords: 3,
        errorProcedureMismatchRecords: 4,
        errorParcelNotFoundRecords: 5,
        errorAlreadyProcessedParcels: 6,
        releasedParcels: 7,
        releasedWithDutyParcels: 8,
        heldParcels: 9,
        updatedTnVedParcels: 10
      }
    ]
    reportsTotalCountRef.value = 1

    const wrapper = mount(CustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    const textFor = (key) => wrapper.find(`[data-column-key="${key}"]`).text()

    expect(textFor('id')).toBe('1')
    expect(textFor('fileName')).toBe('report.xlsx')
    expect(textFor('result')).toBe('Обработан')
    expect(textFor('customsProcedure')).toBe('IM')
    expect(textFor('masterInvoice')).toBe('INV-1')
    expect(textFor('processedRows')).toBe('50')
    expect(textFor('releasedParcels')).toBe('7')
    expect(textFor('releasedWithDutyParcels')).toBe('8')
    expect(textFor('heldParcels')).toBe('9')
    expect(textFor('updatedTnVedParcels')).toBe('10')
    expect(textFor('errorCount')).toContain('21')
    expect(textFor('errMsg')).toBe('')
    expect(wrapper.get('[data-testid="reports-upload-input"]').attributes('accept')).toBe('.xlsx,.rar')

    const actionsCell = wrapper.find('[data-column-key="actions"]')
    expect(actionsCell.find('[data-testid="reports-delete-button"]').exists()).toBe(true)
  })

  it.each([
    ['Unexpected database exception', 'Не удалось обработать отчёт о выпуске'],
    ['Обработка файла прервана. Загрузите файл отчёта повторно.', 'Обработка файла прервана. Загрузите файл отчёта повторно.']
  ])('presents the saved report failure in its cell for %s', async (errMsg, expected) => {
    reportsRef.value = [{ id: 1, stage: 'parseFailed', errMsg }]
    reportsTotalCountRef.value = 1
    const wrapper = mount(CustomsReportsList, { global: { stubs: testStubs } })
    await flushPromises()
    expect(wrapper.get('[data-column-key="errMsg"]').text()).toBe(expected)
    expect(reportsRef.value[0].errMsg).toBe(errMsg)
    expect(alertErrorMock).not.toHaveBeenCalled()
  })

  it('binds pagination and sorting to authStore', async () => {
    reportsRef.value = [
      {
        id: 5,
        success: true,
        fileName: 'report.xlsx'
      }
    ]
    reportsTotalCountRef.value = 1
    perPageRef.value = 50
    pageRef.value = 2
    sortByRef.value = [{ key: 'fileName', order: 'asc' }]

    const wrapper = mount(CustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    const dataTable = wrapper.findComponent('[data-testid="v-data-table"]')

    expect(unref(dataTable.props('itemsPerPage'))).toBe(50)
    expect(unref(dataTable.props('page'))).toBe(2)
    expect(unref(dataTable.props('sortBy'))).toEqual([{ key: 'fileName', order: 'asc' }])

    const updatedSort = [{ key: 'masterInvoice', order: 'desc' }]
    dataTable.vm.$emit('update:items-per-page', 25)
    dataTable.vm.$emit('update:itemsPerPage', 25)
    dataTable.vm.$emit('update:page', 3)
    dataTable.vm.$emit('update:sort-by', updatedSort)
    dataTable.vm.$emit('update:sortBy', updatedSort)

    await wrapper.vm.$nextTick()

    expect(perPageRef.value).toBe(25)
    expect(pageRef.value).toBe(3)
    expect(sortByRef.value).toEqual(updatedSort)
  })

  it('shows header upload button and triggers file input', async () => {
    const wrapper = mount(CustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()

    const headerActions = wrapper.find('.header-actions .action-button-stub')
    expect(headerActions.exists()).toBe(true)

    const input = wrapper.find('[data-testid="reports-upload-input"]')
    const clickSpy = vi.fn()
    Object.defineProperty(input.element, 'click', {
      value: clickSpy,
      writable: true
    })

    await headerActions.trigger('click')
    expect(clickSpy).toHaveBeenCalled()
  })

  it('opens the queued report after upload and leaves completion to status tracking', async () => {
    getReportsMock.mockResolvedValue()
    const wrapper = mount(CustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    let resolveUpload
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve
    })
    uploadMock.mockReturnValue(uploadPromise)

    const input = wrapper.find('[data-testid="reports-upload-input"]')
    const file = new File(['dummy'], 'report.xlsx', { type: 'application/vnd.ms-excel' })
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true
    })
    let assignedInputValue = null
    Object.defineProperty(input.element, 'value', {
      configurable: true,
      get() {
        return assignedInputValue ?? ''
      },
      set(v) {
        assignedInputValue = v
      }
    })

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    await input.trigger('change')
    await wrapper.vm.$nextTick()

    expect(uploadMock).toHaveBeenCalledWith(file)
    expect(wrapper.find('.action-dialog-stub').attributes('data-show')).toBe('true')

    resolveUpload({ id: 42, success: false, stage: 'pendingParse' })
    await flushPromises()

    const dispatchedEvent = dispatchSpy.mock.calls.find(
      (call) => call[0] instanceof globalThis.CustomEvent
    )
    expect(dispatchedEvent).toBeUndefined()
    expect(routerPushMock).toHaveBeenCalledWith({ path: '/customs-reports/42/rows', query: {} })
    dispatchSpy.mockRestore()
    expect(wrapper.find('.action-dialog-stub').attributes('data-show')).toBe('false')
    expect(assignedInputValue).toBe('')
    expect(alertErrorMock).not.toHaveBeenCalled()
  })

  it.each([
    [{ success: false, errMsg: 'Не удалось прочитать файл "report-ALPHA.xlsx"' }, 'Не удалось прочитать файл "report-ALPHA.xlsx"'],
    [{ id: 42, success: false, errMsg: 'Ошибка загрузки файла' }, 'Ошибка загрузки файла'],
    [{ success: false, errMsg: 'Unexpected database exception' }, 'Не удалось загрузить отчёт'],
    [{ success: true }, 'Не удалось загрузить отчёт'],
    [null, 'Не удалось загрузить отчёт'],
    [undefined, 'Не удалось загрузить отчёт']
  ])('keeps the list open for unsuccessful upload result %j and allows retry', async (result, expected) => {
    setActivePinia(createPinia())
    const { useAlertStore } = await vi.importActual('@/stores/alert.store.js')
    alertStoreMock = useAlertStore()
    const alert = vi.spyOn(alertStoreMock, 'error')
    reportsRef.value = [{ id: 7, stage: 'completed', fileName: 'saved.xlsx' }]
    reportsTotalCountRef.value = 1
    searchRef.value = 'MASTER-ALPHA'
    pageRef.value = 3
    const wrapper = mount(CustomsReportsList, { global: { stubs: testStubs } })
    await flushPromises()
    uploadMock.mockResolvedValueOnce(result).mockResolvedValueOnce({ id: 42, success: false, stage: 'pendingParse' })
    const input = wrapper.get('[data-testid="reports-upload-input"]')
    const file = new File(['dummy'], 'broken.xlsx')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })

    await input.trigger('change')
    await flushPromises()

    expect(routerPushMock).not.toHaveBeenCalled()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain(expected)
    expect(wrapper.text()).not.toContain('Unexpected database exception')
    expect(alert).toHaveBeenCalledOnce()
    expect(alert.mock.calls[0][0]).toMatchObject({ cause: result })
    expect(wrapper.get('[data-testid="report-id-link-7"]').exists()).toBe(true)
    expect(wrapper.get('.action-dialog-stub').attributes('data-show')).toBe('false')
    expect(searchRef.value).toBe('MASTER-ALPHA')
    expect(pageRef.value).toBe(3)

    await input.trigger('change')
    await flushPromises()

    expect(uploadMock).toHaveBeenCalledTimes(2)
    expect(uploadMock).toHaveBeenNthCalledWith(1, file)
    expect(uploadMock).toHaveBeenNthCalledWith(2, file)
    expect(routerPushMock).toHaveBeenCalledExactlyOnceWith({ path: '/customs-reports/42/rows', query: {} })
    expect(alert).toHaveBeenCalledOnce()
  })

  it('handles upload errors and clears the file input', async () => {
    setActivePinia(createPinia())
    const { useAlertStore } = await vi.importActual('@/stores/alert.store.js')
    alertStoreMock = useAlertStore()
    const alert = vi.spyOn(alertStoreMock, 'error')
    getReportsMock.mockResolvedValue()
    const wrapper = mount(CustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    uploadMock.mockRejectedValue(new Error('upload failed'))

    const input = wrapper.find('[data-testid="reports-upload-input"]')
    const file = new File(['dummy'], 'broken.xlsx', { type: 'application/vnd.ms-excel' })
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true
    })
    let assignedInputValue = null
    Object.defineProperty(input.element, 'value', {
      configurable: true,
      get() {
        return assignedInputValue ?? ''
      },
      set(v) {
        assignedInputValue = v
      }
    })

    await input.trigger('change')
    await flushPromises()

    expect(uploadMock).toHaveBeenCalledWith(file)
    expect(alert).toHaveBeenCalledExactlyOnceWith(new Error('upload failed'), { fallback: 'Не удалось загрузить отчёт' })
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось соединиться с сервером')
    expect(wrapper.text()).not.toContain('upload failed')
    expect(routerPushMock).not.toHaveBeenCalled()
    expect(wrapper.find('.action-dialog-stub').attributes('data-show')).toBe('false')
    expect(assignedInputValue).toBe('')
  })

  it.each(['success', 'failure'])('ignores a previous-account upload %s while the new upload is open', async outcome => {
    const previous = Promise.withResolvers()
    const current = Promise.withResolvers()
    uploadMock.mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise)
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const wrapper = mount(CustomsReportsList, { global: { stubs: testStubs } })
      const input = wrapper.get('[data-testid="reports-upload-input"]')
      const dialog = wrapper.get('.action-dialog-stub')
      const selectFile = async file => {
        Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
        await input.trigger('change')
      }

      const oldFile = new File(['old'], 'old.xlsx')
      await selectFile(oldFile)
      expect(dialog.attributes('data-show')).toBe('true')
      customsReportsStoreMock.accountVersion.value++
      await flushPromises()
      expect(dialog.attributes('data-show')).toBe('false')

      const currentFile = new File(['current'], 'current.xlsx')
      await selectFile(currentFile)
      if (outcome === 'success') {
        previous.resolve({ id: 51, stage: 'pendingParse' })
      } else {
        const failure = new Error('Previous upload failed')
        previous.reject(failure)
        await flushPromises()
        expect(diagnostic).toHaveBeenCalledWith('[customs report upload after disposal]', failure)
      }
      await flushPromises()
      expect(uploadMock.mock.calls).toEqual([[oldFile], [currentFile]])
      expect(routerPushMock).not.toHaveBeenCalled()
      expect(alertErrorMock).not.toHaveBeenCalled()
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(dialog.attributes('data-show')).toBe('true')

      current.resolve({ id: 52, stage: 'pendingParse' })
      await flushPromises()
      expect(routerPushMock).toHaveBeenCalledExactlyOnceWith({ path: '/customs-reports/52/rows', query: {} })
      expect(dialog.attributes('data-show')).toBe('false')
    } finally {
      diagnostic.mockRestore()
    }
  })

  it('shows alert when deleting report fails', async () => {
    setActivePinia(createPinia())
    const { useAlertStore } = await vi.importActual('@/stores/alert.store.js')
    alertStoreMock = useAlertStore()
    const alert = vi.spyOn(alertStoreMock, 'error')
    reportsRef.value = [
      {
        id: 11,
        success: false,
        fileName: 'bad'
      }
    ]
    reportsTotalCountRef.value = 1
    const failure = new Error('delete failed')
    removeMock.mockRejectedValueOnce(failure).mockResolvedValueOnce()
    confirmMock.mockResolvedValue(true)

    const wrapper = mount(CustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    const deleteButton = wrapper.find('[data-testid="reports-delete-button"]')
    await deleteButton.trigger('click')
    await flushPromises()

    expect(removeMock).toHaveBeenCalledWith(11)
    expect(alert).toHaveBeenCalledExactlyOnceWith(failure, { fallback: 'Не удалось удалить отчёт' })
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось удалить отчёт')
    expect(routerPushMock).not.toHaveBeenCalled()

    await deleteButton.trigger('click')
    await flushPromises()
    expect(removeMock.mock.calls).toEqual([[11], [11]])
    expect(alert).toHaveBeenCalledOnce()
  })

  it('does not call delete if confirmation is cancelled', async () => {
    reportsRef.value = [
      {
        id: 9,
        success: false,
        fileName: 'nope'
      }
    ]
    reportsTotalCountRef.value = 1
    confirmMock.mockResolvedValue(false)
    removeMock.mockResolvedValue()

    const wrapper = mount(CustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    const deleteButton = wrapper.find('[data-testid="reports-delete-button"]')
    await deleteButton.trigger('click')
    await flushPromises()

    expect(removeMock).not.toHaveBeenCalled()
  })

  it.each(['account change', 'unmount'])('ignores a late deletion confirmation after %s', async boundary => {
    const confirmation = Promise.withResolvers()
    confirmMock.mockReturnValueOnce(confirmation.promise)
    reportsRef.value = [{ id: 11, stage: 'completed' }]
    const wrapper = mount(CustomsReportsList, { global: { stubs: testStubs } })
    const deleteButton = wrapper.get('[data-testid="reports-delete-button"]')
    await deleteButton.trigger('click')
    expect(confirmMock).toHaveBeenCalledOnce()

    if (boundary === 'unmount') dispose(wrapper)
    else customsReportsStoreMock.accountVersion.value++
    confirmation.resolve(true)
    await flushPromises()

    expect(removeMock).not.toHaveBeenCalled()
    expect(alertErrorMock).not.toHaveBeenCalled()
  })

  it('keeps a current deletion active when the previous account’s deletion fails', async () => {
    const previous = Promise.withResolvers()
    const current = Promise.withResolvers()
    confirmMock.mockResolvedValue(true)
    removeMock.mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise)
    reportsRef.value = [{ id: 11, stage: 'completed' }]
    const wrapper = mount(CustomsReportsList, { global: { stubs: testStubs } })
    await wrapper.get('[data-testid="reports-delete-button"]').trigger('click')
    expect(removeMock).toHaveBeenCalledExactlyOnceWith(11)

    customsReportsStoreMock.accountVersion.value++
    reportsRef.value = [{ id: 20, stage: 'completed' }]
    await flushPromises()
    const deleteButton = wrapper.get('[data-testid="reports-delete-button"]')
    expect(deleteButton.element.disabled).toBe(false)
    await deleteButton.trigger('click')
    expect(removeMock.mock.calls).toEqual([[11], [20]])
    expect(deleteButton.element.disabled).toBe(true)

    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const failure = new Error('Previous delete failed')
      previous.reject(failure)
      await flushPromises()
      expect(diagnostic).toHaveBeenCalledWith('[customs report deletion after disposal]', failure)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(alertErrorMock).not.toHaveBeenCalled()
      expect(deleteButton.element.disabled).toBe(true)

      current.resolve()
      await flushPromises()
      expect(deleteButton.element.disabled).toBe(false)
    } finally {
      diagnostic.mockRestore()
    }
  })

  it('omits actions column when user lacks permissions', async () => {
    authStoreMock.isSrLogistPlus = false
    reportsRef.value = [
      {
        id: 3,
        success: true,
        fileName: 'file.xlsx'
      }
    ]
    reportsTotalCountRef.value = 1

    const wrapper = mount(CustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(wrapper.find('[data-column-key="actions"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="reports-delete-button"]').exists()).toBe(false)
  })

  it('shows active stages without offering deletion', async () => {
    reportsRef.value = [{ id: 7, stage: 'pendingApply' }]
    reportsTotalCountRef.value = 1
    const wrapper = mount(CustomsReportsList, { global: { stubs: testStubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('Решения ожидают применения')
    expect(wrapper.find('[data-testid="reports-delete-button"]').exists()).toBe(false)
    dispose(wrapper)
  })

  it('surfaces a background report refresh failure without clearing the committed list', async () => {
    vi.useFakeTimers()
    reportsRef.value = [{ id: 7, stage: 'pendingApply' }]
    reportsTotalCountRef.value = 1
    getReportsMock.mockResolvedValueOnce().mockRejectedValue(new Error('status failed'))
    const wrapper = mount(CustomsReportsList, { global: { stubs: testStubs } })
    try {
      await flushPromises()
      await vi.advanceTimersByTimeAsync(4000)
      expect(alertErrorMock).toHaveBeenCalledOnce()
      expect(alertErrorMock).toHaveBeenCalledWith(new Error('status failed'), { fallback: 'Не удалось получить состояние отчётов' })
      expect(wrapper.text()).toContain('Решения ожидают применения')
    } finally {
      dispose(wrapper)
      vi.useRealTimers()
    }
  })

  it('records a late list failure without presenting it after unmount', async () => {
    let rejectLoad
    getReportsMock.mockReturnValue(new Promise((_, reject) => { rejectLoad = reject }))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(CustomsReportsList, { global: { stubs: testStubs } })
    await flushPromises()
    dispose(wrapper)
    rejectLoad(new Error('late list failure'))
    await flushPromises()
    expect(consoleError).toHaveBeenCalledWith('[customs report list after disposal]', new Error('late list failure'))
    expect(alertErrorMock).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('navigates to rows view when report ID is clicked', async () => {
    reportsRef.value = [
      {
        id: 7,
        success: true,
        fileName: 'report.xlsx'
      }
    ]
    reportsTotalCountRef.value = 1

    const wrapper = mount(CustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    const idLink = wrapper.find('[data-testid="report-id-link-7"]')
    expect(idLink.exists()).toBe(true)

    await idLink.trigger('click')
    expect(routerPushMock).toHaveBeenCalledWith({ path: '/customs-reports/7/rows', query: {} })
  })

  it('reports string store error via alertStore on load', async () => {
    getReportsMock.mockRejectedValue('load reports failed')

    mount(CustomsReportsList, {
      global: { stubs: testStubs }
    })

    await flushPromises()

    expect(alertErrorMock).toHaveBeenCalledWith('load reports failed', { fallback: 'Не удалось загрузить отчёты' })
  })

  it('reports Error object store error as message string via alertStore on load', async () => {
    getReportsMock.mockRejectedValue(new Error('load reports failed'))

    mount(CustomsReportsList, {
      global: { stubs: testStubs }
    })

    await flushPromises()

    expect(alertErrorMock).toHaveBeenCalledWith(new Error('load reports failed'), { fallback: 'Не удалось загрузить отчёты' })
  })
})
