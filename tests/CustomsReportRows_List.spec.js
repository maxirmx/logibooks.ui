/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import CustomsReportRowsList from '@/lists/CustomsReportRows_List.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'
import { OP_MODE_PAPERWORK } from '@/helpers/op.mode.js'

import { customsReportOps } from './helpers/customs-report-ops.fixture.js'

const reportRowsRef = ref([])
const reportRowsColumnsRef = ref([])
const reportRowsCustomsProcedureRef = ref(null)
const loadingRef = ref(false)
const errorRef = ref(null)
const alertRef = ref(null)
const perPageRef = ref(10)
const sortByRef = ref([{ key: 'rowNumber', order: 'asc' }])
const pageRef = ref(1)
const searchRef = ref('')

const getReportRowsMock = vi.hoisted(() => vi.fn())
const getReportStatusMock = vi.hoisted(() => vi.fn())
const dismissMock = vi.hoisted(() => vi.fn())
const alertErrorMock = vi.hoisted(() => vi.fn())

let customsReportsStoreMock
let alertStoreMock
let authStoreMock
const routerPushMock = vi.hoisted(() => vi.fn())

const fullColumnKeys = [
  'id',
  'parcelNumber',
  'processingResult',
  'uin',
  'dTag',
  'masterInvoice',
  'recipient',
  'description',
  'tnVed',
  'quantity',
  'totalWeight',
  'totalCost',
  'previousMonthValueOrWeight',
  'customsDutiesAndTaxes',
  'customsFees',
  'prohibitionsAndRestrictions',
  'customsPaymentReservationId',
  'dateTime',
  'comments'
]

const exportColumnKeys = [
  'id',
  'parcelNumber',
  'processingResult',
  'uin',
  'dTag',
  'recipient',
  'description',
  'tnVed',
  'quantity',
  'totalWeight',
  'totalCost',
  'dateTime',
  'comments'
]

function createFullReportRow() {
  return {
    id: 1,
    rowNumber: 9,
    parcelNumber: 'PN-001',
    processingResult: 'Выпущено',
    uin: 'UIN-001',
    dTag: 'DTAG-001',
    masterInvoice: 'MASTER-001',
    recipient: 'Получатель',
    description: 'УИН:UIN-001; описание',
    tnVed: '1234567890',
    prevTnVed: '0987654321',
    quantity: '2',
    totalWeight: '3.4',
    weightUnit: 'кг',
    totalCost: '99.95',
    currency: 'USD',
    previousMonthValueOrWeight: 'предыдущий месяц',
    customsDutiesAndTaxes: 'пошлины и налоги',
    customsFees: 'сборы',
    prohibitionsAndRestrictions: 'запреты',
    customsPaymentReservationId: 12345,
    dateTime: '2026-05-07T10:30:00+03:00',
    comments: '10-выпуск'
  }
}

const testStubs = {
  ...defaultGlobalStubs,
  RouterLink: { template: '<a><slot /></a>' },
  'v-data-table': {
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
      'itemValue'
    ],
    template: `
      <div class="v-data-table-stub" data-testid="v-data-table">
        <div class="v-data-table-header-row">
          <div
            v-for="header in headers"
            :key="header.key"
            class="v-data-table-header-cell"
            :data-column-key="header.key + '-header'"
          >
            <slot
              :name="'header.' + header.key"
              :column="header"
              :sort-by="sortBy"
              :is-sorted="isSorted"
              :get-sort-icon="getSortIcon"
            >
              {{ header.title }}
            </slot>
          </div>
        </div>
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
    `,
    methods: {
      isSorted(header) {
        return Array.isArray(this.sortBy) && this.sortBy.some((item) => item.key === header.key)
      },
      getSortIcon(header) {
        const item = Array.isArray(this.sortBy)
          ? this.sortBy.find((item) => item.key === header.key)
          : null
        return item?.order === 'desc' ? '$sortDesc' : '$sortAsc'
      }
    }
  },
  'v-data-table-server': {
    name: 'v-data-table-server',
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
      <div class="v-data-table-server-stub" data-testid="v-data-table">
        <div class="v-data-table-header-row">
          <div
            v-for="header in headers"
            :key="header.key"
            class="v-data-table-header-cell"
            :data-column-key="header.key + '-header'"
          >
            <slot
              :name="'header.' + header.key"
              :column="header"
              :sort-by="sortBy"
              :is-sorted="isSorted"
              :get-sort-icon="getSortIcon"
            >
              {{ header.title }}
            </slot>
          </div>
        </div>
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
    `,
    methods: {
      isSorted(header) {
        return Array.isArray(this.sortBy) && this.sortBy.some((item) => item.key === header.key)
      },
      getSortIcon(header) {
        const item = Array.isArray(this.sortBy)
          ? this.sortBy.find((item) => item.key === header.key)
          : null
        return item?.order === 'desc' ? '$sortDesc' : '$sortAsc'
      }
    }
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

vi.mock('@/router', () => ({
  default: {
    push: routerPushMock,
    currentRoute: ref({ fullPath: '/customs-reports/5/rows' })
  }
}))

describe('CustomsReportRows_List.vue', () => {
  let wrapper

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
  })

  beforeEach(() => {
    vi.resetAllMocks()
    getReportRowsMock.mockResolvedValue()
    getReportStatusMock.mockResolvedValue()
    reportRowsRef.value = []
    reportRowsColumnsRef.value = []
    reportRowsCustomsProcedureRef.value = null
    loadingRef.value = false
    errorRef.value = null
    alertRef.value = null
    searchRef.value = ''
    perPageRef.value = 10
    sortByRef.value = [{ key: 'rowNumber', order: 'asc' }]
    pageRef.value = 1

    customsReportsStoreMock = {
      accountVersion: ref(0),
      ops: ref(customsReportOps),
      reportStage: report => customsReportOps.stages[report?.stage],
      canRetryReportStatus: error => !customsReportOps.nonRetryableStatusCodes.includes(error?.status),
      reportRows: reportRowsRef,
      loading: loadingRef,
      error: errorRef,
      reportRowsTotalCount: ref(0),
      reportRowsColumns: reportRowsColumnsRef,
      reportRowsCustomsProcedure: reportRowsCustomsProcedureRef,
      getReportRows: getReportRowsMock,
      resetReportRows: vi.fn(),
      displayReportStatus: () => () => {},
      claimReportStatusFailure: () => true,
      getReportStatus: getReportStatusMock
    }

    alertStoreMock = {
      get alert() {
        return alertRef.value
      },
      dismiss: dismissMock,
      error: alertErrorMock
    }

    authStoreMock = {}
    Object.defineProperties(authStoreMock, {
      customsreportrows_per_page: {
        get: () => perPageRef.value,
        set: (val) => {
          perPageRef.value = val
        }
      },
      customsreportrows_sort_by: {
        get: () => sortByRef.value,
        set: (val) => {
          sortByRef.value = val
        }
      },
      customsreportrows_page: {
        get: () => pageRef.value,
        set: (val) => {
          pageRef.value = val
        }
      },
      customsreportrows_search: {
        get: () => searchRef.value,
        set: (val) => {
          searchRef.value = val
        }
      }
    })
  })

  it('shows both stage transitions and retained failure on a focused decision', async () => {
    vi.useFakeTimers()
    try {
      getReportStatusMock.mockResolvedValueOnce({ id: 5, stage: 'pendingParse' })
        .mockResolvedValueOnce({ id: 5, stage: 'pendingApply', masterInvoice: 'MASTER-18' })
        .mockResolvedValueOnce({
          id: 5, stage: 'applyFailed', errMsg: 'Не удалось применить решения'
        })
      wrapper = mount(CustomsReportRowsList, {
        props: { reportId: 5, masterInvoice: 'Временное значение' },
        global: { stubs: testStubs }
      })
      await flushPromises()
      expect(getReportRowsMock).toHaveBeenCalledWith(5)
      expect(wrapper.text()).toContain('Ожидает чтения отчёта')
      expect(wrapper.text()).toContain('К списку отчётов')
      await vi.advanceTimersByTimeAsync(2000)
      expect(wrapper.text()).toContain('Решения ожидают применения')
      expect(wrapper.text()).toContain('MASTER-18')
      await vi.advanceTimersByTimeAsync(2000)
      expect(wrapper.text()).toContain('Ошибка применения решений')
      expect(wrapper.text()).toContain('Не удалось применить решения')
      expect(alertErrorMock).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(4000)
      expect(getReportStatusMock).toHaveBeenCalledTimes(3)
    } finally {
      wrapper?.unmount()
      wrapper = null
      vi.useRealTimers()
    }
  })

  it.each([
    ['Unexpected database exception', 'Не удалось обработать отчёт о выпуске'],
    ['Обработка файла прервана. Загрузите файл отчёта повторно.', 'Обработка файла прервана. Загрузите файл отчёта повторно.']
  ])('presents the saved report failure inline for %s', async (errMsg, expected) => {
    getReportStatusMock.mockResolvedValue({ id: 5, stage: 'parseFailed', errMsg })
    wrapper = mount(CustomsReportRowsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
    await flushPromises()
    const status = wrapper.get('[aria-live="polite"]')
    expect(status.text()).toContain(expected)
    expect(status.text()).not.toContain('Unexpected database exception')
    expect(alertErrorMock).not.toHaveBeenCalled()
  })

  it('reports a status failure while the rows view is mounted', async () => {
    const failure = new Error('status failed')
    getReportStatusMock.mockRejectedValue(failure)
    wrapper = mount(CustomsReportRowsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
    await flushPromises()
    expect(alertErrorMock).toHaveBeenCalledOnce()
    expect(alertErrorMock).toHaveBeenCalledWith(failure, { fallback: 'Не удалось получить состояние отчёта' })
  })

  it('recovers the status of an active report opened directly after a transient initial failure', async () => {
    vi.useFakeTimers()
    try {
      getReportStatusMock.mockRejectedValueOnce(new Error('status unavailable'))
        .mockResolvedValueOnce({ id: 5, stage: 'pendingApply' })
        .mockResolvedValueOnce({ id: 5, stage: 'completed' })
      wrapper = mount(CustomsReportRowsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
      await flushPromises()
      expect(alertErrorMock).toHaveBeenCalledOnce()
      await vi.advanceTimersByTimeAsync(2000)
      expect(wrapper.text()).toContain('Решения ожидают применения')
      await vi.advanceTimersByTimeAsync(2000)
      expect(wrapper.text()).toContain('Обработан')
      await vi.advanceTimersByTimeAsync(4000)
      expect(getReportStatusMock).toHaveBeenCalledTimes(3)
      expect(alertErrorMock).toHaveBeenCalledOnce()
    } finally {
      wrapper?.unmount()
      wrapper = null
      vi.useRealTimers()
    }
  })

  it('stops polling after a missing report is reported', async () => {
    vi.useFakeTimers()
    try {
      getReportStatusMock.mockRejectedValue(Object.assign(new Error('Отчёт не найден'), { status: 404 }))
      wrapper = mount(CustomsReportRowsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
      await vi.advanceTimersByTimeAsync(6000)
      expect(getReportStatusMock).toHaveBeenCalledOnce()
      expect(alertErrorMock).toHaveBeenCalledOnce()
    } finally {
      wrapper?.unmount()
      wrapper = null
      vi.useRealTimers()
    }
  })

  it('logs late row and status failures after unmount without showing an alert', async () => {
    let rejectRows
    let rejectStatus
    getReportRowsMock.mockReturnValue(new Promise((_, reject) => { rejectRows = reject }))
    getReportStatusMock.mockReturnValue(new Promise((_, reject) => { rejectStatus = reject }))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    wrapper = mount(CustomsReportRowsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
    await flushPromises()
    wrapper.unmount()
    wrapper = null
    rejectRows(new Error('late rows'))
    rejectStatus(new Error('late status'))
    await flushPromises()
    expect(consoleError).toHaveBeenCalledWith('[customs report rows after disposal]', new Error('late rows'))
    expect(consoleError).toHaveBeenCalledWith('[customs report polling after disposal]', new Error('late status'))
    expect(alertErrorMock).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('invalidates the rows snapshot immediately when the route changes during a load', async () => {
    const previous = Promise.withResolvers()
    getReportRowsMock.mockReturnValueOnce(previous.promise)
    getReportStatusMock.mockResolvedValueOnce({ id: 5, stage: 'completed', masterInvoice: 'OLD-INVOICE' })
    wrapper = mount(CustomsReportRowsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
    await flushPromises()
    expect(wrapper.get('h1').text()).toContain('OLD-INVOICE')
    expect(getReportRowsMock).toHaveBeenCalledExactlyOnceWith(5)

    await wrapper.setProps({ reportId: 6 })
    expect(customsReportsStoreMock.resetReportRows).toHaveBeenCalledTimes(2)
    expect(getReportRowsMock).toHaveBeenCalledExactlyOnceWith(5)
    expect(wrapper.get('h1').text()).toContain('№6')
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const failure = new Error('Previous report failed')
      previous.reject(failure)
      await flushPromises()
      expect(diagnostic).toHaveBeenCalledWith('[customs report rows after disposal]', failure)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(alertErrorMock).not.toHaveBeenCalled()
      expect(getReportRowsMock).toHaveBeenLastCalledWith(6)
    } finally {
      diagnostic.mockRestore()
    }
  })

  it('reloads the same report on account change and ignores the previous status', async () => {
    const previous = Promise.withResolvers()
    const current = Promise.withResolvers()
    getReportStatusMock.mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise)
    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5, masterInvoice: 'OLD-INVOICE' },
      global: { stubs: testStubs }
    })
    await flushPromises()
    expect(wrapper.get('h1').text()).toContain('OLD-INVOICE')

    customsReportsStoreMock.accountVersion.value++
    await flushPromises()
    expect(getReportStatusMock.mock.calls).toEqual([[5], [5]])
    expect(getReportRowsMock.mock.calls).toEqual([[5], [5]])
    expect(wrapper.get('h1').text()).toContain('№5')
    expect(wrapper.text()).not.toContain('OLD-INVOICE')

    current.resolve({ id: 5, stage: 'completed', masterInvoice: 'CURRENT-INVOICE' })
    await flushPromises()
    previous.resolve(undefined)
    await flushPromises()
    expect(wrapper.get('h1').text()).toContain('CURRENT-INVOICE')
  })

  it('keeps a status failure silent when it was already shown in the background', async () => {
    customsReportsStoreMock.claimReportStatusFailure = vi.fn(() => false)
    const failure = new Error('Service unavailable')
    getReportStatusMock.mockRejectedValue(failure)
    wrapper = mount(CustomsReportRowsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
    await flushPromises()
    expect(customsReportsStoreMock.claimReportStatusFailure).toHaveBeenCalledExactlyOnceWith(5, failure)
    expect(alertErrorMock).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('renders report rows data', async () => {
    reportRowsRef.value = [
      {
        rowNumber: 1,
        trackingNumber: 'TRACK001',
        decision: 'Выпуск разрешён',
        tnVed: '1234567890',
        customsProcedure: 'IM',
        status: 'Обработан',
        errorMessage: ''
      },
      {
        rowNumber: 2,
        trackingNumber: 'TRACK002',
        decision: 'Запрет выпуска',
        tnVed: '0987654321',
        customsProcedure: 'IM',
        status: 'Ошибка',
        errorMessage: 'Посылка не найдена'
      }
    ]

    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    const table = wrapper.find('[data-testid="v-data-table"]')
    expect(table.exists()).toBe(true)

    const rows = wrapper.findAll('.v-data-table-row')
    expect(rows).toHaveLength(2)
  })

  it.each([
    'ИМ 40'
  ])(
    'uses full headers and cells for %s report columns',
    async (customsProcedure) => {
      reportRowsColumnsRef.value = fullColumnKeys
      reportRowsCustomsProcedureRef.value = customsProcedure
      reportRowsRef.value = [createFullReportRow()]

      wrapper = mount(CustomsReportRowsList, {
        props: { reportId: 5 },
        global: {
          stubs: testStubs
        }
      })

      await flushPromises()

      expect(wrapper.vm.headers.map((header) => header.key)).toEqual(fullColumnKeys)
      expect(wrapper.find('[data-column-key="masterInvoice"]').text()).toContain('MASTER-001')
      expect(wrapper.find('[data-column-key="previousMonthValueOrWeight"]').text()).toContain(
        'предыдущий месяц'
      )
      expect(wrapper.find('[data-column-key="prohibitionsAndRestrictions"]').text()).toContain(
        'запреты'
      )
      expect(wrapper.find('[data-column-key="customsPaymentReservationId"]').text()).toContain(
        '12345'
      )
    }
  )

  it('resets hidden sort column after metadata loads', async () => {
    sortByRef.value = [{ key: 'customsPaymentReservationId', order: 'desc' }]

    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()
    const callsBeforeMetadata = getReportRowsMock.mock.calls.length

    reportRowsColumnsRef.value = exportColumnKeys
    await flushPromises()

    expect(sortByRef.value).toEqual([{ key: 'rowNumber', order: 'asc' }])
    expect(getReportRowsMock.mock.calls.length).toBeGreaterThan(callsBeforeMetadata)
  })

  // Back navigation handled by parent view; no local back button to test

  it('displays loading indicator when loading', async () => {
    loadingRef.value = true

    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(wrapper.find('.spinner-border').exists()).toBe(true)
  })

  it('reports store error through alertStore', async () => {
    getReportRowsMock.mockRejectedValue(new Error('Failed to load rows'))

    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(wrapper.text()).not.toContain('Ошибка при загрузке информации')
    expect(alertErrorMock).toHaveBeenCalledWith(new Error('Failed to load rows'), { fallback: 'Не удалось загрузить строки отчёта' })
  })

  it('updates local search from the search field', async () => {
    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()
    await wrapper.find('input').setValue('UIN-001')

    expect(wrapper.vm.localSearch).toBe('UIN-001')
  })

  it('updates table and footer models from emitted events', async () => {
    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    const table = wrapper.findComponent({ name: 'v-data-table-server' })
    table.vm.$emit('update:itemsPerPage', 25)
    table.vm.$emit('update:page', 3)
    table.vm.$emit('update:sortBy', [{ key: 'uin', order: 'desc' }])
    await flushPromises()

    expect(perPageRef.value).toBe(25)
    expect(pageRef.value).toBe(3)
    expect(sortByRef.value).toEqual([{ key: 'uin', order: 'desc' }])

    const footer = wrapper.findComponent(PaginationFooter)
    footer.vm.$emit('update:itemsPerPage', 50)
    footer.vm.$emit('update:page', 4)
    await flushPromises()

    expect(perPageRef.value).toBe(50)
    expect(pageRef.value).toBe(4)
  })

  it('returns alignment classes for table columns', async () => {
    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(wrapper.vm.getColumnAlignmentClass({ align: 'center' })).toBe('text-center')
    expect(wrapper.vm.getColumnAlignmentClass({ align: 'end' })).toBe('text-right')
    expect(wrapper.vm.getColumnAlignmentClass({ align: 'start' })).toBe('text-start')
  })

  it('routes to parcel edit when parcelId is present', async () => {
    reportRowsRef.value = [
      {
        id: 1,
        parcelId: 12,
        registerId: 5,
        rowNumber: 1,
        parcelNumber: 'PN-001',
        processingResult: 'OK',
        dTag: 'D1',
        tnVed: '123',
        prevTnVed: '122'
      }
    ]

    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: { stubs: testStubs }
    })

    await flushPromises()

    const cell = wrapper.findComponent(ClickableCell)
    await cell.trigger('click')

    expect(routerPushMock).toHaveBeenCalledWith({
      name: 'Редактирование посылки',
      params: { id: 12, registerId: 5 },
      query: {
        mode: OP_MODE_PAPERWORK,
        returnUrl: '/customs-reports/5/rows'
      }
    })
  })

  it('does not route when registerId is missing', async () => {
    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: { stubs: testStubs }
    })

    await flushPromises()

    wrapper.vm.openParcel({ parcelId: 12, registerId: null })

    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('prevents click and shows disabled cursor when parcelId is null', async () => {
    reportRowsRef.value = [
      {
        id: 2,
        parcelId: null,
        registerId: 5,
        rowNumber: 1,
        parcelNumber: 'PN-002',
        processingResult: 'OK',
        dTag: 'D2',
        tnVed: '123',
        prevTnVed: '122'
      }
    ]

    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: { stubs: testStubs }
    })

    await flushPromises()

    const cell = wrapper.findComponent(ClickableCell)
    expect(cell.classes()).toContain('clickable-cell-disabled')
    expect(wrapper.text()).toContain('PN-002')
    expect(wrapper.text()).not.toContain('Посылка №')

    await cell.trigger('click')
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('reports string store error through alertStore', async () => {
    getReportRowsMock.mockRejectedValue('row load error')

    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(alertErrorMock).toHaveBeenCalledWith('row load error', { fallback: 'Не удалось загрузить строки отчёта' })
  })

  it('uses page 1 as the page options fallback when current page is empty', async () => {
    customsReportsStoreMock.reportRowsTotalCount.value = 10000
    pageRef.value = 0

    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: { stubs: testStubs }
    })

    await flushPromises()

    const pageOptions = wrapper.vm.pageOptions
    expect(pageOptions[0]).toEqual({ value: 1, title: '1' })
    expect(pageOptions.some((o) => o.value === 11)).toBe(true)
  })
})
