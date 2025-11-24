/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
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
const clearMock = vi.hoisted(() => vi.fn())
const alertErrorMock = vi.hoisted(() => vi.fn())

let decsStoreMock
let alertStoreMock
let authStoreMock

const testStubs = {
  ...defaultGlobalStubs,
  'v-data-table': {
    name: 'v-data-table',
    template: `
      <div class="v-data-table-stub" data-testid="v-data-table">
        <div v-for="(item, i) in items" :key="i" class="v-data-table-row">
          <div v-for="header in headers" :key="header.key" class="v-data-table-cell">
            <slot :name="'item.' + header.key" :item="item">
              {{ item[header.key] }}
            </slot>
          </div>
        </div>
        <slot></slot>
      </div>
    `,
    props: ['items', 'headers', 'loading', 'itemsLength', 'itemsPerPage', 'page', 'sortBy', 'itemsPerPageOptions', 'search', 'customFilter', 'density', 'style'],
    emits: ['update:items-per-page', 'update:page', 'update:sort-by'],
    inheritAttrs: false
  },
  'font-awesome-icon': { template: '<i class="fa-icon-stub" />' }
  'font-awesome-icon': { template: '<i class="fa-icon-stub" />' },
  'v-btn': {
    inheritAttrs: false,
    emits: ['click'],
    template: '<button class="v-btn-stub" data-testid="v-btn" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot></slot></button>'
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

describe('UploadCustomsReports_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reportsRef.value = []
    loadingRef.value = false
    errorRef.value = null
    alertRef.value = null
    perPageRef.value = 10
    sortByRef.value = [{ key: 'id', order: 'desc' }]
    pageRef.value = 1

    decsStoreMock = {
      reports: reportsRef,
      loading: loadingRef,
      error: errorRef,
      getReports: getReportsMock,
      upload: uploadMock
    }

    alertStoreMock = {
      alert: alertRef,
      clear: clearMock,
      error: alertErrorMock
    }

    authStoreMock = {
      uploadcustomsreports_per_page: perPageRef,
      uploadcustomsreports_sort_by: sortByRef,
      uploadcustomsreports_page: pageRef
    }
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

    await wrapper.vm.$nextTick()

    const cells = wrapper.findAll('.v-data-table-cell')
    expect(cells.map((cell) => cell.text())).toEqual([
      '1',
      'report.xlsx',
      'Успешно',
      'IM',
      'INV-1',
      '50',
      '7',
      '8',
      '9',
      '10',
      '21',
      'Some error'
    ])
  })

  it('shows empty state when there are no reports', () => {
    const wrapper = mount(UploadCustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    expect(wrapper.text()).toContain('Список отчетов пуст')
  })

  it('binds pagination and sorting state to auth store', async () => {
    perPageRef.value = 25
    pageRef.value = 2
    sortByRef.value = [{ key: 'result', order: 'asc' }]
    reportsRef.value = [
      {
        id: 10,
        success: true
      }
    ]

  it('shows header upload button and triggers file input', async () => {
    const wrapper = mount(UploadCustomsReportsList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()

    const headerActions = wrapper.find('.header-actions .v-btn-stub')
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

    const table = wrapper.findComponent({ name: 'v-data-table' })
    expect(table.props('itemsPerPage')).toBe(25)
    expect(table.props('page')).toBe(2)
    expect(table.props('sortBy')).toEqual([{ key: 'result', order: 'asc' }])

    table.vm.$emit('update:items-per-page', 50)
    table.vm.$emit('update:page', 3)
    table.vm.$emit('update:sort-by', [{ key: 'processedRows', order: 'desc' }])

    await wrapper.vm.$nextTick()

    expect(perPageRef.value).toBe(50)
    expect(pageRef.value).toBe(3)
    expect(sortByRef.value).toEqual([{ key: 'processedRows', order: 'desc' }])
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
})
