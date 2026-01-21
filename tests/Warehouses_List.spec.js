/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import WarehousesList from '@/lists/Warehouses_List.vue'
import { defaultGlobalStubs } from './helpers/test-utils'

const additionalStubs = {
  'v-alert': {
    template: '<div class="v-alert-stub" data-testid="v-alert"><slot></slot></div>',
    props: ['type', 'text', 'dismissible']
  },
  'v-spacer': {
    template: '<div class="v-spacer-stub" data-testid="v-spacer"></div>'
  },
  'font-awesome-icon': {
    template: '<i class="fa-icon-stub" data-testid="fa-icon"></i>',
    props: ['size', 'icon', 'class']
  }
}

const testStubs = {
  ...defaultGlobalStubs,
  ...additionalStubs
}

const mockWarehouses = ref([
  {
    id: 1,
    name: 'Основной склад',
    countryIsoNumeric: 643,
    postalCode: '123456',
    city: 'Москва',
    street: 'ул. Тестовая',
    type: 0
  }
])

const mockCountries = ref([
  { id: 1, isoNumeric: 643, nameRuOfficial: 'Россия' },
  { id: 2, isoNumeric: 840, nameRuOfficial: 'США' }
])

const getAllWarehouses = vi.hoisted(() => vi.fn())
const countriesEnsureLoaded = vi.hoisted(() => vi.fn())
const deleteWarehouseFn = vi.hoisted(() => vi.fn())
const errorFn = vi.hoisted(() => vi.fn())
const confirmMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const mockPush = vi.hoisted(() => vi.fn())

const router = vi.hoisted(() => ({
  push: mockPush
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: () => ({
      warehouses: mockWarehouses,
      loading: ref(false),
      alert: ref(null)
    })
  }
})

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    warehouses: mockWarehouses,
    loading: false,
    getAll: getAllWarehouses,
    remove: deleteWarehouseFn
  })
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({
    countries: mockCountries,
    ensureLoaded: countriesEnsureLoaded,
    getCountryShortName: vi.fn((code) => {
      const num = Number(code)
      const country = mockCountries.value.find(c => c.isoNumeric === num)
      if (!country) return code
      return country.nameRuShort || country.nameRuOfficial || code
    })
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: null,
    error: errorFn,
    clear: vi.fn()
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    isAdmin: true,
    isSrLogistPlus: true,
    warehouses_per_page: 10,
    warehouses_search: '',
    warehouses_sort_by: ['id'],
    warehouses_page: 1
  })
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('@/router', () => ({
  default: router
}), { virtual: true })

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [10, 25, 50, 100]
}))

vi.mock('@mdi/js', () => ({
  mdiMagnify: 'mdi-magnify'
}))

describe('Warehouses_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls getAll methods on mount', async () => {
    const wrapper = mount(WarehousesList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.$nextTick()

    expect(getAllWarehouses).toHaveBeenCalled()
    expect(countriesEnsureLoaded).toHaveBeenCalled()
    expect(wrapper.exists()).toBe(true)
  })

  it('handles empty warehouses array', async () => {
    mockWarehouses.value = []
    const wrapper = mount(WarehousesList, {
      global: {
        stubs: testStubs
      }
    })
    expect(wrapper.exists()).toBe(true)
    mockWarehouses.value = [
      {
        id: 1,
        name: 'Основной склад',
        countryIsoNumeric: 643,
        postalCode: '123456',
        city: 'Москва',
        street: 'ул. Тестовая',
        type: 0
      }
    ]
  })

  it('handles search input', async () => {
    const wrapper = mount(WarehousesList, {
      global: {
        stubs: testStubs
      }
    })

    const authStore = wrapper.vm.authStore
    const searchInput = wrapper.findComponent({ name: 'v-text-field' }) || wrapper.find('input[type="text"]')
    if (searchInput.exists()) {
      await searchInput.setValue('Склад')
      await searchInput.trigger('input')

      expect(authStore.warehouses_search).toBe('Склад')
    }
  })

  it('maps warehouse type labels', async () => {
    const wrapper = mount(WarehousesList, {
      global: {
        stubs: testStubs
      }
    })

    expect(wrapper.vm.getTypeLabel(0)).toBe('Склад временного хранения')
    expect(wrapper.vm.getTypeLabel(1)).toBe('Сортировочный склад')
    expect(wrapper.vm.getTypeLabel(5)).toBe(5)
  })

  it('navigates to create page when add link is clicked', async () => {
    const wrapper = mount(WarehousesList, {
      global: {
        stubs: testStubs
      }
    })

    await wrapper.vm.openCreateDialog()
    expect(router.push).toHaveBeenCalledWith('/warehouse/create')
  })

  it('navigates to edit page when edit is called', async () => {
    const wrapper = mount(WarehousesList, {
      global: {
        stubs: {
          ...testStubs,
          'v-data-table': {
            template: `<div><slot name="item.actions" :item="{ id: 1, name: 'Основной склад' }"></slot></div>`
          }
        }
      }
    })

    const warehouse = { id: 1, name: 'Основной склад' }
    await wrapper.vm.openEditDialog(warehouse)

    expect(router.push).toHaveBeenCalledWith('/warehouse/edit/1')
  })

  it('calls delete function when delete button is clicked', async () => {
    const wrapper = mount(WarehousesList, {
      global: {
        stubs: {
          ...testStubs,
          'v-data-table': {
            template: `<div><slot name="item.actions" :item="{ id: 1, name: 'Основной склад' }"></slot></div>`
          }
        }
      }
    })

    const warehouse = { id: 1, name: 'Основной склад' }
    await wrapper.vm.deleteWarehouse(warehouse)

    expect(confirmMock).toHaveBeenCalled()
    expect(deleteWarehouseFn).toHaveBeenCalledWith(1)
  })

  it('does not delete warehouse when confirmation is declined', async () => {
    confirmMock.mockResolvedValue(false)

    const wrapper = mount(WarehousesList, {
      global: {
        stubs: {
          ...testStubs,
          'v-data-table': {
            template: `<div><slot name="item.actions" :item="{ id: 1, name: 'Основной склад' }"></slot></div>`
          }
        }
      }
    })

    const warehouse = { id: 1, name: 'Основной склад' }
    await wrapper.vm.deleteWarehouse(warehouse)

    expect(confirmMock).toHaveBeenCalled()
    expect(deleteWarehouseFn).not.toHaveBeenCalled()
  })
})
