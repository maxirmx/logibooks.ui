/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import CustomsReportRowsList from '@/lists/CustomsReportRows_List.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const reportRowsRef = ref([])
const loadingRef = ref(false)
const errorRef = ref(null)
const alertRef = ref(null)
const perPageRef = ref(10)
const sortByRef = ref([{ key: 'rowNumber', order: 'asc' }])
const pageRef = ref(1)

const getReportRowsMock = vi.hoisted(() => vi.fn())
const clearMock = vi.hoisted(() => vi.fn())

let decsStoreMock
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

vi.mock('@/router', () => ({
  default: {
    push: routerPushMock
  }
}))

describe('CustomsReportRows_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reportRowsRef.value = []
    loadingRef.value = false
    errorRef.value = null
    alertRef.value = null

    decsStoreMock = {
      reportRows: reportRowsRef,
      loading: loadingRef,
      error: errorRef,
      getReportRows: getReportRowsMock
    }

    alertStoreMock = {
      alert: alertRef,
      clear: clearMock
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
      }
    })
  })

  it('loads report rows on mount', async () => {
    mount(CustomsReportRowsList, {
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

    const wrapper = mount(CustomsReportRowsList, {
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

  it('navigates back when back button is clicked', async () => {
    const wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    const backButton = wrapper.find('button.btn-secondary')
    expect(backButton.exists()).toBe(true)

    await backButton.trigger('click')
    expect(routerPushMock).toHaveBeenCalledWith('/customs-reports')
  })

  it('displays loading indicator when loading', async () => {
    loadingRef.value = true

    const wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(wrapper.find('.spinner-border').exists()).toBe(true)
  })

  it('displays error message when there is an error', async () => {
    errorRef.value = new Error('Failed to load rows')

    const wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 5 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Ошибка при загрузке информации')
  })

  it('displays report ID in header', async () => {
    const wrapper = mount(CustomsReportRowsList, {
      props: { reportId: 42 },
      global: {
        stubs: testStubs
      }
    })

    await flushPromises()

    expect(wrapper.find('h1').text()).toContain('Строки отчёта №42')
  })
})
