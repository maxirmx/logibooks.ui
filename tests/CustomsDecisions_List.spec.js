/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import CustomsDecisionsList from '@/lists/CustomsDecisions_List.vue'
import CustomsDecisionsView from '@/views/CustomsDecisions_View.vue'
import RegisterCustomsDecisionsView from '@/views/RegisterCustomsDecisions_View.vue'
import RegisterDecsList from '@/lists/RegisterDecs_List.vue'
import ActionButton from '@/components/ActionButton.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'
import { OP_MODE_PAPERWORK } from '@/helpers/op.mode.js'
import * as errorHelpers from '@/helpers/error.helpers.js'

const decisionsRef = ref([])
const decisionSourcesRef = ref(null)
const decisionsColumnsRef = ref([])
const decisionsCustomsProcedureRef = ref(null)
const loadingRef = ref(false)
const accountVersionRef = ref(0)
const alertRef = ref(null)
const perPageRef = ref(10)
const sortByRef = ref([{ key: 'rowNumber', order: 'asc' }])
const pageRef = ref(1)
const searchRef = ref('')

const ensureOpsLoadedMock = vi.hoisted(() => vi.fn())
const registerOpsMock = vi.hoisted(() => vi.fn())
const getCustomsMock = vi.hoisted(() => vi.fn())
const deleteCustomsMock = vi.hoisted(() => vi.fn())
const confirmCustomsMock = vi.hoisted(() => vi.fn())

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: getCustomsMock, delete: deleteCustomsMock }
}))

vi.mock('@/composables/useAppConfirm.js', () => ({
  useAppConfirm: () => confirmCustomsMock
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    ensureOpsLoaded: registerOpsMock,
    getTransportationDocument: () => 'Авиа накладная'
  })
}))
const getDecisionsMock = vi.hoisted(() => vi.fn())
const resetDecisionsMock = vi.hoisted(() => vi.fn())
const dismissMock = vi.hoisted(() => vi.fn())
const alertErrorMock = vi.hoisted(() => vi.fn())

let customsReportsStoreMock
let alertStoreMock
let authStoreMock
const routerPushMock = vi.hoisted(() => vi.fn())
const routerBackMock = vi.hoisted(() => vi.fn())
const routerReplaceMock = vi.hoisted(() => vi.fn())
const routerOnErrorMock = vi.hoisted(() => vi.fn())
const routerAfterEachMock = vi.hoisted(() => vi.fn())
const stopRouterErrorMock = vi.hoisted(() => vi.fn())
const stopRouterAfterEachMock = vi.hoisted(() => vi.fn())
const routerHistoryState = vi.hoisted(() => ({ back: null }))

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
  'comments',
  'source'
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
  'comments',
  'source'
]

function createFullDecision() {
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
  'v-data-table': {
    name: 'v-data-table',
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
        <slot name="bottom" />
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
    back: routerBackMock,
    replace: routerReplaceMock,
    resolve: (fullPath) => ({ fullPath }),
    onError: routerOnErrorMock,
    afterEach: routerAfterEachMock,
    options: { history: { state: routerHistoryState } },
    currentRoute: ref({ fullPath: '/customs-reports/5/decisions' })
  }
}))

describe('CustomsDecisions_List.vue', () => {
  let wrapper

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    routerHistoryState.back = null
    routerBackMock.mockReset()
    routerOnErrorMock.mockReset().mockReturnValue(stopRouterErrorMock)
    routerAfterEachMock.mockReset().mockReturnValue(stopRouterAfterEachMock)
    routerReplaceMock.mockReset().mockResolvedValue(undefined)
    getDecisionsMock.mockReset().mockResolvedValue(undefined)
    ensureOpsLoadedMock.mockReset().mockResolvedValue(undefined)
    decisionSourcesRef.value = null
    resetDecisionsMock.mockReset()
    accountVersionRef.value = 0
    decisionsRef.value = []
    decisionsColumnsRef.value = []
    decisionsCustomsProcedureRef.value = null
    loadingRef.value = false
    alertRef.value = null
    searchRef.value = ''
    perPageRef.value = 10
    sortByRef.value = [{ key: 'rowNumber', order: 'asc' }]
    pageRef.value = 1

    customsReportsStoreMock = {
      decisions: decisionsRef,
      decisionSources: decisionSourcesRef,
      ensureOpsLoaded: ensureOpsLoadedMock,
      decisionsLoading: loadingRef,
      accountVersion: accountVersionRef,
      decisionsTotalCount: ref(0),
      decisionsColumns: decisionsColumnsRef,
      decisionsCustomsProcedure: decisionsCustomsProcedureRef,
      getDecisions: getDecisionsMock,
      resetDecisions: resetDecisionsMock
    }

    alertStoreMock = {
      get alert() {
        return alertRef.value
      },
      dismiss: dismissMock,
      error: alertErrorMock.mockImplementation((error, options) => {
        alertRef.value = { id: 1, severity: 'error', message: errorHelpers.getErrorMessage(error, options?.fallback) }
        return 1
      })
    }

    authStoreMock = { hasLogistRole: true }
    Object.defineProperties(authStoreMock, {
      customsdecisions_per_page: {
        get: () => perPageRef.value,
        set: (val) => {
          perPageRef.value = val
        }
      },
      customsdecisions_sort_by: {
        get: () => sortByRef.value,
        set: (val) => {
          sortByRef.value = val
        }
      },
      customsdecisions_page: {
        get: () => pageRef.value,
        set: (val) => {
          pageRef.value = val
        }
      },
      customsdecisions_search: {
        get: () => searchRef.value,
        set: (val) => {
          searchRef.value = val
        }
      }
    })
  })

  it('passes report route props to the decisions list', () => {
    wrapper = mount(CustomsDecisionsView, {
      props: { reportId: 5, masterInvoice: 'MAWB-42' },
      global: { stubs: { CustomsDecisionsList: true } }
    })
    expect(wrapper.getComponent(CustomsDecisionsList).props()).toMatchObject({ reportId: 5, masterInvoice: 'MAWB-42' })
  })

  function setupRegister({ locked = false, canDelete = true, decisions = [createFullDecision()], appliedCount = 1 } = {}) {
    authStoreMock.isShiftLeadPlus = canDelete
    registerOpsMock.mockResolvedValue(undefined)
    deleteCustomsMock.mockReset().mockResolvedValue(undefined)
    confirmCustomsMock.mockReset().mockResolvedValue(true)
    getCustomsMock.mockReset().mockImplementation(async url => url.endsWith('/decs')
      ? {
          register: { id: 11, dealNumber: 'A-11', invoiceNumber: '123', transportationTypeCode: 1, readOnly: locked },
          items: [{ id: 21, number: '100/010826/200', decisionCount: 1, appliedCount, notAppliedCount: 0 }]
        }
      : {
          items: decisions,
          pagination: { currentPage: 1, totalCount: 1 },
          columns: fullColumnKeys,
          customsProcedure: 'ЭК 10'
        })
  }

  function action(label) {
    return wrapper.findAllComponents(ActionButton).find(button => button.props('tooltipText') === label)
  }

  it('loads a URL-selected DEC, uses supported controls, and refreshes after a row deletion', async () => {
    setupRegister()
    wrapper = mount(RegisterCustomsDecisionsView, {
      props: { registerId: 11, decId: 21 }, global: { stubs: testStubs }
    })
    await flushPromises()
    expect(wrapper.text()).toContain('A-11')
    expect(getCustomsMock).toHaveBeenCalledWith(expect.stringContaining('/customs-decisions?page=1&pageSize=100'))
    expect(getCustomsMock).toHaveBeenCalledWith(expect.stringContaining('decId=21'))
    expect(registerOpsMock).toHaveBeenCalled()
    const table = wrapper.getComponent({ name: 'v-data-table-server' })
    expect(table.props('itemsPerPageOptions').map(option => option.value)).toEqual([10, 50, 100, 500])
    expect(table.props('headers').find(column => column.key === 'totalWeight').sortable).toBe(false)

    action('Удалить решение').vm.$emit('click', { id: 1 })
    await flushPromises()
    expect(confirmCustomsMock).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('№1') }))
    expect(deleteCustomsMock).toHaveBeenCalledWith(expect.stringContaining('/registers/11/customs-decisions/1'))
    expect(getCustomsMock.mock.calls.filter(([url]) => url.endsWith('/decs'))).toHaveLength(2)
    table.vm.$emit('update:page', 9)
    await flushPromises()
    expect(getCustomsMock).toHaveBeenCalledWith(expect.stringContaining('page=9'))
    expect(table.props('page')).toBe(1)

    wrapper.getComponent({ name: 'v-select' }).vm.$emit('update:modelValue', null)
    await flushPromises()
    expect(routerReplaceMock).toHaveBeenLastCalledWith({
      name: 'Решения реестра', params: { registerId: 11 }, query: {}
    })

    await wrapper.setProps({ decId: null })
    await flushPromises()
    expect(getCustomsMock.mock.lastCall[0]).not.toContain('decId=')
    action('Удалить все решения для реестра').vm.$emit('click')
    await flushPromises()
    expect(deleteCustomsMock).toHaveBeenLastCalledWith(expect.stringMatching(/registers\/11\/customs-decisions$/))
    await wrapper.get('input').setValue('номер')
    action('Закрыть').vm.$emit('click')
    await flushPromises()
    expect(routerPushMock).toHaveBeenLastCalledWith({ name: 'ДТЭГ/ПТДЭГ реестра', params: { registerId: 11 } })
  })

  it.each([true])('shows Alta goods separately from parcel links (%s)', async (singleLink) => {
    const alta = {
      id: 21, dTag: 'DEC-21', parcelNumber: '00042', rowNumber: 0,
      processingResult: singleLink ? 'Выпущено' : 'Ошибка сопоставления товаров',
      parcelId: singleLink ? 31 : undefined, registerId: singleLink ? 11 : undefined,
      items: [
        { description: 'Чай', tnVed: '1234567890', prevTnVed: '0987654321', quantity: '3', totalCost: '10.00' },
        { description: 'Кофе', quantity: '1', totalCost: '9007199254740993.0001' },
        { description: 'Какао', quantity: '1', totalCost: '0' }
      ]
    }
    setupRegister({ locked: true, canDelete: false, decisions: [alta] })
    wrapper = mount(RegisterCustomsDecisionsView, {
      props: { registerId: 11 },
      global: { stubs: testStubs }
    })
    await flushPromises()
    const button = () => wrapper.get('[data-column-key="goods"] [aria-expanded]')
    expect(action('Товары').props('icon')).toBe('fa-solid fa-boxes-stacked')
    expect(button().attributes('aria-label')).toBe('Товары')
    expect(button().attributes('aria-expanded')).toBe('false')
    expect(wrapper.text()).not.toContain('Позиция 0')
    expect(action('Удалить решение')).toBeUndefined()
    expect(wrapper.getComponent({ name: 'v-data-table-server' }).props('itemsLength')).toBe(1)

    await button().trigger('click')
    expect(action('Товары').emitted('click')).toEqual([[alta.id]])
    expect(button().attributes('aria-expanded')).toBe('true')
    const goods = wrapper.get('table[aria-label="Товары"]')
    expect(goods.findAll('tbody tr').map(row => row.findAll('td').map(cell => cell.text()))).toEqual([
      ['Чай', '1234567890', '0987654321', '3', '10.00'],
      ['Кофе', '', '', '1', '9007199254740993.0001'],
      ['Какао', '', '', '1', '0']
    ])
    expect(routerPushMock).not.toHaveBeenCalled()
    expect(deleteCustomsMock).not.toHaveBeenCalled()
    await button().trigger('click')
    expect(wrapper.find('table[aria-label="Товары"]').exists()).toBe(false)
    await button().trigger('click')
    accountVersionRef.value++
    await flushPromises()
    expect(wrapper.find('table[aria-label="Товары"]').exists()).toBe(false)
  })

  it('does not restore expanded goods from a previous DEC filter', async () => {
    const initial = {
      ...createFullDecision(),
      items: [{ description: 'Первый товар', quantity: '1', totalCost: '0' },
        { description: 'Второй товар', quantity: '1', totalCost: '0' }]
    }
    setupRegister({ decisions: [initial] })
    const load = getCustomsMock.getMockImplementation()
    let returnOldDec
    const oldDec = new Promise(resolve => { returnOldDec = resolve })
    getCustomsMock.mockImplementation(url => url.includes('decId=21') ? oldDec : load(url))
    wrapper = mount(CustomsDecisionsList, {
      props: { registerId: 11 },
      global: { stubs: testStubs }
    })
    await flushPromises()
    await wrapper.get('[data-column-key="goods"] button').trigger('click')
    expect(wrapper.find('table[aria-label="Товары"]').exists()).toBe(true)

    await wrapper.setProps({ decId: 21 })
    await flushPromises()
    expect(getCustomsMock).toHaveBeenCalledWith(expect.stringContaining('decId=21'))
    await wrapper.setProps({ decId: 22 })
    await flushPromises()
    returnOldDec({
      ...await load('customs-decisions'),
      items: [{ ...initial, parcelNumber: 'OLD-NUMBER', items: [{ description: 'Прежний товар' }] }]
    })
    await flushPromises()

    expect(wrapper.find('table[aria-label="Товары"]').exists()).toBe(false)
    expect(wrapper.text()).toContain(initial.parcelNumber)
    expect(wrapper.text()).not.toContain('OLD-NUMBER')
    await wrapper.get('[data-column-key="goods"] button').trigger('click')
    expect(wrapper.get('table[aria-label="Товары"]').text()).toContain('Первый товар')
  })

  it('shows the DEC count table, opens its filter and handles a failed bulk delete once', async () => {
    setupRegister({ appliedCount: 3 })
    wrapper = mount(RegisterDecsList, {
      props: { registerId: 11 }, global: { stubs: testStubs }
    })
    await flushPromises()
    expect(wrapper.text()).toContain('100/010826/200')
    expect(wrapper.text()).toContain('Всего решений')
    expect(wrapper.text()).toContain('Применено')
    expect(wrapper.text()).toContain('Не применено')
    expect(wrapper.getComponent({ name: 'v-data-table' }).props('items')[0]).toMatchObject({
      decisionCount: 1, appliedCount: 3, notAppliedCount: 0
    })
    const dec = { id: 21, number: '100/010826/200' }
    action('Список решений').vm.$emit('click', dec)
    await flushPromises()
    expect(routerPushMock).toHaveBeenCalledWith({
      name: 'Решения реестра', params: { registerId: 11 }, query: { decId: 21 }
    })
    deleteCustomsMock.mockRejectedValueOnce(new Error('boom'))
    action('Удалить все решения по ДТЭГ/ПТДЭГ').vm.$emit('click', dec)
    await flushPromises()
    expect(confirmCustomsMock).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('все страницы') }))
    expect(deleteCustomsMock).toHaveBeenCalledWith(expect.stringContaining('/decs/21/customs-decisions'))
    expect(wrapper.get('[role=alert]').text()).toContain('Не удалось удалить решения о выпуске')
    expect(alertErrorMock).toHaveBeenCalledTimes(1)
    action('Все решения').vm.$emit('click')
    await flushPromises()
    expect(routerPushMock).toHaveBeenLastCalledWith({
      name: 'Решения реестра', params: { registerId: 11 }, query: {}
    })
    action('Закрыть').vm.$emit('click')
    await flushPromises()
    expect(routerPushMock).toHaveBeenLastCalledWith({ path: '/registers', query: { mode: OP_MODE_PAPERWORK } })
  })

  it('keeps the selected DEC page size', async () => {
    setupRegister()
    wrapper = mount(RegisterDecsList, {
      props: { registerId: 11 }, global: { stubs: testStubs }
    })
    await flushPromises()
    const table = wrapper.getComponent({ name: 'v-data-table' })
    expect(table.props('itemsPerPage')).toBe(100)

    table.vm.$emit('update:itemsPerPage', 10)
    await flushPromises()
    expect(table.props('itemsPerPage')).toBe(10)

    table.vm.$emit('update:itemsPerPage', -1)
    await flushPromises()
    expect(table.props('itemsPerPage')).toBe(-1)
  })

  it('does not publish a failed summary for a previous register', async () => {
    const diagnostic = vi.spyOn(errorHelpers, 'reportError').mockImplementationOnce(() => {})
    const failure = new Error('previous register')
    setupRegister()
    let rejectOldSummary
    getCustomsMock.mockImplementationOnce(() => new Promise((_, reject) => { rejectOldSummary = reject }))
    wrapper = mount(RegisterDecsList, {
      props: { registerId: 11 }, global: { stubs: testStubs }
    })
    await wrapper.setProps({ registerId: 12 })
    await flushPromises()
    rejectOldSummary(failure)
    await flushPromises()
    expect(getCustomsMock).toHaveBeenCalledWith(expect.stringContaining('/registers/12/decs'))
    expect(wrapper.find('[role=alert]').exists()).toBe(false)
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith(failure, {
      context: 'register customs summary after scope change'
    })
  })

  it('keeps a cancelled or expired confirmation from deleting decisions', async () => {
    setupRegister()
    wrapper = mount(RegisterDecsList, {
      props: { registerId: 11 }, global: { stubs: testStubs }
    })
    await flushPromises()
    const dec = { id: 21, number: '100/010826/200' }
    confirmCustomsMock.mockResolvedValueOnce(false)
    action('Удалить все решения по ДТЭГ/ПТДЭГ').vm.$emit('click', dec)
    await flushPromises()
    let confirmOld
    confirmCustomsMock.mockImplementationOnce(() => new Promise(resolve => { confirmOld = resolve }))
    action('Удалить все решения по ДТЭГ/ПТДЭГ').vm.$emit('click', dec)
    await wrapper.setProps({ registerId: 12 })
    confirmOld(true)
    await flushPromises()
    expect(deleteCustomsMock).not.toHaveBeenCalled()
  })

  it('disables deletion while the displayed rows belong to the previous search', async () => {
    setupRegister()
    wrapper = mount(RegisterCustomsDecisionsView, {
      props: { registerId: 11 }, global: { stubs: testStubs }
    })
    await flushPromises()
    expect(action('Удалить решение').props('disabled')).toBe(false)
    await wrapper.get('input').setValue('новый поиск')
    expect(action('Удалить решение').props('disabled')).toBe(true)
    action('Удалить решение').vm.$emit('click', { id: 1 })
    expect(confirmCustomsMock).not.toHaveBeenCalled()
  })

  it('drops stale rows when the current filter fails and fences an open delete confirmation', async () => {
    setupRegister()
    wrapper = mount(RegisterCustomsDecisionsView, {
      props: { registerId: 11 }, global: { stubs: testStubs }
    })
    await flushPromises()
    const table = wrapper.getComponent({ name: 'v-data-table-server' })
    expect(table.props('items')).toHaveLength(1)
    let confirmOld
    confirmCustomsMock.mockImplementationOnce(() => new Promise(resolve => { confirmOld = resolve }))
    action('Удалить решение').vm.$emit('click', { id: 1 })
    getCustomsMock.mockRejectedValueOnce(new Error('unavailable'))
    table.vm.$emit('update:sortBy', [{ key: 'dTag', order: 'asc' }])
    await flushPromises()
    expect(table.props('items')).toEqual([])
    expect(wrapper.get('[role=alert]').text()).toContain('Не удалось загрузить решения о выпуске')
    confirmOld(true)
    await flushPromises()
    expect(deleteCustomsMock).not.toHaveBeenCalled()
  })

  it('disables deletion on a read-only register and presents read failures', async () => {
    setupRegister({ locked: true })
    getCustomsMock.mockImplementationOnce(async () => {
      throw new Error('unavailable')
    })
    wrapper = mount(RegisterCustomsDecisionsView, {
      props: { registerId: 11 }, global: { stubs: testStubs }
    })
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toContain('Не удалось загрузить ДТЭГ/ПТДЭГ реестра')
    expect(action('Удалить все решения для реестра').props('disabled')).toBe(true)
  })

  it('ignores a late decision error from the previous report', async () => {
    const diagnostic = vi.spyOn(errorHelpers, 'reportError').mockImplementationOnce(() => {})
    const failure = new Error('Ошибка предыдущего отчёта')
    const previous = Promise.withResolvers()
    getDecisionsMock.mockReturnValueOnce(previous.promise)
    wrapper = mount(CustomsDecisionsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
    await wrapper.setProps({ reportId: 6 })
    previous.reject(failure)
    await flushPromises()

    expect(getDecisionsMock.mock.calls).toEqual([[5], [6]])
    expect(alertErrorMock).not.toHaveBeenCalled()
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith(failure, {
      context: 'customs decisions after their scope changed'
    })
  })

  it.each([
    'ИМ 40'
  ])(
    'uses full headers and cells for %s report columns',
    async (customsProcedure) => {
      decisionsColumnsRef.value = fullColumnKeys
      decisionsCustomsProcedureRef.value = customsProcedure
      decisionsRef.value = [createFullDecision()]

      wrapper = mount(CustomsDecisionsList, {
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

  it('renders labels from Core for all sources in the rightmost column', async () => {
    decisionsColumnsRef.value = exportColumnKeys
    decisionSourcesRef.value = [
      { value: 0, name: 'Отчёт о выпуске' },
      { value: 1, name: 'Синхронизация' },
      { value: 2, name: 'Установлено вручную' }
    ]
    decisionsRef.value = [0, 1, 2, 19, undefined].map((source, index) => ({
      ...createFullDecision(), id: index + 1, source
    }))
    wrapper = mount(CustomsDecisionsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
    await flushPromises()

    expect(wrapper.vm.headers.at(-1)).toMatchObject({ title: 'Источник', key: 'source', sortable: false })
    expect(wrapper.findAll('[data-column-key="source"]').map(cell => cell.text())).toEqual([
      'Отчёт о выпуске', 'Синхронизация', 'Установлено вручную', '—', '—'
    ])
  })

  it('loads decisions and changes pages while ops is pending, then shows one error and retries', async () => {
    let failOps
    ensureOpsLoadedMock.mockImplementationOnce(() => new Promise((resolve, reject) => { failOps = reject }))
    decisionsRef.value = [createFullDecision()]
    wrapper = mount(CustomsDecisionsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
    await flushPromises()
    expect(wrapper.find('[data-column-key="source"]').text()).toBe('—')

    pageRef.value = 2
    await flushPromises()
    expect(getDecisionsMock).toHaveBeenCalledTimes(2)
    expect(ensureOpsLoadedMock).toHaveBeenCalledTimes(1)

    failOps(new Error('Не удалось загрузить источники решений о выпуске'))
    await flushPromises()
    expect(alertErrorMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Не удалось загрузить источники решений о выпуске')
    expect(wrapper.find('[data-column-key="source"]').text()).toBe('—')

    pageRef.value = 3
    await flushPromises()
    expect(ensureOpsLoadedMock).toHaveBeenCalledTimes(2)
    expect(dismissMock).toHaveBeenCalledWith(1)
  })

  it.each(['account change'])('ignores a stale ops failure after %s', async (change) => {
    const diagnostic = vi.spyOn(errorHelpers, 'reportError').mockImplementationOnce(() => {})
    const failure = new Error('Устаревшая ошибка')
    let failOps
    ensureOpsLoadedMock.mockImplementationOnce(() => new Promise((resolve, reject) => { failOps = reject }))
    wrapper = mount(CustomsDecisionsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
    await flushPromises()
    if (change === 'unmount') {
      wrapper.unmount()
      wrapper = null
    } else {
      accountVersionRef.value++
      await flushPromises()
      expect(ensureOpsLoadedMock).toHaveBeenCalledTimes(2)
    }

    failOps(failure)
    await flushPromises()
    expect(alertErrorMock).not.toHaveBeenCalled()
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith(failure, {
      context: 'customs decision sources after their scope changed'
    })
  })

  it('resets hidden sort column after metadata loads', async () => {
    sortByRef.value = [{ key: 'customsPaymentReservationId', order: 'desc' }]

    wrapper = mount(CustomsDecisionsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()
    const callsBeforeMetadata = getDecisionsMock.mock.calls.length

    decisionsColumnsRef.value = exportColumnKeys
    await flushPromises()

    expect(sortByRef.value).toEqual([{ key: 'rowNumber', order: 'asc' }])
    expect(getDecisionsMock.mock.calls.length).toBeGreaterThan(callsBeforeMetadata)
  })

  it('shows a rejected row request once in the page alert region', async () => {
    const error = new Error('Не удалось загрузить решения о выпуске')
    getDecisionsMock.mockRejectedValueOnce(error)

    wrapper = mount(CustomsDecisionsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain(error.message)
    expect(alertErrorMock).toHaveBeenCalledTimes(1)
  })

  it('updates local search from the search field', async () => {
    wrapper = mount(CustomsDecisionsList, {
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
    wrapper = mount(CustomsDecisionsList, {
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
    wrapper = mount(CustomsDecisionsList, {
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
    decisionsRef.value = [
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

    wrapper = mount(CustomsDecisionsList, {
      props: { reportId: 5 },
      global: { stubs: testStubs }
    })

    await flushPromises()

    const cell = wrapper.findComponent(ClickableCell)
    expect(cell.props('disabled')).toBe(false)
    expect(cell.classes()).not.toContain('clickable-cell-disabled')
    await cell.trigger('click')

    expect(routerPushMock).toHaveBeenCalledWith({
      name: 'Редактирование посылки',
      params: { id: 12, registerId: 5 },
      query: {
        mode: OP_MODE_PAPERWORK,
        returnUrl: '/customs-reports/5/decisions'
      }
    })
  })

  it('shows the stop cursor and prevents navigation without parcel-route access', async () => {
    authStoreMock.hasLogistRole = false
    decisionsRef.value = [{ ...createFullDecision(), parcelId: 12, registerId: 5 }]
    wrapper = mount(CustomsDecisionsList, {
      props: { reportId: 5 },
      global: { stubs: testStubs }
    })
    await flushPromises()

    const cell = wrapper.findComponent(ClickableCell)
    expect(cell.props('disabled')).toBe(true)
    expect(cell.classes()).toContain('clickable-cell-disabled')
    await cell.trigger('click')
    wrapper.vm.openParcel(decisionsRef.value[0])

    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('omits upload metadata and closes to the previous reports list even while loading', async () => {
    routerHistoryState.back = '/customs-reports?search=CMR'
    loadingRef.value = true
    getDecisionsMock.mockResolvedValueOnce({ uploadedByUserName: 'Имя загрузившего' })
    wrapper = mount(CustomsDecisionsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Имя загрузившего')
    expect(wrapper.find('[data-testid="report-upload-metadata"]').exists()).toBe(false)
    await wrapper.get('button[aria-label="Закрыть"]').trigger('click')
    expect(routerBackMock).toHaveBeenCalledOnce()
    expect(routerReplaceMock).not.toHaveBeenCalled()
    routerAfterEachMock.mock.calls[0][0](
      { fullPath: routerHistoryState.back },
      { fullPath: '/customs-reports/5/decisions' }
    )
    expect(stopRouterErrorMock).toHaveBeenCalledOnce()
    expect(stopRouterAfterEachMock).toHaveBeenCalledOnce()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it.each([true])('observes a failed history Back and lets the user retry it (redirected: %s)', async (redirected) => {
    routerHistoryState.back = '/customs-reports?search=CMR#results'
    wrapper = mount(CustomsDecisionsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
    const button = wrapper.get('button[aria-label="Закрыть"]')
    await button.trigger('click')
    await button.trigger('click')
    expect(routerBackMock).toHaveBeenCalledOnce()

    const handleError = routerOnErrorMock.mock.calls[0][0]
    const from = { fullPath: '/customs-reports/5/decisions' }
    const error = new Error('Route guard failed')
    handleError(error, { fullPath: '/registers' }, from)
    expect(alertErrorMock).not.toHaveBeenCalled()

    const reports = { fullPath: routerHistoryState.back }
    const destination = redirected ? { fullPath: '/login', redirectedFrom: reports } : reports
    handleError(error, destination, from)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось открыть список отчётов')
    expect(alertErrorMock).toHaveBeenCalledOnce()
    expect(stopRouterErrorMock).toHaveBeenCalledOnce()
    expect(stopRouterAfterEachMock).toHaveBeenCalledOnce()
    expect(routerReplaceMock).not.toHaveBeenCalled()
    await button.trigger('click')
    expect(routerBackMock).toHaveBeenCalledTimes(2)
  })

  it('shows a synchronous history error and releases the pending Back', async () => {
    routerHistoryState.back = '/customs-reports'
    routerBackMock.mockImplementationOnce(() => { throw new Error('History failed') })
    wrapper = mount(CustomsDecisionsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
    const button = wrapper.get('button[aria-label="Закрыть"]')
    await button.trigger('click')
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось открыть список отчётов')
    expect(alertErrorMock).toHaveBeenCalledOnce()
    expect(stopRouterErrorMock).toHaveBeenCalledOnce()
    expect(stopRouterAfterEachMock).toHaveBeenCalledOnce()
    await button.trigger('click')
    expect(routerBackMock).toHaveBeenCalledTimes(2)
  })

  it('shows a navigation rejection in the page alert region', async () => {
    const error = new Error('Не удалось открыть список отчётов')
    routerReplaceMock.mockRejectedValueOnce(error)
    wrapper = mount(CustomsDecisionsList, { props: { reportId: 5 }, global: { stubs: testStubs } })
    await wrapper.get('button[aria-label="Закрыть"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain(error.message)
    expect(alertErrorMock).toHaveBeenCalledOnce()
  })

  it('uses page 1 as the page options fallback when current page is empty', async () => {
    customsReportsStoreMock.decisionsTotalCount.value = 10000
    pageRef.value = 0

    wrapper = mount(CustomsDecisionsList, {
      props: { reportId: 5 },
      global: { stubs: testStubs }
    })

    await flushPromises()

    const pageOptions = wrapper.vm.pageOptions
    expect(pageOptions[0]).toEqual({ value: 1, title: '1' })
    expect(pageOptions.some((o) => o.value === 11)).toBe(true)
  })
})
