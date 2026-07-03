/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomsProcessingRegistersTable from '@/components/CustomsProcessingRegistersTable.vue'

const opsRef = vi.hoisted(() => ({ value: { customsProcedures: [], transportationTypes: [] } }))
const companiesRef = vi.hoisted(() => ({ value: [] }))
const countriesRef = vi.hoisted(() => ({ value: [] }))
const airportsRef = vi.hoisted(() => ({ value: [] }))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store.ops !== undefined) return { ops: store.ops }
      if (store.companies !== undefined) return { companies: store.companies }
      if (store.countries !== undefined) return { countries: store.countries }
      if (store.airports !== undefined) return { airports: store.airports }
      return {}
    }
  }
})

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    ops: opsRef,
    getOpsLabel: vi.fn(() => 'ИМ40'),
    getTransportationDocument: vi.fn(() => 'CMR')
  })
}))

vi.mock('@/stores/companies.store.js', () => ({
  useCompaniesStore: () => ({ companies: companiesRef })
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({ countries: countriesRef })
}))

vi.mock('@/stores/airports.store.js', () => ({
  useAirportsStore: () => ({ airports: airportsRef })
}))

vi.mock('@/stores/register.statuses.store.js', () => ({
  useRegisterStatusesStore: () => ({
    getStatusById: vi.fn((id) => id
      ? { id, title: `Register Status ${id}`, icon: 'svg:very-delivered', bkColor: '#00AA00', fgColor: '#FFFFFF' }
      : null
    ),
    getStatusTitle: vi.fn((id) => `Register Status ${id}`)
  })
}))

vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    props: ['item', 'icon', 'tooltipText', 'disabled'],
    emits: ['click'],
    template: '<button type="button" class="action-button-stub" :data-icon="icon" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
  }
}))

vi.mock('@/components/ClickableCell.vue', () => ({
  default: {
    props: ['item', 'displayValue', 'cellClass'],
    emits: ['click'],
    template: '<span :class="cellClass" @click="$emit(\'click\', item)"><slot>{{ displayValue }}</slot></span>'
  }
}))

vi.mock('@/components/RegisterInvoiceCell.vue', () => ({ default: { template: '<span />' } }))
vi.mock('@/components/SenderRecipientCell.vue', () => ({ default: { template: '<span />' } }))
vi.mock('@/components/SortableMultilineHeader.vue', () => ({ default: { template: '<span />' } }))

const registerStatusOptions = [
  { id: 2, title: 'Current' },
  { id: 5, title: 'Next' }
]

function mountTable(props = {}) {
  return mount(CustomsProcessingRegistersTable, {
    props: {
      items: [],
      itemsLength: 0,
      itemsPerPage: 25,
      page: 1,
      sortBy: [{ key: 'id', order: 'desc' }],
      registerStatusOptions,
      ...props
    },
    global: {
      stubs: {
        'v-card': {
          template: '<div><slot /></div>'
        },
        'v-data-table-server': {
          props: ['headers', 'items'],
          template: `
            <div>
              <div data-testid="header-keys">{{ headers.map(header => header.key).join(',') }}</div>
              <div v-for="item in items" :key="item.id" data-testid="row">
                <slot name="item.actions" :item="item" />
                <slot name="item.dealNumber" :item="item" />
                <slot name="item.weight" :item="item" />
              </div>
            </div>
          `
        },
        'v-select': {
          props: ['modelValue', 'items', 'itemTitle', 'itemValue', 'disabled'],
          emits: ['update:modelValue'],
          template: `
            <select data-testid="register-status-select" :value="modelValue" :disabled="disabled" @change="$emit('update:modelValue', Number($event.target.value))">
              <option v-for="item in items" :key="item[itemValue]" :value="item[itemValue]">{{ item[itemTitle] }}</option>
            </select>
          `
        },
        'v-tooltip': {
          template: '<span><slot name="activator" :props="{}" /><slot /></span>'
        },
        'font-awesome-icon': true
      }
    }
  })
}

describe('CustomsProcessingRegistersTable', () => {
  it('renders extracted customs-processing register headers and status icon', () => {
    const wrapper = mountTable({
      items: [{ id: 1, statusId: 2 }]
    })

    expect(wrapper.find('[data-testid="header-keys"]').text()).toBe(
      'actions,dealNumber,invoice,countries,senderRecipient,parcelsTotal,weight,price,date'
    )
    expect(wrapper.find('[data-testid="register-status-icon"]').exists()).toBe(true)
    expect(wrapper.find('.register-status-action-button--readonly').attributes('title')).toBe('Register Status 2')
  })

  it('opens inline register status selector from the status icon', async () => {
    const startRegisterStatusChange = vi.fn()
    const wrapper = mountTable({
      items: [{ id: 1, statusId: 2 }],
      canChangeRegisterStatus: true,
      startRegisterStatusChange
    })

    await wrapper.find('.register-status-action-button').trigger('click')

    expect(startRegisterStatusChange).toHaveBeenCalledWith(1, 2)
  })

  it('selects, applies, and cancels register status changes inline', async () => {
    const setSelectedRegisterStatusId = vi.fn()
    const applyRegisterStatusChange = vi.fn()
    const cancelRegisterStatusChange = vi.fn()
    const wrapper = mountTable({
      items: [{ id: 1, statusId: 2 }],
      canChangeRegisterStatus: true,
      isRegisterStatusEditMode: () => true,
      getSelectedRegisterStatusId: () => 5,
      setSelectedRegisterStatusId,
      applyRegisterStatusChange,
      cancelRegisterStatusChange
    })

    await wrapper.find('[data-testid="register-status-select"]').setValue('5')
    await wrapper.find('[data-icon="fa-solid fa-check"]').trigger('click')
    await wrapper.find('[data-icon="fa-solid fa-xmark"]').trigger('click')

    expect(setSelectedRegisterStatusId).toHaveBeenCalledWith(1, 5)
    expect(applyRegisterStatusChange).toHaveBeenCalledWith(1, 5, 2)
    expect(cancelRegisterStatusChange).toHaveBeenCalledWith(1)
  })

  it('disables applying an unchanged register status', () => {
    const wrapper = mountTable({
      items: [{ id: 1, statusId: 2 }],
      canChangeRegisterStatus: true,
      isRegisterStatusEditMode: () => true,
      getSelectedRegisterStatusId: () => 2
    })

    expect(wrapper.find('[data-icon="fa-solid fa-check"]').attributes('disabled')).toBeDefined()
  })

  it('keeps full register edit on the pen action', async () => {
    const wrapper = mountTable({
      items: [{ id: 7, statusId: 2 }],
      isSrLogistPlus: true
    })

    await wrapper.find('[data-icon="fa-solid fa-pen"]').trigger('click')

    expect(wrapper.emitted('edit-register')?.[0]).toEqual([{ id: 7, statusId: 2 }])
  })

  it('runs custom charges calculation from the calculator action', async () => {
    const calculateCustomCharges = vi.fn()
    const wrapper = mountTable({
      items: [{ id: 7, statusId: 2 }],
      isSrLogistPlus: true,
      calculateCustomCharges
    })

    await wrapper.find('[data-icon="fa-solid fa-calculator"]').trigger('click')

    expect(calculateCustomCharges).toHaveBeenCalledWith({ id: 7, statusId: 2 })
  })

  it('opens parcel status bulk dialog from the independent action', async () => {
    const openParcelStatusBulkDialog = vi.fn()
    const wrapper = mountTable({
      items: [{ id: 7, statusId: 2 }],
      isSrLogistPlus: true,
      openParcelStatusBulkDialog
    })

    await wrapper.find('[data-icon="fa-solid fa-pen-to-square"]').trigger('click')

    expect(openParcelStatusBulkDialog).toHaveBeenCalledWith(7)
    expect(wrapper.find('[data-testid="register-status-select"]').exists()).toBe(false)
  })

  it('keeps navigation cells and copied weight display behavior', async () => {
    const wrapper = mountTable({
      items: [{
        id: 3,
        dealNumber: 'D-3',
        statusId: 2,
        totalWeightKg: 12.345,
        totalWeightKgToRelease: 10,
        realWeightKg: 5
      }]
    })

    await wrapper.find('.open-parcels-link').trigger('click')

    expect(wrapper.emitted('open-parcels')?.[0][0].id).toBe(3)
    expect(wrapper.find('[data-testid="register-weight-cell"]').text()).toContain('12.345')
    expect(wrapper.find('[data-testid="register-weight-cell"]').text()).toContain('10.000')
    expect(wrapper.find('[data-testid="register-weight-cell"]').text()).toContain('5.000')
  })
})
