/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, it, expect, vi } from 'vitest'
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

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    scanjobmonitor_parcels_per_page: scanjobmonitorParcelsPerPage,
    scanjobmonitor_parcels_sort_by: scanjobmonitorParcelsSortBy,
    scanjobmonitor_parcels_page: scanjobmonitorParcelsPage
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
  it('renders Ozon scan and WH columns without box number', () => {
    const wrapper = mount(ScanjobOzonParcelsMonitorTable, {
      props: {
        parcels: [{
          id: 11,
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
          checkStatus: 0
        }]
      },
      global
    })

    const headers = wrapper.findComponent(ScanjobParcelsMonitorTable).props('headers')
    expect(headers.map((header) => header.key)).toEqual([
      'stickerScanned',
      'scannedSticker',
      'scannedUserName',
      'scannedTime',
      'id',
      'postingNumber',
      'barcode',
      'productName',
      'weightKg',
      'quantity',
      'zone',
      'statusId',
      'checkStatus'
    ])
    expect(headers.map((header) => header.key)).not.toContain('boxNumber')
    expect(wrapper.text()).toContain('POST-11')
    expect(wrapper.text()).toContain('BAR-11')
    expect(wrapper.text()).toContain('Ready')
    expect(wrapper.text()).toContain('Не проверено')
  })

  it('renders WBR scan and WH columns without box number', () => {
    const wrapper = mount(ScanjobWbrParcelsMonitorTable, {
      props: {
        parcels: [{
          id: 21,
          stickerScanned: false,
          shk: 'SHK-21',
          sticker: 'STICKER-21',
          stickerCode: 'CODE-21',
          productName: 'Very long WBR product name',
          weightKg: 3.45,
          quantity: 4,
          zoneName: 'Red',
          statusTitle: 'Waiting',
          checkStatus: 0
        }]
      },
      global
    })

    const headers = wrapper.findComponent(ScanjobParcelsMonitorTable).props('headers')
    expect(headers.map((header) => header.key)).toEqual([
      'stickerScanned',
      'scannedSticker',
      'scannedUserName',
      'scannedTime',
      'id',
      'shk',
      'sticker',
      'stickerCode',
      'productName',
      'weightKg',
      'quantity',
      'zone',
      'statusId',
      'checkStatus'
    ])
    expect(headers.map((header) => header.key)).not.toContain('boxNumber')
    expect(wrapper.text()).toContain('SHK-21')
    expect(wrapper.text()).toContain('STICKER-21')
    expect(wrapper.text()).toContain('CODE-21')
  })

  it('renders WBR2 scan and WH columns without box number', () => {
    const wrapper = mount(ScanjobWbr2ParcelsMonitorTable, {
      props: {
        parcels: [{
          id: 31,
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
          checkStatus: 0
        }]
      },
      global
    })

    const headers = wrapper.findComponent(ScanjobParcelsMonitorTable).props('headers')
    expect(headers.map((header) => header.key)).toEqual([
      'stickerScanned',
      'scannedSticker',
      'scannedUserName',
      'scannedTime',
      'id',
      'shk',
      'stickerCode',
      'wbSticker',
      'sellerSticker',
      'productName',
      'weightKg',
      'quantity',
      'zone',
      'statusId',
      'checkStatus'
    ])
    expect(headers.map((header) => header.key)).not.toContain('boxNumber')
    expect(wrapper.text()).toContain('SHK-31')
    expect(wrapper.text()).toContain('WB-31')
    expect(wrapper.text()).toContain('SELLER-31')
  })

  it('renders product name as a non-wrapping titled cell and keeps click editing', async () => {
    const wrapper = mount(ScanjobWbr2ParcelsMonitorTable, {
      props: {
        parcels: [{
          id: 41,
          stickerScanned: true,
          productName: 'Very long product name that should not wrap',
          checkStatus: 0
        }]
      },
      global
    })

    const productCell = wrapper.get('.scanjob-monitor-product-name-cell')
    expect(productCell.text()).toBe('Very long product name that should not wrap')
    expect(productCell.attributes('title')).toBe('Very long product name that should not wrap')

    await productCell.trigger('click')
    expect(wrapper.emitted('edit-parcel')?.[0][0]).toEqual(expect.objectContaining({ id: 41 }))
  })
})
