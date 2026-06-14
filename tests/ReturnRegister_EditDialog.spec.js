/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ReturnRegisterEditDialog from '@/dialogs/ReturnRegister_EditDialog.vue'

const warehousesRef = vi.hoisted(() => ({ value: [] }))
const ensureWarehousesLoaded = vi.hoisted(() => vi.fn())
const getReturnRegisterPairs = vi.hoisted(() => vi.fn())
const getReturnRegisterSourceRegisters = vi.hoisted(() => vi.fn())
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
    getReturnRegisterPairs,
    getReturnRegisterSourceRegisters,
    createReturnRegister
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

function mountDialog() {
  return mount(ReturnRegisterEditDialog, {
    global: {
      stubs: {
        'v-card': { template: '<div class="v-card-stub"><slot /></div>' }
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

describe('ReturnRegister_EditDialog.vue', () => {
  beforeEach(() => {
    warehousesRef.value = [
      { id: 1, name: 'Warehouse One' },
      { id: 2, name: 'Warehouse Two' }
    ]
    ensureWarehousesLoaded.mockReset()
    ensureWarehousesLoaded.mockResolvedValue()
    getReturnRegisterPairs.mockReset()
    getReturnRegisterPairs.mockResolvedValue([])
    getReturnRegisterSourceRegisters.mockReset()
    getReturnRegisterSourceRegisters.mockResolvedValue([])
    createReturnRegister.mockReset()
    createReturnRegister.mockResolvedValue({ id: 99 })
    routerPush.mockReset()
  })

  it('loads warehouses on mount and keeps OK disabled initially', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    expect(ensureWarehousesLoaded).toHaveBeenCalledOnce()
    expect(okButton(wrapper).attributes('data-icon')).toBe('fa-solid fa-check-double')
    expect(cancelButton(wrapper).attributes('data-icon')).toBe('fa-solid fa-xmark')
    expect(okButton(wrapper).attributes('disabled')).toBeDefined()
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
    expect(getReturnRegisterPairs).toHaveBeenCalledWith(1)
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
        receiverCompanyName: 'Receiver'
      }
    ])
    getReturnRegisterSourceRegisters.mockResolvedValueOnce([
      { id: 7, dealNumber: 'D-7', date: '2026-06-12T10:00:00Z', redParcelsCount: 2, parcelsTotal: 5 }
    ])

    const wrapper = mountDialog()
    await flushPromises()

    await selectWarehouse(wrapper, 1)
    expect(getReturnRegisterPairs).toHaveBeenCalledWith(1)
    expect(wrapper.find('[data-testid="pair-select"]').text()).toContain('Sender')

    await selectPair(wrapper)
    expect(getReturnRegisterSourceRegisters).toHaveBeenCalledWith({
      warehouseId: 1,
      senderCompanyId: 2,
      receiverCompanyId: 3
    })
    expect(wrapper.find('[data-testid="registers-table"]').text()).toContain('D-7')
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
    getReturnRegisterSourceRegisters.mockResolvedValueOnce([
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
    getReturnRegisterSourceRegisters.mockResolvedValueOnce(null)

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
    getReturnRegisterSourceRegisters.mockRejectedValueOnce(null)

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
    getReturnRegisterSourceRegisters.mockResolvedValueOnce([
      { id: 7, dealNumber: 'D-7', date: '2026-06-12T10:00:00Z', redParcelsCount: 2, parcelsTotal: 5 }
    ])

    const wrapper = mountDialog()
    await flushPromises()
    await selectWarehouse(wrapper, 1)
    await selectPair(wrapper)
    await wrapper.find('[data-testid="register-checkbox"]').setValue(true)
    expect(okButton(wrapper).attributes('disabled')).toBeUndefined()

    await selectWarehouse(wrapper, 2)

    expect(getReturnRegisterPairs).toHaveBeenLastCalledWith(2)
    expect(wrapper.find('[data-testid="pair-select"]').element.value).toBe('')
    expect(wrapper.findAll('[data-testid="register-checkbox"]')).toHaveLength(0)
    expect(okButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('enables OK after selecting warehouse, pair, and at least one register', async () => {
    getReturnRegisterPairs.mockResolvedValueOnce([
      { senderCompanyId: 2, senderCompanyName: 'Sender', receiverCompanyId: 3, receiverCompanyName: 'Receiver' }
    ])
    getReturnRegisterSourceRegisters.mockResolvedValueOnce([
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
    getReturnRegisterSourceRegisters.mockResolvedValueOnce([
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
      registerIds: [7, 8]
    })
    expect(routerPush).toHaveBeenCalledWith('/registers/99/parcels?mode=modeWarehouse')
  })

  it('displays create errors', async () => {
    getReturnRegisterPairs.mockResolvedValueOnce([
      { senderCompanyId: 2, senderCompanyName: 'Sender', receiverCompanyId: 3, receiverCompanyName: 'Receiver' }
    ])
    getReturnRegisterSourceRegisters.mockResolvedValueOnce([
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
    getReturnRegisterSourceRegisters.mockResolvedValueOnce([
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
