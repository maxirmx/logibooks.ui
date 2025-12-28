/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, unref } from 'vue'
import UploadCustomsReportsList from '@/lists/UploadCustomsReports_List.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const reportsRef = ref([])
const loadingRef = ref(false)
const errorRef = ref(null)
const alertRef = ref(null)
const perPageRef = ref(10)
const sortByRef = ref([{ key: 'id', order: 'desc' }])
const pageRef = ref(1)

const getReportsMock = vi.hoisted(() => vi.fn())
const uploadMock = vi.hoisted(() => vi.fn())
const removeMock = vi.hoisted(() => vi.fn())
const clearMock = vi.hoisted(() => vi.fn())
const alertErrorMock = vi.hoisted(() => vi.fn())

let decsStoreMock
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
    template: '<button class="v-btn-stub" data-testid="v-btn" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot></slot></button>'
  },
  'v-data-table': {
    inheritAttrs: false,
    emits: ['update:itemsPerPage', 'update:items-per-page', 'update:page', 'update:sortBy', 'update:sort-by'],
    props: ['items', 'headers', 'loading', 'itemsPerPage', 'itemsPerPageOptions', 'page', 'sortBy', 'density', 'class', 'itemValue'],
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
      template: '<button class="action-button-stub" data-testid="action-button" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot></slot></button>'
    },
  ActionDialog: {
    props: ['actionDialog'],
    template: '<div class="action-dialog-stub" :data-show="actionDialog?.show" :data-title="actionDialog?.title"></div>'
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

vi.mock('@/stores/decs.store.js', () => ({
  useDecsStore: () => decsStoreMock
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

describe('UploadCustomsReports_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reportsRef.value = []
    loadingRef.value = false
    errorRef.value = null
    alertRef.value = null

    decsStoreMock = {
      reports: reportsRef,
      loading: loadingRef,
      error: errorRef,
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
      }
    })
    authStoreMock.isSrLogistPlus = true
  })

  it('loads reports on mount', async () => {
    mount(UploadCustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await Promise.resolve()

    expect(getReportsMock).toHaveBeenCalled()
  })

  it('renders report data with calculated fields', async () => {
    reportsRef.value = [
      {
        id: 1,
        success: true,
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
        updatedTnVedParcels: 10,
        errMsg: 'Some error'
      }
    ]

    const wrapper = mount(UploadCustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    const textFor = (key) => wrapper.find(`[data-column-key="${key}"]`).text()

    expect(textFor('id')).toBe('1')
    expect(textFor('fileName')).toBe('report.xlsx')
    expect(textFor('result')).toBe('Успешно')
    expect(textFor('customsProcedure')).toBe('IM')
    expect(textFor('masterInvoice')).toBe('INV-1')
    expect(textFor('processedRows')).toBe('50')
    expect(textFor('releasedParcels')).toBe('7')
    expect(textFor('releasedWithDutyParcels')).toBe('8')
    expect(textFor('heldParcels')).toBe('9')
    expect(textFor('updatedTnVedParcels')).toBe('10')
    expect(textFor('errorCount')).toContain('21')
    expect(textFor('errMsg')).toBe('Some error')

    const actionsCell = wrapper.find('[data-column-key="actions"]')
    expect(actionsCell.find('[data-testid="reports-delete-button"]').exists()).toBe(true)
  })

  it('binds pagination and sorting to authStore', async () => {
    reportsRef.value = [
      {
        id: 5,
        success: true,
        fileName: 'report.xlsx'
      }
    ]
    perPageRef.value = 50
    pageRef.value = 2
    sortByRef.value = [{ key: 'fileName', order: 'asc' }]

    const wrapper = mount(UploadCustomsReportsList, {
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

  it('shows empty state when there are no reports', () => {
    const wrapper = mount(UploadCustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    expect(wrapper.find('[data-testid="v-data-table"]').exists()).toBe(true)
    expect(wrapper.find('.header-actions').exists()).toBe(true)
  })

  it('shows header upload button and triggers file input', async () => {
    const wrapper = mount(UploadCustomsReportsList, {
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

  it('uploads a report from the header action and refreshes the list', async () => {
    getReportsMock.mockResolvedValue()
    const wrapper = mount(UploadCustomsReportsList, {
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

    resolveUpload()
    await flushPromises()

    const dispatchedEvent = dispatchSpy.mock.calls.find((call) => call[0] instanceof globalThis.CustomEvent)
    expect(dispatchedEvent?.[0].detail).toEqual({ fileName: 'report.xlsx' })
    expect(getReportsMock).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.action-dialog-stub').attributes('data-show')).toBe('false')
    expect(assignedInputValue).toBe('')
    expect(alertErrorMock).not.toHaveBeenCalled()
  })

  it('handles upload errors and clears the file input', async () => {
    getReportsMock.mockResolvedValue()
    const wrapper = mount(UploadCustomsReportsList, {
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
    expect(alertErrorMock).toHaveBeenCalledWith('upload failed')
    expect(wrapper.find('.action-dialog-stub').attributes('data-show')).toBe('false')
    expect(assignedInputValue).toBe('')
  })

  it('renders delete action and calls store deletion', async () => {
    reportsRef.value = [
      {
        id: 7,
        success: false,
        fileName: 'file.zip'
      }
    ]
    removeMock.mockResolvedValue()
    confirmMock.mockResolvedValue(true)

    const wrapper = mount(UploadCustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    const deleteButton = wrapper.find('[data-testid="reports-delete-button"]')
    expect(deleteButton.exists()).toBe(true)

    await deleteButton.trigger('click')
    await flushPromises()

    expect(removeMock).toHaveBeenCalledWith(7)
  })

  it('shows alert when deleting report fails', async () => {
    reportsRef.value = [
      {
        id: 11,
        success: false,
        fileName: 'bad'
      }
    ]
    removeMock.mockRejectedValue(new Error('delete failed'))
    confirmMock.mockResolvedValue(true)

    const wrapper = mount(UploadCustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    const deleteButton = wrapper.find('[data-testid="reports-delete-button"]')
    await deleteButton.trigger('click')
    await flushPromises()

    expect(removeMock).toHaveBeenCalledWith(11)
    expect(alertErrorMock).toHaveBeenCalledWith('delete failed')
  })

  it('does not call delete if confirmation is cancelled', async () => {
    reportsRef.value = [
      {
        id: 9,
        success: false,
        fileName: 'nope'
      }
    ]
    confirmMock.mockResolvedValue(false)
    removeMock.mockResolvedValue()

    const wrapper = mount(UploadCustomsReportsList, {
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

  it('omits actions column when user lacks permissions', async () => {
    authStoreMock.isSrLogistPlus = false
    reportsRef.value = [
      {
        id: 3,
        success: true,
        fileName: 'file.xlsx'
      }
    ]

    const wrapper = mount(UploadCustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(wrapper.find('[data-column-key="actions"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="reports-delete-button"]').exists()).toBe(false)
  })

  it('navigates to rows view when report ID is clicked', async () => {
    reportsRef.value = [
      {
        id: 7,
        success: true,
        fileName: 'report.xlsx'
      }
    ]

    const wrapper = mount(UploadCustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    const idLink = wrapper.find('[data-testid="report-id-link-7"]')
    expect(idLink.exists()).toBe(true)

    await idLink.trigger('click')
    expect(routerPushMock).toHaveBeenCalledWith('/customs-reports/7/rows')
  })
})
