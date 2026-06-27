/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WarehouseRegistersTable from '@/components/WarehouseRegistersTable.vue'
import { createWarehouseRegisterHeaders } from '@/helpers/warehouse.registers.table.helpers.js'

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
    getOpsLabel: vi.fn(() => 'Возврат'),
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

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    getWarehouseName: vi.fn((id) => `Warehouse ${id}`)
  })
}))

vi.mock('@/stores/register.statuses.store.js', () => ({
  useRegisterStatusesStore: () => ({
    getStatusById: vi.fn((id) => id
      ? { id, title: `Status ${id}`, icon: 'svg:very-delivered', bkColor: '#00AA00', fgColor: '#FFFFFF' }
      : null
    ),
    getStatusTitle: vi.fn((id) => `Status ${id}`)
  })
}))

vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    props: ['item', 'icon', 'disabled'],
    emits: ['click'],
    template: '<button type="button" class="action-button-stub" :data-icon="icon" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
  }
}))
vi.mock('@/components/ClickableCell.vue', () => ({ default: { template: '<span><slot /></span>' } }))
vi.mock('@/components/RegisterInvoiceCell.vue', () => ({ default: { template: '<span />' } }))
vi.mock('@/components/SenderRecipientCell.vue', () => ({ default: { template: '<span />' } }))
vi.mock('@/components/SortableMultilineHeader.vue', () => ({ default: { template: '<span />' } }))

function mountTable(props = {}) {
  return mount(WarehouseRegistersTable, {
    props: {
      items: [],
      itemsLength: 0,
      itemsPerPage: 25,
      page: 1,
      sortBy: [{ key: 'id', order: 'desc' }],
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
              <div data-testid="header-titles">{{ headers.map(header => header.title).join(',') }}</div>
              <div v-for="item in items" :key="item.id" data-testid="row">
                <slot name="item.actions" :item="item" />
                <slot name="item.matchingParcelsCount" :item="item" />
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

describe('WarehouseRegistersTable matching-count column', () => {
  it('does not add the matching-count header for the normal warehouse list', () => {
    const headers = createWarehouseRegisterHeaders({ showActions: true, selectable: false })

    expect(headers.map((header) => header.key)).not.toContain('matchingParcelsCount')
  })

  it('does not add the register-status icon header by default', () => {
    const headers = createWarehouseRegisterHeaders({ showActions: true, selectable: false })

    expect(headers.map((header) => header.key)).not.toContain('registerStatusIcon')
  })

  it('keeps the register-status icon out of headers even when requested', () => {
    const headers = createWarehouseRegisterHeaders({
      showActions: true,
      selectable: false,
      showRegisterStatusIcon: true
    })

    expect(headers.map((header) => header.key).slice(0, 2)).toEqual(['actions', 'dealNumber'])
    expect(headers.map((header) => header.key)).not.toContain('registerStatusIcon')
  })

  it('starts inline register-status edit from the optional status icon', async () => {
    const startRegisterStatusChange = vi.fn()
    const wrapper = mountTable({
      showRegisterStatusIcon: true,
      canChangeRegisterStatus: true,
      startRegisterStatusChange,
      items: [
        { id: 1, statusId: 2 }
      ]
    })

    expect(wrapper.find('[data-testid="header-keys"]').text()).not.toContain('registerStatusIcon')
    expect(wrapper.find('[data-testid="register-status-icon"]').exists()).toBe(true)
    expect(wrapper.find('.register-status-action-button').attributes('title')).toBe('Status 2')

    await wrapper.find('.register-status-action-button').trigger('click')

    expect(startRegisterStatusChange).toHaveBeenCalledWith(1, 2)
    expect(wrapper.emitted('edit-register')).toBeUndefined()
  })

  it('keeps full register edit on the pen action', async () => {
    const wrapper = mountTable({
      isSrLogistPlus: true,
      items: [
        { id: 1, statusId: 2 }
      ]
    })

    await wrapper.find('[data-icon="fa-solid fa-pen"]').trigger('click')

    expect(wrapper.emitted('edit-register')?.[0]).toEqual([{ id: 1, statusId: 2 }])
  })

  it('opens parcel status bulk dialog from the independent action', async () => {
    const openParcelStatusBulkDialog = vi.fn()
    const wrapper = mountTable({
      isSrLogistPlus: true,
      openParcelStatusBulkDialog,
      items: [
        { id: 1, statusId: 2 }
      ]
    })

    await wrapper.find('[data-icon="fa-solid fa-pen-to-square"]').trigger('click')

    expect(openParcelStatusBulkDialog).toHaveBeenCalledWith(1)
    expect(wrapper.find('[data-testid="register-status-select"]').exists()).toBe(false)
  })

  it('renders and applies inline register status selector', async () => {
    const setSelectedRegisterStatusId = vi.fn()
    const applyRegisterStatusChange = vi.fn()
    const cancelRegisterStatusChange = vi.fn()
    const wrapper = mountTable({
      showRegisterStatusIcon: true,
      canChangeRegisterStatus: true,
      registerStatusOptions: [
        { id: 2, title: 'Current' },
        { id: 5, title: 'Next' }
      ],
      isRegisterStatusEditMode: () => true,
      getSelectedRegisterStatusId: () => 5,
      setSelectedRegisterStatusId,
      applyRegisterStatusChange,
      cancelRegisterStatusChange,
      items: [
        { id: 1, statusId: 2 }
      ]
    })

    await wrapper.find('[data-testid="register-status-select"]').setValue('5')
    await wrapper.find('[data-icon="fa-solid fa-check"]').trigger('click')
    await wrapper.find('[data-icon="fa-solid fa-xmark"]').trigger('click')

    expect(setSelectedRegisterStatusId).toHaveBeenCalledWith(1, 5)
    expect(applyRegisterStatusChange).toHaveBeenCalledWith(1, 5, 2)
    expect(cancelRegisterStatusChange).toHaveBeenCalledWith(1)
  })

  it('renders register-status tooltip for read-only warehouse rows', () => {
    const wrapper = mountTable({
      showRegisterStatusIcon: true,
      linksEnabled: false,
      items: [
        { id: 1, statusId: 2 }
      ]
    })

    const statusIcon = wrapper.find('.register-status-action-button--readonly')

    expect(statusIcon.exists()).toBe(true)
    expect(statusIcon.attributes('title')).toBe('Status 2')
  })

  it('adds the matching-count header only when requested', () => {
    const headers = createWarehouseRegisterHeaders({
      showActions: false,
      selectable: true,
      showMatchingCount: true
    })

    expect(headers.map((header) => header.key)).toContain('matchingParcelsCount')
    expect(headers.find((header) => header.key === 'matchingParcelsCount')).toMatchObject({
      title: 'К возврату',
      sortable: false,
      align: 'end'
    })
  })

  it('passes the optional header to the table and formats matching counts', () => {
    const wrapper = mountTable({
      showMatchingCount: true,
      items: [
        { id: 1, matchingParcelsCount: 1234 },
        { id: 2, matchingParcelsCount: 0 }
      ]
    })

    expect(wrapper.find('[data-testid="header-keys"]').text()).toContain('matchingParcelsCount')
    expect(wrapper.find('[data-testid="header-titles"]').text()).toContain('К возврату')
    expect(wrapper.findAll('[data-testid="row"]')[0].text()).toBe('1\u00A0234')
    expect(wrapper.findAll('[data-testid="row"]')[1].text()).toBe('-')
  })
})
