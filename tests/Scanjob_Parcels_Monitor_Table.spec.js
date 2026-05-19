/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ScanjobOzonParcelsMonitorTable from '@/dialogs/Scanjob_Ozon_Parcels_Monitor_Table.vue'
import ScanjobWbrParcelsMonitorTable from '@/dialogs/Scanjob_Wbr_Parcels_Monitor_Table.vue'
import ScanjobWbr2ParcelsMonitorTable from '@/dialogs/Scanjob_Wbr2_Parcels_Monitor_Table.vue'
import ScanjobParcelsMonitorTable from '@/dialogs/Scanjob_Parcels_Monitor_Table.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const scanjobmonitorParcelsPerPage = ref(50)
const scanjobmonitorParcelsSortBy = ref([{ key: 'id', order: 'asc' }])
const scanjobmonitorParcelsPage = ref(1)
const hasLogistRole = ref(true)
const isAdmin = ref(false)
const isWhManager = ref(false)

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    scanjobmonitor_parcels_per_page: scanjobmonitorParcelsPerPage,
    scanjobmonitor_parcels_sort_by: scanjobmonitorParcelsSortBy,
    scanjobmonitor_parcels_page: scanjobmonitorParcelsPage,
    hasLogistRole,
    isAdmin,
    isWhManager
  })
}))

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

const global = { stubs: vuetifyStubs }

describe('Scanjob parcel monitor typed tables', () => {
  beforeEach(() => {
    hasLogistRole.value = true
    isAdmin.value = false
    isWhManager.value = false
  })

  it('renders Ozon scan and WH columns without box number', () => {
    const wrapper = mount(ScanjobOzonParcelsMonitorTable, {
      props: {
        parcels: [{
          stickerScanned: true,
          scannedSticker: 'SCAN-11',
          scannedUserName: 'Operator',
          scannedTime: '2026-01-02T10:00:00',
          postingNumber: 'POST-11',
          barcode: 'BAR-11',
          productName: 'Very long Ozon product name',
          weightKg: 1.23,
          quantity: 2,
          zoneName: 'Green',
          statusTitle: 'Ready',
          checkStatusProjection: { kind: 10, title: 'Не проверено', restrictionReason: null }
        }]
      },
      global
    })

    const headers = wrapper.findComponent(ScanjobParcelsMonitorTable).props('headers')
    expect(headers.map((header) => header.key)).toEqual([
      'actions',
      'stickerScanned',
      'checkStatusProjection',
      'zone',
      'statusId',
      'scannedInfo',
      'postingNumber',
      'barcode',
      'productName',
      'weightKg',
      'quantity'
    ])
    expect(headers.find((header) => header.key === 'scannedInfo')?.title).toBe('Пользователь\nВремя\nСканированный код')
    expect(headers.map((header) => header.key)).not.toContain('boxNumber')
    const scannedInfo = wrapper.get('.scanjob-monitor-scanned-info')
    expect(scannedInfo.findAll('span').map((line) => line.text())).toEqual([
      'Operator',
      '10:00 02.01',
      'SCAN-11'
    ])
    expect(scannedInfo.text()).not.toContain('/')
    expect(wrapper.text()).toContain('POST-11')
    expect(wrapper.text()).toContain('BAR-11')
    expect(wrapper.text()).toContain('Ready')
    expect(wrapper.text()).toContain('Не проверено')
  })

  it('renders WBR scan and WH columns without box number', () => {
    const wrapper = mount(ScanjobWbrParcelsMonitorTable, {
      props: {
        parcels: [{
          stickerScanned: false,
          shk: 'SHK-21',
          sticker: 'STICKER-21',
          stickerCode: 'CODE-21',
          barcode: 'BAR-21',
          productName: 'Very long WBR product name',
          weightKg: 3.45,
          quantity: 4,
          zoneName: 'Red',
          statusTitle: 'Waiting',
          checkStatusProjection: { kind: 30, title: 'Проверено', restrictionReason: null }
        }]
      },
      global
    })

    const headers = wrapper.findComponent(ScanjobParcelsMonitorTable).props('headers')
    expect(headers.map((header) => header.key)).toEqual([
      'actions',
      'stickerScanned',
      'checkStatusProjection',
      'zone',
      'statusId',
      'scannedInfo',
      'shk',
      'sticker',
      'stickerCode',
      'barcode',
      'productName',
      'weightKg',
      'quantity'
    ])
    expect(headers.map((header) => header.key)).not.toContain('boxNumber')
    expect(wrapper.text()).toContain('SHK-21')
    expect(wrapper.text()).toContain('STICKER-21')
    expect(wrapper.text()).toContain('CODE-21')
    expect(wrapper.text()).toContain('BAR-21')
  })

  it('renders WBR2 scan and WH columns without box number', () => {
    const wrapper = mount(ScanjobWbr2ParcelsMonitorTable, {
      props: {
        parcels: [{
          stickerScanned: true,
          shk: 'SHK-31',
          stickerCode: 'CODE-31',
          wbSticker: 'WB-31',
          sellerSticker: 'SELLER-31',
          productName: 'Very long WBR2 product name',
          weightKg: 5.67,
          quantity: 8,
          zoneName: 'Yellow',
          statusTitle: 'Done',
          checkStatusProjection: { kind: 20, title: 'Запрет', restrictionReason: 'Причина запрета' }
        }]
      },
      global
    })

    const headers = wrapper.findComponent(ScanjobParcelsMonitorTable).props('headers')
    expect(headers.map((header) => header.key)).toEqual([
      'actions',
      'stickerScanned',
      'checkStatusProjection',
      'zone',
      'statusId',
      'scannedInfo',
      'shk',
      'stickerCode',
      'wbSticker',
      'sellerSticker',
      'productName',
      'weightKg',
      'quantity'
    ])
    expect(headers.map((header) => header.key)).not.toContain('boxNumber')
    expect(wrapper.text()).toContain('SHK-31')
    expect(wrapper.text()).toContain('WB-31')
    expect(wrapper.text()).toContain('SELLER-31')
    expect(wrapper.text()).toContain('Запрет')
    expect(wrapper.text()).toContain('Причина запрета')

    const statusCell = wrapper.get('.status-cell.has-issues')
    expect(statusCell.text()).toBe('Запрет')
  })

  it('renders product name as a non-wrapping tooltip cell and keeps click editing', async () => {
    const wrapper = mount(ScanjobWbr2ParcelsMonitorTable, {
      props: {
        parcels: [{
          id: 41,
          stickerScanned: true,
          productName: 'Very long product name that should not wrap',
          checkStatusProjection: { kind: 10, title: 'Не проверено', restrictionReason: null }
        }]
      },
      global
    })

    const productCell = wrapper.get('.scanjob-monitor-product-name-cell')
    expect(productCell.text()).toBe('Very long product name that should not wrap')
    expect(productCell.attributes('title')).toBeUndefined()
    expect(wrapper.findAll('[data-testid="v-tooltip"]').some((tooltip) => (
      tooltip.text().includes('Very long product name that should not wrap')
    ))).toBe(true)

    await productCell.trigger('click')
    expect(wrapper.emitted('edit-parcel')?.[0][0]).toEqual(expect.objectContaining({ id: 41 }))
  })

  it('does not make parcel cells clickable without parcel edit route permission', async () => {
    hasLogistRole.value = false

    const wrapper = mount(ScanjobWbr2ParcelsMonitorTable, {
      props: {
        parcels: [{
          id: 41,
          stickerScanned: true,
          productName: 'Very long product name that should not wrap',
          checkStatusProjection: { kind: 10, title: 'Не проверено', restrictionReason: null }
        }]
      },
      global
    })

    const productCell = wrapper.get('.scanjob-monitor-product-name-cell')
    expect(productCell.classes()).not.toContain('clickable-cell')
    expect(productCell.attributes('aria-disabled')).toBe('true')

    await productCell.trigger('click')
    expect(wrapper.emitted('edit-parcel')).toBeFalsy()
  })

  it('emits set-defect from row action for warehouse manager', async () => {
    isWhManager.value = true

    const wrapper = mount(ScanjobParcelsMonitorTable, {
      props: {
        headers: [{ title: '', key: 'actions', sortable: false }],
        parcels: [{
          id: 41,
          checkStatusProjection: { kind: 10, title: 'Не проверено', restrictionReason: null }
        }]
      },
      global
    })

    await wrapper.get('[data-testid="scanjob-parcel-set-defect-41"]').trigger('click')

    expect(wrapper.emitted('set-defect')?.[0][0]).toEqual(expect.objectContaining({ id: 41 }))
  })

  it('disables set-defect action for duplicate or marked-by-partner parcels', () => {
    isAdmin.value = true

    const wrapper = mount(ScanjobParcelsMonitorTable, {
      props: {
        headers: [{ title: '', key: 'actions', sortable: false }],
        parcels: [
          { id: 41, checkStatus: 0x017E017E },
          { id: 42, checkStatus: 0x01FF01FF }
        ]
      },
      global
    })

    expect(wrapper.get('[data-testid="scanjob-parcel-set-defect-41"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="scanjob-parcel-set-defect-42"]').attributes('disabled')).toBeDefined()
  })
})
