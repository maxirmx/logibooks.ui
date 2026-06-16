/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import CustomsReportRowsList from '@/lists/CustomsReportRows_List.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import TruncateTooltipCell from '@/components/TruncateTooltipCell.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const reportRowsRef = ref([])
const loadingRef = ref(false)
const errorRef = ref(null)
const alertRef = ref(null)
const perPageRef = ref(10)
const sortByRef = ref([{ key: 'rowNumber', order: 'asc' }])
const pageRef = ref(1)
const searchRef = ref('')

const getReportRowsMock = vi.hoisted(() => vi.fn())
const clearMock = vi.hoisted(() => vi.fn())
const alertErrorMock = vi.hoisted(() => vi.fn())

let customsReportsStoreMock
let alertStoreMock
let authStoreMock
const routerPushMock = vi.hoisted(() => vi.fn())

const testStubs = {
  ...defaultGlobalStubs,
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
  'v-data-table-server': {
    name: 'v-data-table-server',
    inheritAttrs: false,
    emits: ['update:itemsPerPage', 'update:items-per-page', 'update:page', 'update:sortBy', 'update:sort-by'],
    props: ['items', 'headers', 'loading', 'itemsPerPage', 'itemsPerPageOptions', 'page', 'sortBy', 'density', 'class', 'itemValue', 'itemsLength'],
    template: `
      <div class="v-data-table-server-stub" data-testid="v-data-table">
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
    push: routerPushMock
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
    vi.clearAllMocks()
    reportRowsRef.value = []
    loadingRef.value = false
    errorRef.value = null
    alertRef.value = null
    searchRef.value = ''
    perPageRef.value = 10
    sortByRef.value = [{ key: 'rowNumber', order: 'asc' }]
    pageRef.value = 1

    customsReportsStoreMock = {
      reportRows: reportRowsRef,
      loading: loadingRef,
      error: errorRef,
      reportRowsTotalCount: ref(0),
      getReportRows: getReportRowsMock
    }

    alertStoreMock = {
      alert: alertRef,
      clear: clearMock,
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

  it('loads report rows on mount', async () => {
    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await Promise.resolve()

    expect(getReportRowsMock).toHaveBeenCalledWith(5)
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

  it('defines widened report row headers', async () => {
    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(wrapper.vm.headers.map((header) => header.key)).toEqual([
      'id',
      'parcelNumber',
      'processingResult',
      'uin',
      'dTag',
      'masterInvoice',
      'recipient',
      'description',
      'tnVed',
      'prevTnVed',
      'quantity',
      'totalWeight',
      'weightUnit',
      'totalCost',
      'currency',
      'previousMonthValueOrWeight',
      'customsDutiesAndTaxes',
      'customsFees',
      'prohibitionsAndRestrictions',
      'customsPaymentReservationId',
      'dateTime',
      'comments'
    ])
  })

  it('renders widened DTO fields and truncates long text columns', async () => {
    reportRowsRef.value = [
      {
        id: 1,
        rowNumber: 9,
        parcelNumber: 'PN-001',
        processingResult: 'Выпущено',
        uin: 'UIN-001',
        dTag: 'DTAG-001',
        masterInvoice: 'MASTER-001',
        recipient: 'Получатель с длинным названием',
        description: 'УИН:UIN-001; длинное описание товара',
        tnVed: '1234567890',
        prevTnVed: '0987654321',
        quantity: '2',
        totalWeight: '3.4',
        weightUnit: 'кг',
        totalCost: '99.95',
        currency: 'USD',
        previousMonthValueOrWeight: 'стоимость за предыдущий месяц',
        customsDutiesAndTaxes: 'пошлины и налоги',
        customsFees: 'сборы',
        prohibitionsAndRestrictions: 'запреты и ограничения',
        customsPaymentReservationId: 12345,
        dateTime: '2026-05-07 10:30',
        comments: '10-выпуск',
        parcelId: 12,
        registerId: 5
      }
    ]

    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    const textFor = (key) => wrapper.find(`[data-column-key="${key}"]`).text()

    expect(textFor('uin')).toContain('UIN-001')
    expect(textFor('masterInvoice')).toContain('MASTER-001')
    expect(textFor('description')).toContain('УИН:UIN-001; длинное описание товара')
    expect(textFor('customsDutiesAndTaxes')).toContain('пошлины и налоги')
    expect(textFor('customsFees')).toContain('сборы')
    expect(textFor('dateTime')).toContain('2026-05-07 10:30')
    expect(textFor('comments')).toContain('10-выпуск')
    expect(textFor('customsPaymentReservationId')).toContain('12345')
    expect(wrapper.find('[data-column-key="description"] .truncate-cell').exists()).toBe(true)
    expect(wrapper.find('[data-column-key="comments"] .truncate-cell').exists()).toBe(true)
    expect(wrapper.findAllComponents(TruncateTooltipCell)).toHaveLength(7)
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
    errorRef.value = new Error('Failed to load rows')

    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(wrapper.text()).not.toContain('Ошибка при загрузке информации')
    expect(alertErrorMock).toHaveBeenCalledWith(errorRef.value.message)
  })

  it('displays report ID in header', async () => {
    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 42 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(wrapper.find('h1').text()).toContain('Отчёт о выпуске для №42')
  })

  it('displays master invoice in header when provided', async () => {
    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 42, masterInvoice: 'MASTER-42' },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(wrapper.find('h1').text()).toContain('Отчёт о выпуске для MASTER-42')
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

  it('passes pagination state to PaginationFooter', async () => {
    customsReportsStoreMock.reportRowsTotalCount.value = 25
    perPageRef.value = 10
    pageRef.value = 2

    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    const footer = wrapper.findComponent(PaginationFooter)
    expect(footer.props('totalCount')).toBe(25)
    expect(footer.props('maxPage')).toBe(3)
    expect(footer.props('page')).toBe(2)
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

  it('renders alert message and clears it', async () => {
    alertRef.value = { type: 'alert-danger', message: 'Load failed' }

    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(wrapper.find('.alert').text()).toContain('Load failed')
    await wrapper.find('.alert .close').trigger('click')
    expect(clearMock).toHaveBeenCalled()
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

    expect(routerPushMock).toHaveBeenCalledWith('/registers/5/parcels/edit/12')
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

    await cell.trigger('click')
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('reports string store error through alertStore', async () => {
    errorRef.value = 'row load error'

    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(alertErrorMock).toHaveBeenCalledWith('row load error')
  })

  it('triggers reload when pagination changes', async () => {
    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: { stubs: testStubs }
    })

    await flushPromises()

    const callsBefore = getReportRowsMock.mock.calls.length

    pageRef.value = 2
    await flushPromises()

    expect(getReportRowsMock.mock.calls.length).toBeGreaterThan(callsBefore)
    wrapper.unmount()
    wrapper = null
  })

  it('stops watchers and cleans up on unmount', async () => {
    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: { stubs: testStubs }
    })

    await flushPromises()

    // Unmounting exercises the onUnmounted hook (isComponentMounted=false, stopFilterSync, watcherStop)
    wrapper.unmount()
    wrapper = null
  })

  it('generates page options for large page counts', async () => {
    customsReportsStoreMock.reportRowsTotalCount.value = 10000

    wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: { stubs: testStubs }
    })

    await flushPromises()

    // With 10000 rows and 10 per page, maxPage = 1000 > 200.
    // The >200 branch builds a sparse set around page 1 and last pages.
    const pageOptions = wrapper.vm.pageOptions
    expect(Array.isArray(pageOptions)).toBe(true)
    expect(pageOptions.length).toBeGreaterThan(10)
    expect(pageOptions.some((o) => o.value > 200)).toBe(true)
    expect(pageOptions[0]).toEqual({ value: 1, title: '1' })
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
