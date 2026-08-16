/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import BoxesList from '@/lists/Boxes_List.vue'
import ActionButton from '@/components/ActionButton.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const mockBoxes = ref([])
const mockBoxesLoading = ref(false)
const mockRegister = ref({})
const mockRegisterLoading = ref(false)
const mockAlert = ref(null)

const boxesGetAll = vi.fn()
const registerGetById = vi.fn()
const ensureOpsLoaded = vi.fn()
const routerPush = vi.hoisted(() => vi.fn())

const boxesStore = {
  boxes: mockBoxes,
  loading: mockBoxesLoading,
  getAll: boxesGetAll
}

const registersStore = {
  item: mockRegister,
  loading: mockRegisterLoading,
  getById: registerGetById,
  ensureOpsLoaded,
  getTransportationDocument: vi.fn((id) => `ТСД ${id}`)
}

const authStore = {
  boxes_per_page: 25,
  boxes_search: '',
  boxes_sort_by: [{ key: 'code', order: 'asc' }],
  boxes_page: 2
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store.boxes !== undefined) {
        return { boxes: mockBoxes, loading: mockBoxesLoading }
      }
      return { item: mockRegister, loading: mockRegisterLoading }
    }
  }
})

vi.mock('@/stores/boxes.store.js', () => ({ useBoxesStore: () => boxesStore }))
vi.mock('@/stores/registers.store.js', () => ({ useRegistersStore: () => registersStore }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => authStore }))
vi.mock('@/router', () => ({ default: { push: routerPush } }))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    error: (error, options = {}) => {
      mockAlert.value = {
        message: error?.message || options.fallback,
        action: options.action
      }
    }
  })
}))

vi.mock('@/components/PageAlertRegion.vue', () => ({
  default: {
    setup: () => ({ mockAlert }),
    template:
      '<div data-testid="page-alert-region"><span>{{ mockAlert?.message }}</span><button v-if="mockAlert?.action" data-testid="alert-retry" @click="mockAlert.action.handler()">Повторить</button></div>'
  }
}))

vi.mock('@mdi/js', () => ({ mdiMagnify: 'mdi-magnify' }))

function createWrapper() {
  return mount(BoxesList, {
    props: { registerId: 42 },
    global: {
      stubs: vuetifyStubs
    }
  })
}

describe('Boxes_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAlert.value = null
    authStore.boxes_per_page = 25
    authStore.boxes_search = ''
    authStore.boxes_sort_by = [{ key: 'code', order: 'asc' }]
    authStore.boxes_page = 2
    mockRegister.value = {
      id: 42,
      dealNumber: 'DEAL-42',
      transportationTypeCode: 2,
      invoiceNumber: 'INV-42',
      readOnly: false
    }
    mockBoxes.value = [
      {
        id: 7,
        registerId: 42,
        code: 'BOX-7',
        lengthCm: 10.5,
        widthCm: null,
        heightCm: 30.25,
        weightKg: 4.125
      }
    ]
    ensureOpsLoaded.mockResolvedValue()
    registerGetById.mockResolvedValue(mockRegister.value)
    boxesGetAll.mockResolvedValue(mockBoxes.value)
  })

  it('loads register context and boxes and renders locale-aware metrics', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(ensureOpsLoaded).toHaveBeenCalled()
    expect(registerGetById).toHaveBeenCalledWith(42)
    expect(boxesGetAll).toHaveBeenCalledWith(42)
    expect(wrapper.get('h1').text()).toContain('DEAL-42')
    expect(wrapper.get('[data-testid="v-data-table"]').text()).toContain('BOX-7')
    expect(wrapper.get('[data-testid="v-data-table"]').text()).toContain('10,5')
    expect(wrapper.get('[data-testid="v-data-table"]').text()).toContain('4,125')
    expect(wrapper.get('[data-testid="v-data-table"]').text()).toContain('—')
    expect(wrapper.findAll('[data-testid="page-alert-region"]')).toHaveLength(1)
  })

  it('binds persisted controls and searches by code', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const table = wrapper.findComponent(vuetifyStubs['v-data-table'])
    expect(table.props('itemsPerPage')).toBe(25)
    expect(table.props('page')).toBe(2)
    expect(table.props('sortBy')).toEqual([{ key: 'code', order: 'asc' }])
    expect(table.props('customFilter')(null, 'box-7', { raw: mockBoxes.value[0] })).toBe(true)
    expect(table.props('customFilter')(null, 'missing', { raw: mockBoxes.value[0] })).toBe(false)
    expect(table.props('customFilter')(null, null, mockBoxes.value[0])).toBe(true)
    expect(table.props('customFilter')(null, 'box', {})).toBe(false)

    table.vm.$emit('update:itemsPerPage', 50)
    table.vm.$emit('update:page', 3)
    table.vm.$emit('update:sortBy', [{ key: 'weightKg', order: 'desc' }])
    await wrapper.vm.$nextTick()
    expect(authStore.boxes_per_page).toBe(50)
    expect(authStore.boxes_page).toBe(3)
    expect(authStore.boxes_sort_by).toEqual([{ key: 'weightKg', order: 'desc' }])

    await wrapper.get('[data-testid="v-text-field"] input').setValue('BOX')
    expect(authStore.boxes_search).toBe('BOX')
  })

  it('navigates to create, edit, and warehouse registers', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    wrapper.vm.openCreateView()
    wrapper.vm.openEditView(mockBoxes.value[0])
    wrapper.vm.close()

    expect(routerPush).toHaveBeenNthCalledWith(1, '/registers/42/boxes/create')
    expect(routerPush).toHaveBeenNthCalledWith(2, '/registers/42/boxes/edit/7')
    expect(routerPush).toHaveBeenNthCalledWith(3, {
      path: '/registers',
      query: { mode: 'modeWarehouse' }
    })
  })

  it('disables create and edit for read-only registers', async () => {
    mockRegister.value = { ...mockRegister.value, readOnly: true }
    registerGetById.mockResolvedValue(mockRegister.value)
    const wrapper = createWrapper()
    await flushPromises()

    const actions = wrapper.findAllComponents(ActionButton)
    const create = actions.find((item) => item.props('tooltipText') === 'Создать коробку')
    const edit = actions.find((item) => item.props('tooltipText') === 'Редактировать коробку')
    expect(create.props('disabled')).toBe(true)
    expect(edit.props('disabled')).toBe(true)

    wrapper.vm.openCreateView()
    wrapper.vm.openEditView(mockBoxes.value[0])
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('shows a retryable load error and successfully retries', async () => {
    boxesGetAll.mockRejectedValueOnce(new Error('boxes unavailable')).mockResolvedValue(mockBoxes.value)
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain('boxes unavailable')
    expect(routerPush).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="alert-retry"]').trigger('click')
    await flushPromises()
    expect(boxesGetAll).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[data-testid="v-data-table"]').text()).toContain('BOX-7')
  })
})
