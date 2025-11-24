/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
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
const clearMock = vi.hoisted(() => vi.fn())

let decsStoreMock
let alertStoreMock
let authStoreMock

const testStubs = {
  ...defaultGlobalStubs,
  'font-awesome-icon': { template: '<i class="fa-icon-stub" />' }
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
      getReports: getReportsMock
    }

    alertStoreMock = {
      alert: alertRef,
      clear: clearMock
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
})
