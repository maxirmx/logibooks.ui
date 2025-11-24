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

const getReportsMock = vi.hoisted(() => vi.fn())
const uploadMock = vi.hoisted(() => vi.fn())
const clearMock = vi.hoisted(() => vi.fn())
const alertErrorMock = vi.hoisted(() => vi.fn())

let decsStoreMock
let alertStoreMock

const testStubs = {
  ...defaultGlobalStubs,
  'font-awesome-icon': { template: '<i class="fa-icon-stub" />' },
  'v-btn': {
    inheritAttrs: false,
    emits: ['click'],
    template: '<button class="v-btn-stub" data-testid="v-btn" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot></slot></button>'
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
      upload: uploadMock
    }

    alertStoreMock = {
      alert: alertRef,
      clear: clearMock,
      error: alertErrorMock
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
})
