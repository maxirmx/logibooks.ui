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
      ? { id, title: `Status ${id}`, icon: 'fa-solid fa-circle-check', bkColor: '#00AA00', fgColor: '#FFFFFF' }
      : null
    ),
    getStatusTitle: vi.fn((id) => `Status ${id}`)
  })
}))

vi.mock('@/components/ActionButton.vue', () => ({ default: { template: '<button />' } }))
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

  it('renders the optional register-status icon inside the actions column', async () => {
    const wrapper = mountTable({
      showRegisterStatusIcon: true,
      items: [
        { id: 1, statusId: 2 }
      ]
    })

    expect(wrapper.find('[data-testid="header-keys"]').text()).not.toContain('registerStatusIcon')
    expect(wrapper.find('[data-testid="register-status-icon"]').exists()).toBe(true)

    await wrapper.find('.register-status-action-button').trigger('click')

    expect(wrapper.emitted('edit-register')?.[0]).toEqual([{ id: 1, statusId: 2 }])
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
