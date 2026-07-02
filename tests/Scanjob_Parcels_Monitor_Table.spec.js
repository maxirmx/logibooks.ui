/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import ScanjobOzonParcelsMonitorTable from '@/dialogs/Scanjob_Ozon_Parcels_Monitor_Table.vue'
import ScanjobWbrParcelsMonitorTable from '@/dialogs/Scanjob_Wbr_Parcels_Monitor_Table.vue'
import ScanjobWbr2ParcelsMonitorTable from '@/dialogs/Scanjob_Wbr2_Parcels_Monitor_Table.vue'
import ScanjobWbrNParcelsMonitorTable from '@/dialogs/Scanjob_WbrN_Parcels_Monitor_Table.vue'
import ScanjobParcelsMonitorTable from '@/dialogs/Scanjob_Parcels_Monitor_Table.vue'
import { vuetifyStubs } from './helpers/test-utils.js'
import { CheckStatusCode } from '@/helpers/check.status.code.js'
import { scanjobCheckStatusProjectionKind } from '@/helpers/scanjob.check-status.helpers.js'

const scanjobmonitorParcelsPerPage = ref(50)
const scanjobmonitorParcelsSortBy = ref([{ key: 'id', order: 'asc' }])
const scanjobmonitorParcelsPage = ref(1)
const hasLogistRole = ref(true)
const isAdmin = ref(false)
const isWhManager = ref(false)
const isShiftLead = ref(false)

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    scanjobmonitor_parcels_per_page: scanjobmonitorParcelsPerPage,
    scanjobmonitor_parcels_sort_by: scanjobmonitorParcelsSortBy,
    scanjobmonitor_parcels_page: scanjobmonitorParcelsPage,
    hasLogistRole,
    isAdmin,
    isWhManager,
    isShiftLead
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
const globalWithFontAwesome = {
  stubs: {
    ...vuetifyStubs,
    'font-awesome-icon': {
      props: ['icon'],
      template: '<i :data-icon="icon" class="fa-stub"></i>'
    }
  }
}
const mockScrollIntoView = () => {
  if (typeof window.HTMLElement.prototype.scrollIntoView !== 'function') {
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      value: () => {},
      configurable: true
    })
  }

  return vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {})
}

describe('Scanjob parcel monitor typed tables', () => {
  beforeEach(() => {
    scanjobmonitorParcelsPerPage.value = 50
    scanjobmonitorParcelsSortBy.value = [{ key: 'id', order: 'asc' }]
    scanjobmonitorParcelsPage.value = 1
    hasLogistRole.value = true
    isAdmin.value = false
    isWhManager.value = false
    isShiftLead.value = false
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
          extId: 'KGT-21',
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
      'extId',
      'shk',
      'sticker',
      'stickerCode',
      'barcode',
      'productName',
      'weightKg',
      'quantity'
    ])
    expect(headers.map((header) => header.key)).not.toContain('boxNumber')
    expect(wrapper.text()).toContain('KGT-21')
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

  it('renders WBRN scan and WH columns without box number', () => {
    const wrapper = mount(ScanjobWbrNParcelsMonitorTable, {
      props: {
        parcels: [{
          stickerScanned: true,
          extId: 'KGT-51',
          shk: 'SHK-51',
          article: '29817781',
          sticker: 'STICKER-51',
          stickerCode: 'CODE-51',
          productName: 'Very long WBRN product name',
          weightKg: 1.11,
          quantity: 3,
          zoneName: 'Blue',
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
      'extId',
      'shk',
      'article',
      'sticker',
      'stickerCode',
      'productName',
      'weightKg',
      'quantity'
    ])
    expect(headers.map((header) => header.key)).not.toContain('boxNumber')
    expect(wrapper.text()).toContain('KGT-51')
    expect(wrapper.text()).toContain('SHK-51')
    expect(wrapper.text()).toContain('29817781')
    expect(wrapper.text()).toContain('STICKER-51')
    expect(wrapper.text()).toContain('CODE-51')
  })

  it('renders corrected monitor parcel weights from register correction data', () => {
    const wrapper = mount(ScanjobWbr2ParcelsMonitorTable, {
      props: {
        register: {
          realWeightKg: 5,
          totalWeightKgToRelease: 10
        },
        parcels: [
          {
            isInRegister: true,
            weightCorrectionEligible: true,
            stickerScanned: true,
            shk: 'SHK-41',
            productName: 'Corrected product',
            weightKg: 2.4,
            quantity: 1,
            checkStatusProjection: { kind: 10, title: 'Не проверено', restrictionReason: null }
          },
          {
            isInRegister: true,
            weightCorrectionEligible: false,
            stickerScanned: true,
            parcelNumber: 'BLOCKED-ROW',
            weightKg: 3.4,
            quantity: 1
          }
        ]
      },
      global: globalWithFontAwesome
    })

    const corrected = wrapper.get('.corrected-weight-display')
    expect(corrected.text()).toContain('2.400')
    expect(corrected.text()).toContain('1.200')
    expect(corrected.get('[data-icon="fa-solid fa-arrow-right"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('3.400')
    expect(wrapper.text()).not.toContain('1.700')
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

  it('emits set-defect for warehouse manager when parcel status allows it', async () => {
    isWhManager.value = true

    const wrapper = mount(ScanjobWbr2ParcelsMonitorTable, {
      props: {
        parcels: [{
          id: 41,
          stickerScanned: true,
          productName: 'Product',
          checkStatus: CheckStatusCode.NotChecked.value,
          checkStatusProjection: { kind: 10, title: 'Не проверено', restrictionReason: null }
        }]
      },
      global
    })

    const setButton = wrapper.get('[data-testid="scanjob-set-defect-action"]')
    const clearButton = wrapper.get('[data-testid="scanjob-clear-defect-action"]')
    expect(setButton.attributes('aria-label')).toBe('Брак')
    expect(setButton.attributes('title')).toBe('Брак')
    expect(clearButton.attributes('aria-label')).toBe('Отменить брак')
    expect(clearButton.attributes('title')).toBe('Отменить брак')
    expect(setButton.attributes('disabled')).toBeUndefined()
    expect(clearButton.attributes('disabled')).toBeDefined()

    await setButton.trigger('click')
    expect(wrapper.emitted('set-defect')?.[0][0]).toEqual(expect.objectContaining({ id: 41 }))
  })

  it('emits clear-defect for shift lead only when parcel is defect', async () => {
    isShiftLead.value = true

    const wrapper = mount(ScanjobWbr2ParcelsMonitorTable, {
      props: {
        parcels: [{
          id: 42,
          stickerScanned: true,
          productName: 'Product',
          checkStatus: CheckStatusCode.Defect.value,
          checkStatusProjection: { kind: scanjobCheckStatusProjectionKind.Defect, title: 'Брак', restrictionReason: null }
        }]
      },
      global
    })

    const setButton = wrapper.get('[data-testid="scanjob-set-defect-action"]')
    const clearButton = wrapper.get('[data-testid="scanjob-clear-defect-action"]')
    expect(setButton.attributes('disabled')).toBeDefined()
    expect(clearButton.attributes('disabled')).toBeUndefined()
    expect(wrapper.get('.status-cell.has-issues').text()).toBe('Брак')

    await clearButton.trigger('click')
    expect(wrapper.emitted('clear-defect')?.[0][0]).toEqual(expect.objectContaining({ id: 42 }))
  })

  it('marks selected parcel row and moves pagination to its page', async () => {
    const scrollIntoView = vi.fn()
    const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView

    let wrapper
    try {
      scanjobmonitorParcelsPerPage.value = 2
      scanjobmonitorParcelsSortBy.value = [{ key: 'parcelNumber', order: 'asc' }]

      wrapper = mount(ScanjobParcelsMonitorTable, {
        props: {
          headers: [
            { title: 'Посылка', key: 'parcelNumber' },
            { title: 'Товар', key: 'productName' }
          ],
          selectedParcelId: 3,
          parcels: [
            { id: 1, parcelId: 1, parcelNumber: 'P-001', productName: 'One' },
            { id: 2, parcelId: 2, parcelNumber: 'P-002', productName: 'Two' },
            { id: 3, parcelId: 3, parcelNumber: 'P-003', productName: 'Three' }
          ]
        },
        global
      })

      await flushPromises()

      expect(scanjobmonitorParcelsPage.value).toBe(2)
      expect(wrapper.find('.selected-parcel-row').exists()).toBe(true)
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      })
    } finally {
      wrapper?.unmount()
      window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView
    }
  })

  it('does not change page or scroll when no selectedParcelId', async () => {
    scanjobmonitorParcelsPerPage.value = 2
    scanjobmonitorParcelsSortBy.value = [{ key: 'parcelNumber', order: 'asc' }]
    scanjobmonitorParcelsPage.value = 1

    const scrollIntoView = mockScrollIntoView()
    let wrapper

    try {
      wrapper = mount(ScanjobParcelsMonitorTable, {
        props: {
          headers: [
            { title: 'Посылка', key: 'parcelNumber' }
          ],
          selectedParcelId: null,
          parcels: [
            { id: 1, parcelId: 1, parcelNumber: 'P-001' },
            { id: 2, parcelId: 2, parcelNumber: 'P-002' },
            { id: 3, parcelId: 3, parcelNumber: 'P-003' }
          ]
        },
        global
      })

      await flushPromises()

      expect(scanjobmonitorParcelsPage.value).toBe(1)
      expect(scrollIntoView).not.toHaveBeenCalled()
    } finally {
      wrapper?.unmount()
      scrollIntoView.mockRestore()
    }
  })

  it('does not change page when selectedParcelId is not found in parcels', async () => {
    scanjobmonitorParcelsPerPage.value = 2
    scanjobmonitorParcelsSortBy.value = [{ key: 'parcelNumber', order: 'asc' }]
    scanjobmonitorParcelsPage.value = 1

    let wrapper
    try {
      wrapper = mount(ScanjobParcelsMonitorTable, {
        props: {
          headers: [{ title: 'Посылка', key: 'parcelNumber' }],
          selectedParcelId: 999,
          parcels: [
            { id: 1, parcelId: 1, parcelNumber: 'P-001' },
            { id: 2, parcelId: 2, parcelNumber: 'P-002' }
          ]
        },
        global
      })

      await flushPromises()

      expect(scanjobmonitorParcelsPage.value).toBe(1)
    } finally {
      wrapper?.unmount()
    }
  })

  it('moves to correct page when parcels are sorted in descending order', async () => {
    const scrollIntoView = mockScrollIntoView()
    let wrapper

    try {
      scanjobmonitorParcelsPerPage.value = 2
      scanjobmonitorParcelsSortBy.value = [{ key: 'parcelNumber', order: 'desc' }]
      scanjobmonitorParcelsPage.value = 1

      wrapper = mount(ScanjobParcelsMonitorTable, {
        props: {
          headers: [{ title: 'Посылка', key: 'parcelNumber' }],
          selectedParcelId: 1,
          parcels: [
            { id: 1, parcelId: 1, parcelNumber: 'P-001' },
            { id: 2, parcelId: 2, parcelNumber: 'P-002' },
            { id: 3, parcelId: 3, parcelNumber: 'P-003' }
          ]
        },
        global
      })

      await flushPromises()

      // Sorted desc: P-003 (id=3), P-002 (id=2), P-001 (id=1)
      // id=1 is at index 2 → page 2 with 2 per page
      expect(scanjobmonitorParcelsPage.value).toBe(2)
    } finally {
      wrapper?.unmount()
      scrollIntoView.mockRestore()
    }
  })

  it('applies selected-parcel-row class only to matching row', async () => {
    scanjobmonitorParcelsPerPage.value = 50
    scanjobmonitorParcelsSortBy.value = []

    let wrapper
    try {
      wrapper = mount(ScanjobParcelsMonitorTable, {
        props: {
          headers: [{ title: 'Посылка', key: 'parcelNumber' }],
          selectedParcelId: 2,
          parcels: [
            { id: 1, parcelId: 1, parcelNumber: 'P-001' },
            { id: 2, parcelId: 2, parcelNumber: 'P-002' },
            { id: 3, parcelId: 3, parcelNumber: 'P-003' }
          ]
        },
        global
      })

      await flushPromises()

      const selectedRows = wrapper.findAll('.selected-parcel-row')
      expect(selectedRows).toHaveLength(1)
      expect(selectedRows[0].text()).toContain('P-002')
    } finally {
      wrapper?.unmount()
    }
  })

  it('uses custom header sort function when sorting parcels', async () => {
    scanjobmonitorParcelsPerPage.value = 2
    scanjobmonitorParcelsPage.value = 1

    const customSort = vi.fn((a, b) => {
      // Reverse numeric sort: higher numbers come first
      return b - a
    })

    scanjobmonitorParcelsSortBy.value = [{ key: 'weight', order: 'asc' }]

    let wrapper
    try {
      wrapper = mount(ScanjobParcelsMonitorTable, {
        props: {
          headers: [
            {
              title: 'Вес',
              key: 'weight',
              sort: customSort
            }
          ],
          selectedParcelId: 1,
          parcels: [
            { id: 1, parcelId: 1, weight: 10 },
            { id: 2, parcelId: 2, weight: 20 },
            { id: 3, parcelId: 3, weight: 30 }
          ]
        },
        global
      })

      await flushPromises()

      // Custom sort reverses order: id=3 (30), id=2 (20), id=1 (10)
      // id=1 is at index 2 → page 2 with 2 per page
      expect(scanjobmonitorParcelsPage.value).toBe(2)
      expect(customSort).toHaveBeenCalled()
    } finally {
      wrapper?.unmount()
    }
  })

  it('uses item.id as fallback when item.parcelId is absent', async () => {
    const scrollIntoView = mockScrollIntoView()
    let wrapper

    try {
      scanjobmonitorParcelsPerPage.value = 50
      scanjobmonitorParcelsSortBy.value = []

      wrapper = mount(ScanjobParcelsMonitorTable, {
        props: {
          headers: [{ title: 'Посылка', key: 'parcelNumber' }],
          selectedParcelId: 5,
          parcels: [
            { id: 5, parcelNumber: 'P-005' },
            { id: 6, parcelNumber: 'P-006' }
          ]
        },
        global
      })

      await flushPromises()

      expect(wrapper.find('.selected-parcel-row').exists()).toBe(true)
      expect(wrapper.find('.selected-parcel-row').text()).toContain('P-005')
    } finally {
      wrapper?.unmount()
      scrollIntoView.mockRestore()
    }
  })

  it('updates page when selectedParcelId changes reactively', async () => {
    const scrollIntoView = mockScrollIntoView()
    let wrapper

    try {
      scanjobmonitorParcelsPerPage.value = 2
      scanjobmonitorParcelsSortBy.value = [{ key: 'parcelNumber', order: 'asc' }]
      scanjobmonitorParcelsPage.value = 1

      wrapper = mount(ScanjobParcelsMonitorTable, {
        props: {
          headers: [{ title: 'Посылка', key: 'parcelNumber' }],
          selectedParcelId: null,
          parcels: [
            { id: 1, parcelId: 1, parcelNumber: 'P-001' },
            { id: 2, parcelId: 2, parcelNumber: 'P-002' },
            { id: 3, parcelId: 3, parcelNumber: 'P-003' }
          ]
        },
        global
      })

      await flushPromises()
      expect(scanjobmonitorParcelsPage.value).toBe(1)

      await wrapper.setProps({ selectedParcelId: 3 })
      await flushPromises()

      expect(scanjobmonitorParcelsPage.value).toBe(2)
    } finally {
      wrapper?.unmount()
      scrollIntoView.mockRestore()
    }
  })

  it('updates page when parcels list changes reactively', async () => {
    const scrollIntoView = mockScrollIntoView()
    let wrapper

    try {
      scanjobmonitorParcelsPerPage.value = 2
      scanjobmonitorParcelsSortBy.value = [{ key: 'parcelNumber', order: 'asc' }]
      scanjobmonitorParcelsPage.value = 1

      wrapper = mount(ScanjobParcelsMonitorTable, {
        props: {
          headers: [{ title: 'Посылка', key: 'parcelNumber' }],
          selectedParcelId: 3,
          parcels: [
            { id: 1, parcelId: 1, parcelNumber: 'P-001' },
            { id: 2, parcelId: 2, parcelNumber: 'P-002' }
          ]
        },
        global
      })

      await flushPromises()
      // id=3 not found yet → page stays at 1
      expect(scanjobmonitorParcelsPage.value).toBe(1)

      await wrapper.setProps({
        parcels: [
          { id: 1, parcelId: 1, parcelNumber: 'P-001' },
          { id: 2, parcelId: 2, parcelNumber: 'P-002' },
          { id: 3, parcelId: 3, parcelNumber: 'P-003' }
        ]
      })
      await flushPromises()

      expect(scanjobmonitorParcelsPage.value).toBe(2)
    } finally {
      wrapper?.unmount()
      scrollIntoView.mockRestore()
    }
  })

  it('does not change page when perPage is zero', async () => {
    scanjobmonitorParcelsPerPage.value = 0
    scanjobmonitorParcelsSortBy.value = []
    scanjobmonitorParcelsPage.value = 1

    let wrapper
    try {
      wrapper = mount(ScanjobParcelsMonitorTable, {
        props: {
          headers: [{ title: 'Посылка', key: 'parcelNumber' }],
          selectedParcelId: 2,
          parcels: [
            { id: 1, parcelId: 1, parcelNumber: 'P-001' },
            { id: 2, parcelId: 2, parcelNumber: 'P-002' }
          ]
        },
        global
      })

      await flushPromises()

      expect(scanjobmonitorParcelsPage.value).toBe(1)
    } finally {
      wrapper?.unmount()
    }
  })

  it('sorts without rules returns original parcel order', async () => {
    const scrollIntoView = mockScrollIntoView()
    let wrapper

    try {
      scanjobmonitorParcelsPerPage.value = 2
      scanjobmonitorParcelsSortBy.value = []
      scanjobmonitorParcelsPage.value = 1

      wrapper = mount(ScanjobParcelsMonitorTable, {
        props: {
          headers: [{ title: 'Посылка', key: 'parcelNumber' }],
          selectedParcelId: 3,
          parcels: [
            { id: 1, parcelId: 1, parcelNumber: 'P-001' },
            { id: 2, parcelId: 2, parcelNumber: 'P-002' },
            { id: 3, parcelId: 3, parcelNumber: 'P-003' }
          ]
        },
        global
      })

      await flushPromises()

      // No sort rules → original order: id=3 at index 2 → page 2
      expect(scanjobmonitorParcelsPage.value).toBe(2)
    } finally {
      wrapper?.unmount()
      scrollIntoView.mockRestore()
    }
  })
})
