/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ReturnRegisterEditDialog from '@/dialogs/ReturnRegister_EditDialog.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const warehousesRef = vi.hoisted(() => ({ value: [] }))
const parcelStatusesRef = vi.hoisted(() => ({ value: [] }))
const ensureWarehousesLoaded = vi.hoisted(() => vi.fn())
const ensureCountriesLoaded = vi.hoisted(() => vi.fn())
const ensureOpsLoaded = vi.hoisted(() => vi.fn())
const ensureRegisterStatusesLoaded = vi.hoisted(() => vi.fn())
const ensureParcelStatusesLoaded = vi.hoisted(() => vi.fn())
const getCompaniesAll = vi.hoisted(() => vi.fn())
const getAirportsAll = vi.hoisted(() => vi.fn())
const getReturnRegisterPairs = vi.hoisted(() => vi.fn())
const getRegisters = vi.hoisted(() => vi.fn())
const createReturnRegister = vi.hoisted(() => vi.fn())
const routerPush = vi.hoisted(() => vi.fn())

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store.warehouses !== undefined) {
        return { warehouses: store.warehouses }
      }
      if (store.parcelStatuses !== undefined) {
        return { parcelStatuses: store.parcelStatuses }
      }
      return {}
    }
  }
})

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    warehouses: warehousesRef,
    ensureLoaded: ensureWarehousesLoaded
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    ops: {
      customsProcedures: [
        { value: 1, name: 'Возврат' },
        { value: 31, name: 'Реэкспорт' },
        { value: 60, name: 'Реимпорт' }
      ],
      transportationTypes: []
    },
    ensureOpsLoaded,
    getReturnRegisterPairs,
    getRegisters,
    createReturnRegister
  })
}))

vi.mock('@/stores/companies.store.js', () => ({
  useCompaniesStore: () => ({
    getAll: getCompaniesAll
  })
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({
    ensureLoaded: ensureCountriesLoaded
  })
}))

vi.mock('@/stores/airports.store.js', () => ({
  useAirportsStore: () => ({
    getAll: getAirportsAll
  })
}))

vi.mock('@/stores/register.statuses.store.js', () => ({
  useRegisterStatusesStore: () => ({
    ensureLoaded: ensureRegisterStatusesLoaded
  })
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    parcelStatuses: parcelStatusesRef,
    ensureLoaded: ensureParcelStatusesLoaded
  })
}))

vi.mock('@/router', () => ({
  default: { push: routerPush }
}))

vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    props: ['item', 'icon', 'tooltipText', 'iconSize', 'disabled'],
    emits: ['click'],
    template: '<button type="button" :data-tooltip="tooltipText" :data-icon="icon" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
  }
}))

vi.mock('@/components/WarehouseRegistersTable.vue', () => ({
  default: {
    name: 'WarehouseRegistersTable',
    props: [
      'items',
      'itemsLength',
      'loading',
      'itemsPerPage',
      'page',
      'sortBy',
      'selectedIds',
      'showActions',
      'selectable',
      'linksEnabled',
      'selectionDisabled',
      'showMatchingCount'
    ],
    emits: ['update:selectedIds', 'update:itemsPerPage', 'update:page', 'update:sortBy'],
    methods: {
      label(item) {
        return item.dealNumber || item.fileName || `#${item.id}`
      },
      toggle(item, checked) {
        const selected = new Set(this.selectedIds || [])
        if (checked) {
          selected.add(item.id)
        } else {
          selected.delete(item.id)
        }
        this.$emit('update:selectedIds', Array.from(selected))
      }
    },
    template: `
      <div
        data-testid="registers-table"
        :data-show-actions="String(showActions)"
        :data-links-enabled="String(linksEnabled)"
        :data-selectable="String(selectable)"
      >
        <button
          type="button"
          data-testid="table-sort"
          @click="$emit('update:sortBy', [{ key: 'warehouseArrivalDate', order: 'asc' }])"
        ></button>
        <button
          type="button"
          data-testid="table-page"
          @click="$emit('update:page', 2)"
        ></button>
        <button
          type="button"
          data-testid="table-per-page"
          @click="$emit('update:itemsPerPage', 50)"
        ></button>
        <div v-for="item in items" :key="item.id" class="v-data-table-row">
          <input
            type="checkbox"
            data-testid="register-checkbox"
            :aria-label="label(item)"
            :checked="selectedIds && selectedIds.includes(item.id)"
            :disabled="selectionDisabled"
            @change="toggle(item, $event.target.checked)"
          />
          <span>{{ item.dealNumber || item.fileName || item.id }}</span>
          <span>{{ item.parcelsTotal }}</span>
          <span>{{ item.matchingParcelsCount }}</span>
        </div>
      </div>
    `
  }
}))

function mountDialog() {
  return mount(ReturnRegisterEditDialog, {
    global: {
      stubs: {
        ...vuetifyStubs
      }
    }
  })
}

async function selectWarehouse(wrapper, warehouseId) {
  await wrapper.find('[data-testid="warehouse-select"]').setValue(String(warehouseId))
  await flushPromises()
  await wrapper.vm.$nextTick()
}

async function selectPair(wrapper, senderId = 2, receiverId = 3) {
  await wrapper.find('[data-testid="pair-select"]').setValue(`${senderId}:${receiverId}`)
  await flushPromises()
  await wrapper.vm.$nextTick()
}

function okButton(wrapper) {
  return wrapper.find('[data-tooltip="Создать"]')
}

function cancelButton(wrapper) {
  return wrapper.find('[data-tooltip="Отменить"]')
}

function defaultCriteria(overrides = {}) {
  return {
    customsProcedureCode: 1,
    parcelSelectionMode: 1,
    parcelStatusId: null,
    ...overrides
  }
}

function defaultSourceQuery(overrides = {}) {
  return {
    warehouseId: 1,
    senderCompanyId: 2,
    receiverCompanyId: 3,
    ...defaultCriteria(),
    whOnly: true,
    returnSourceOnly: true,
    page: 1,
    pageSize: 25,
    sortBy: 'id',
    sortOrder: 'desc',
    search: '',
    ...overrides
  }
}

describe('ReturnRegister_EditDialog.vue', () => {
  beforeEach(() => {
    warehousesRef.value = [
      { id: 1, name: 'Warehouse One' },
      { id: 2, name: 'Warehouse Two' }
    ]
    parcelStatusesRef.value = [
      { id: 5, title: 'Parcel status five' },
      { id: 6, title: 'Parcel status six' }
    ]
    ensureWarehousesLoaded.mockReset()
    ensureWarehousesLoaded.mockResolvedValue()
    ensureCountriesLoaded.mockReset()
    ensureCountriesLoaded.mockResolvedValue()
    ensureOpsLoaded.mockReset()
    ensureOpsLoaded.mockResolvedValue()
    ensureRegisterStatusesLoaded.mockReset()
    ensureRegisterStatusesLoaded.mockResolvedValue()
    ensureParcelStatusesLoaded.mockReset()
    ensureParcelStatusesLoaded.mockResolvedValue()
    getCompaniesAll.mockReset()
    getCompaniesAll.mockResolvedValue()
    getAirportsAll.mockReset()
    getAirportsAll.mockResolvedValue()
    getReturnRegisterPairs.mockReset()
    getReturnRegisterPairs.mockResolvedValue([])
    getRegisters.mockReset()
    getRegisters.mockResolvedValue([])
    createReturnRegister.mockReset()
    createReturnRegister.mockResolvedValue({ id: 99 })
    routerPush.mockReset()
  })

  it('loads warehouses on mount and keeps OK disabled initially', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    expect(ensureWarehousesLoaded).toHaveBeenCalledOnce()
    expect(ensureParcelStatusesLoaded).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-testid="return-type-select"]').element.value).toBe('1')
    expect(wrapper.find('[data-testid="selection-mode-select"]').element.value).toBe('1')
    expect(wrapper.find('[data-testid="parcel-status-select"]').exists()).toBe(false)
    expect(okButton(wrapper).attributes('data-icon')).toBe('fa-solid fa-check-double')
    expect(cancelButton(wrapper).attributes('data-icon')).toBe('fa-solid fa-xmark')
    expect(okButton(wrapper).attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('shows no-selection labels for warehouse and pair selects', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    const warehouseEmptyOption = wrapper.find('[data-testid="warehouse-select"]').findAll('option')[0]
    const pairEmptyOption = wrapper.find('[data-testid="pair-select"]').findAll('option')[0]

    expect(warehouseEmptyOption.element.value).toBe('')
    expect(warehouseEmptyOption.text()).toBe('Не выбрано')
    expect(pairEmptyOption.element.value).toBe('')
    expect(pairEmptyOption.text()).toBe('Не выбрано')
  })

  it('auto-selects a single warehouse and tolerates non-array pair results', async () => {
    warehousesRef.value = [{ id: 1, name: 'Warehouse One' }]
    getReturnRegisterPairs.mockResolvedValueOnce(null)

    const wrapper = mountDialog()
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="warehouse-select"]').element.value).toBe('1')
    expect(getReturnRegisterPairs).toHaveBeenCalledWith(1, defaultCriteria())
    expect(wrapper.findAll('[data-testid="register-checkbox"]')).toHaveLength(0)
  })

  it('shows warehouse load fallback errors', async () => {
    warehousesRef.value = null
    ensureWarehousesLoaded.mockRejectedValueOnce({})

    const wrapper = mountDialog()
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="return-register-error"]').text()).toContain('Не удалось загрузить склады')
  })

  it('loads pairs on warehouse change and source registers on pair change', async () => {
    getReturnRegisterPairs.mockResolvedValueOnce([
      {
        senderCompanyId: 2,
        senderCompanyName: 'Sender',
        receiverCompanyId: 3,
        receiverCompanyName: 'Receiver',
        matchingParcelsCount: 3
      }
    ])
    getRegisters.mockResolvedValueOnce([
      { id: 7, dealNumber: 'D-7', date: '2026-06-12T10:00:00Z', redParcelsCount: 2, parcelsTotal: 5 }
    ])

    const wrapper = mountDialog()
    await flushPromises()

    await selectWarehouse(wrapper, 1)
    expect(getReturnRegisterPairs).toHaveBeenCalledWith(1, defaultCriteria())
    expect(wrapper.find('[data-testid="pair-select"]').text()).toContain('Sender')
    expect(wrapper.find('[data-testid="pair-select"]').text()).toContain('Sender / Receiver (3)')

    await selectPair(wrapper)
    expect(getRegisters).toHaveBeenCalledWith(defaultSourceQuery())
    expect(wrapper.find('[data-testid="registers-table"]').text()).toContain('D-7')
  })

  it('requires parcel status before loading status-mode pairs', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    await wrapper.find('[data-testid="selection-mode-select"]').setValue('2')
    await flushPromises()
    expect(wrapper.find('[data-testid="parcel-status-select"]').exists()).toBe(true)

    await selectWarehouse(wrapper, 1)
    expect(getReturnRegisterPairs).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="pair-select"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[data-testid="parcel-status-select"]').setValue('5')
    await flushPromises()

    expect(getReturnRegisterPairs).toHaveBeenCalledWith(1, defaultCriteria({
      parcelSelectionMode: 2,
      parcelStatusId: 5
    }))
  })

  it('resets pair, registers, and selection when return-register criteria changes', async () => {
    getReturnRegisterPairs
      .mockResolvedValueOnce([
        { senderCompanyId: 2, senderCompanyName: 'Sender', receiverCompanyId: 3, receiverCompanyName: 'Receiver' }
      ])
      .mockResolvedValueOnce([
        { senderCompanyId: 2, senderCompanyName: 'Sender', receiverCompanyId: 3, receiverCompanyName: 'Receiver' }
      ])
    getRegisters.mockResolvedValueOnce([
      { id: 7, dealNumber: 'D-7', date: '2026-06-12T10:00:00Z', matchingParcelsCount: 2, parcelsTotal: 5 }
    ])

    const wrapper = mountDialog()
    await flushPromises()
    await selectWarehouse(wrapper, 1)
    await selectPair(wrapper)
    await wrapper.find('[data-testid="register-checkbox"]').setValue(true)
    expect(okButton(wrapper).attributes('disabled')).toBeUndefined()

    await wrapper.find('[data-testid="return-type-select"]').setValue('60')
    await flushPromises()

    expect(getReturnRegisterPairs).toHaveBeenLastCalledWith(1, defaultCriteria({
      customsProcedureCode: 60
    }))
    expect(wrapper.find('[data-testid="pair-select"]').element.value).toBe('')
    expect(wrapper.findAll('[data-testid="register-checkbox"]')).toHaveLength(0)
    expect(okButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('shows source parties as a selectable read-only table with search and sort', async () => {
    getReturnRegisterPairs.mockResolvedValueOnce([
      { senderCompanyId: 2, senderCompanyName: 'Sender', receiverCompanyId: 3, receiverCompanyName: 'Receiver' }
    ])
    getRegisters.mockResolvedValueOnce({
      items: [{ id: 7, dealNumber: 'D-7', parcelsTotal: 5 }],
      pagination: { totalCount: 1 }
    })

    const wrapper = mountDialog()
    await flushPromises()
    await selectWarehouse(wrapper, 1)
    await selectPair(wrapper)

    const table = wrapper.findComponent({ name: 'WarehouseRegistersTable' })
    expect(table.props('showActions')).toBe(false)
    expect(table.props('linksEnabled')).toBe(false)
    expect(table.props('selectable')).toBe(true)
    expect('showMatchingCount' in table.props()).toBe(true)

    await wrapper.find('[data-testid="table-sort"]').trigger('click')
    await flushPromises()
    expect(getRegisters).toHaveBeenLastCalledWith(defaultSourceQuery({
      sortBy: 'warehouseArrivalDate',
      sortOrder: 'asc'
    }))

    await wrapper.find('[data-testid="table-per-page"]').trigger('click')
    await flushPromises()
    expect(getRegisters).toHaveBeenLastCalledWith(defaultSourceQuery({
      pageSize: 50,
      sortBy: 'warehouseArrivalDate',
      sortOrder: 'asc'
    }))

    await wrapper.find('[data-testid="table-page"]').trigger('click')
    await flushPromises()
    expect(getRegisters).toHaveBeenLastCalledWith(defaultSourceQuery({
      page: 2,
      pageSize: 50,
      sortBy: 'warehouseArrivalDate',
      sortOrder: 'asc'
    }))

    vi.useFakeTimers()
    try {
      await wrapper.find('[data-testid="source-register-search"]').setValue('deal')
      vi.advanceTimersByTime(300)
      await flushPromises()

      expect(getRegisters).toHaveBeenLastCalledWith(defaultSourceQuery({
        pageSize: 50,
        sortBy: 'warehouseArrivalDate',
        sortOrder: 'asc',
        search: 'deal'
      }))
    } finally {
      vi.useRealTimers()
    }
  })

  it('clears source data when warehouse selection is cleared', async () => {
    getReturnRegisterPairs.mockResolvedValueOnce([
      { senderCompanyId: 2, senderCompanyName: 'Sender', receiverCompanyId: 3, receiverCompanyName: 'Receiver' }
    ])

    const wrapper = mountDialog()
    await flushPromises()

    await selectWarehouse(wrapper, 1)
    await wrapper.find('[data-testid="warehouse-select"]').setValue('')
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="pair-select"]').element.value).toBe('')
    expect(wrapper.findAll('[data-testid="register-checkbox"]')).toHaveLength(0)
  })

  it('uses fallback labels and supports deselecting registers', async () => {
    getReturnRegisterPairs.mockResolvedValueOnce([
      { senderCompanyId: 2, receiverCompanyId: 3 }
    ])
    getRegisters.mockResolvedValueOnce([
      { id: 7, fileName: 'source.xlsx', date: '2026-06-12T10:00:00Z', redParcelsCount: 2, parcelsTotal: 5 },
      { id: 8, date: '2026-06-12T11:00:00Z', redParcelsCount: 1, parcelsTotal: 1 }
    ])

    const wrapper = mountDialog()
    await flushPromises()
    await selectWarehouse(wrapper, 1)
    expect(wrapper.find('[data-testid="pair-select"]').text()).toContain('2')

    await selectPair(wrapper)
    const checkboxes = wrapper.findAll('[data-testid="register-checkbox"]')
    expect(checkboxes[0].attributes('aria-label')).toContain('source.xlsx')
    expect(checkboxes[1].attributes('aria-label')).toContain('#8')
    expect(wrapper.find('[data-testid="registers-table"]').text()).toContain('source.xlsx')
    expect(wrapper.find('[data-testid="registers-table"]').text()).toContain('8')

    await checkboxes[0].setValue(true)
    expect(okButton(wrapper).attributes('disabled')).toBeUndefined()
    await checkboxes[0].setValue(false)
    expect(okButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('tolerates non-array source-register results', async () => {
    getReturnRegisterPairs.mockResolvedValueOnce([
      { senderCompanyId: 2, senderCompanyName: 'Sender', receiverCompanyId: 3, receiverCompanyName: 'Receiver' }
    ])
    getRegisters.mockResolvedValueOnce(null)

    const wrapper = mountDialog()
    await flushPromises()
    await selectWarehouse(wrapper, 1)
    await selectPair(wrapper)

    expect(wrapper.findAll('[data-testid="register-checkbox"]')).toHaveLength(0)
  })

  it('shows pair lookup errors from API message payloads', async () => {
    getReturnRegisterPairs.mockRejectedValueOnce({ msg: 'Pair lookup failed' })

    const wrapper = mountDialog()
    await flushPromises()
    await selectWarehouse(wrapper, 1)

    expect(wrapper.find('[data-testid="return-register-error"]').text()).toContain('Pair lookup failed')
  })

  it('shows source register lookup fallback errors', async () => {
    getReturnRegisterPairs.mockResolvedValueOnce([
      { senderCompanyId: 2, senderCompanyName: 'Sender', receiverCompanyId: 3, receiverCompanyName: 'Receiver' }
    ])
    getRegisters.mockRejectedValueOnce(null)

    const wrapper = mountDialog()
    await flushPromises()
    await selectWarehouse(wrapper, 1)
    await selectPair(wrapper)

    expect(wrapper.find('[data-testid="return-register-error"]').text()).toContain('Не удалось загрузить реестры')
  })

  it('resets pair, registers, and selection when warehouse changes', async () => {
    getReturnRegisterPairs
      .mockResolvedValueOnce([
        { senderCompanyId: 2, senderCompanyName: 'Sender', receiverCompanyId: 3, receiverCompanyName: 'Receiver' }
      ])
      .mockResolvedValueOnce([
        { senderCompanyId: 4, senderCompanyName: 'Other Sender', receiverCompanyId: 5, receiverCompanyName: 'Other Receiver' }
      ])
    getRegisters.mockResolvedValueOnce([
      { id: 7, dealNumber: 'D-7', date: '2026-06-12T10:00:00Z', redParcelsCount: 2, parcelsTotal: 5 }
    ])

    const wrapper = mountDialog()
    await flushPromises()
    await selectWarehouse(wrapper, 1)
    await selectPair(wrapper)
    await wrapper.find('[data-testid="register-checkbox"]').setValue(true)
    expect(okButton(wrapper).attributes('disabled')).toBeUndefined()

    await selectWarehouse(wrapper, 2)

    expect(getReturnRegisterPairs).toHaveBeenLastCalledWith(2, defaultCriteria())
    expect(wrapper.find('[data-testid="pair-select"]').element.value).toBe('')
    expect(wrapper.findAll('[data-testid="register-checkbox"]')).toHaveLength(0)
    expect(okButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('enables OK after selecting warehouse, pair, and at least one register', async () => {
    getReturnRegisterPairs.mockResolvedValueOnce([
      { senderCompanyId: 2, senderCompanyName: 'Sender', receiverCompanyId: 3, receiverCompanyName: 'Receiver' }
    ])
    getRegisters.mockResolvedValueOnce([
      { id: 7, dealNumber: 'D-7', date: '2026-06-12T10:00:00Z', redParcelsCount: 2, parcelsTotal: 5 }
    ])

    const wrapper = mountDialog()
    await flushPromises()
    await selectWarehouse(wrapper, 1)
    await selectPair(wrapper)

    expect(okButton(wrapper).attributes('disabled')).toBeDefined()
    await wrapper.find('[data-testid="register-checkbox"]').setValue(true)
    await wrapper.vm.$nextTick()
    expect(okButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('routes back to warehouse registers on cancel', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    await cancelButton(wrapper).trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/registers?mode=modeWarehouse')
  })

  it('creates return register and routes to the new register parcels', async () => {
    getReturnRegisterPairs.mockResolvedValueOnce([
      { senderCompanyId: 2, senderCompanyName: 'Sender', receiverCompanyId: 3, receiverCompanyName: 'Receiver' }
    ])
    getRegisters.mockResolvedValueOnce([
      { id: 7, dealNumber: 'D-7', date: '2026-06-12T10:00:00Z', redParcelsCount: 2, parcelsTotal: 5 },
      { id: 8, dealNumber: 'D-8', date: '2026-06-12T11:00:00Z', redParcelsCount: 1, parcelsTotal: 1 }
    ])
    createReturnRegister.mockResolvedValueOnce({ id: 99 })

    const wrapper = mountDialog()
    await flushPromises()
    await selectWarehouse(wrapper, 1)
    await selectPair(wrapper)

    const checkboxes = wrapper.findAll('[data-testid="register-checkbox"]')
    await checkboxes[0].setValue(true)
    await checkboxes[1].setValue(true)
    await okButton(wrapper).trigger('click')
    await flushPromises()

    expect(createReturnRegister).toHaveBeenCalledWith({
      warehouseId: 1,
      senderCompanyId: 2,
      receiverCompanyId: 3,
      ...defaultCriteria(),
      registerIds: [7, 8]
    })
    expect(routerPush).toHaveBeenCalledWith('/registers/99/parcels?mode=modeWarehouse')
  })

  it('creates return register with selected type and parcel-status criteria', async () => {
    getReturnRegisterPairs.mockResolvedValueOnce([
      { senderCompanyId: 2, senderCompanyName: 'Sender', receiverCompanyId: 3, receiverCompanyName: 'Receiver', matchingParcelsCount: 2 }
    ])
    getRegisters.mockResolvedValueOnce([
      { id: 7, dealNumber: 'D-7', date: '2026-06-12T10:00:00Z', matchingParcelsCount: 2, parcelsTotal: 5 }
    ])
    createReturnRegister.mockResolvedValueOnce({ id: 100 })

    const wrapper = mountDialog()
    await flushPromises()
    await wrapper.find('[data-testid="return-type-select"]').setValue('60')
    await wrapper.find('[data-testid="selection-mode-select"]').setValue('2')
    await wrapper.find('[data-testid="parcel-status-select"]').setValue('5')
    await selectWarehouse(wrapper, 1)
    await selectPair(wrapper)
    await wrapper.find('[data-testid="register-checkbox"]').setValue(true)
    await okButton(wrapper).trigger('click')
    await flushPromises()

    expect(getReturnRegisterPairs).toHaveBeenCalledWith(1, defaultCriteria({
      customsProcedureCode: 60,
      parcelSelectionMode: 2,
      parcelStatusId: 5
    }))
    expect(getRegisters).toHaveBeenCalledWith(defaultSourceQuery({
      customsProcedureCode: 60,
      parcelSelectionMode: 2,
      parcelStatusId: 5
    }))
    expect(createReturnRegister).toHaveBeenCalledWith({
      warehouseId: 1,
      senderCompanyId: 2,
      receiverCompanyId: 3,
      customsProcedureCode: 60,
      parcelSelectionMode: 2,
      parcelStatusId: 5,
      registerIds: [7]
    })
    expect(routerPush).toHaveBeenCalledWith('/registers/100/parcels?mode=modeWarehouse')
  })

  it('displays create errors', async () => {
    getReturnRegisterPairs.mockResolvedValueOnce([
      { senderCompanyId: 2, senderCompanyName: 'Sender', receiverCompanyId: 3, receiverCompanyName: 'Receiver' }
    ])
    getRegisters.mockResolvedValueOnce([
      { id: 7, dealNumber: 'D-7', date: '2026-06-12T10:00:00Z', redParcelsCount: 2, parcelsTotal: 5 }
    ])
    createReturnRegister.mockRejectedValueOnce(new Error('No red parcels'))

    const wrapper = mountDialog()
    await flushPromises()
    await selectWarehouse(wrapper, 1)
    await selectPair(wrapper)
    await wrapper.find('[data-testid="register-checkbox"]').setValue(true)
    await okButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="return-register-error"]').text()).toContain('No red parcels')
    expect(routerPush).not.toHaveBeenCalledWith('/registers/99/parcels?mode=modeWarehouse')
  })

  it('displays an error when creation response has no id', async () => {
    getReturnRegisterPairs.mockResolvedValueOnce([
      { senderCompanyId: 2, senderCompanyName: 'Sender', receiverCompanyId: 3, receiverCompanyName: 'Receiver' }
    ])
    getRegisters.mockResolvedValueOnce([
      { id: 7, dealNumber: 'D-7', date: '2026-06-12T10:00:00Z', redParcelsCount: 2, parcelsTotal: 5 }
    ])
    createReturnRegister.mockResolvedValueOnce({})

    const wrapper = mountDialog()
    await flushPromises()
    await selectWarehouse(wrapper, 1)
    await selectPair(wrapper)
    await wrapper.find('[data-testid="register-checkbox"]').setValue(true)
    await okButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="return-register-error"]').text()).toContain('Сервер не вернул номер')
  })
})
