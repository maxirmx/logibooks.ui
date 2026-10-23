// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanjobParcelsMonitor from '@/dialogs/Scanjob_Parcels_Monitor.vue'
import ScanjobParcelsMonitorTable from '@/dialogs/Scanjob_Parcels_Monitor_Table.vue'
import BoxStickerField from '@/components/BoxStickerField.vue'
import { scanjobMonitorArea } from '@/helpers/scanjob.monitor.helpers.js'
import { OZON_COMPANY_ID, WBR_COMPANY_ID, WBRN_REGISTER_ID } from '@/helpers/company.constants.js'

const global = { stubs: {
  ScanjobParcelsMonitorTable: true,
  BoxStickerPrintButton: true,
  'v-card': { template: '<div><slot /></div>' }
} }

describe('parcel monitor summary', () => {
  it.each([0, OZON_COMPANY_ID, WBR_COMPANY_ID, WBRN_REGISTER_ID])('forwards read-only independently of loading for register type %s', async (registerType) => {
    const wrapper = mount(ScanjobParcelsMonitor, { props: {
      registerType, box: { area: scanjobMonitorArea.Box, boxId: 3, parcels: [{ parcelId: 7 }] }, readOnly: true
    }, global })
    const table = wrapper.getComponent(ScanjobParcelsMonitorTable)
    expect(table.props('readOnly')).toBe(true)
    expect(table.props('defectActionLoading')).toBe(false)
    expect(table.props('loading')).toBe(false)
    await wrapper.setProps({ readOnly: false, defectActionLoading: true })
    expect(table.props('readOnly')).toBe(false)
    expect(table.props('defectActionLoading')).toBe(true)
    wrapper.unmount()
  })
  it('keeps the box code and print action within its status card and preserves table actions', async () => {
    const parcel = { parcelId: 7, extId: 'KGT-7' }
    const box = { area: scanjobMonitorArea.Box, boxId: 3, boxSticker: 'BOX-QR', parcels: [parcel] }
    const wrapper = mount(ScanjobParcelsMonitor, { props: { box, loading: true }, global })
    const field = wrapper.getComponent(BoxStickerField)
    expect(field.element.closest('.monitor-summary-item').textContent).toContain('Статус сканирования коробки')
    expect(field.element.closest('.monitor-summary-value-row').querySelector('.monitor-status')).not.toBeNull()
    expect(field.element.closest('.monitor-summary-extra')).not.toBeNull()
    expect(field.text()).toContain('BOX-QR')
    expect(field.find('.label').exists()).toBe(false)
    expect(field.props('disabled')).toBe(true)
    expect(wrapper.findAllComponents(BoxStickerField)).toHaveLength(1)
    const table = wrapper.getComponent(ScanjobParcelsMonitorTable)
    for (const event of ['edit-parcel', 'set-defect', 'clear-defect', 'clear-ext-id']) {
      table.vm.$emit(event, parcel)
      expect(wrapper.emitted(event)).toEqual([[parcel]])
    }
    await wrapper.setProps({ loading: false })
    expect(field.props('disabled')).toBe(false)
    wrapper.unmount()
  })

  it.each([null, { area: scanjobMonitorArea.Unassigned, bucketIndex: 0, parcels: [] }])(
    'does not show a physical box sticker for an absent box or virtual parcel group', (box) => {
      const wrapper = mount(ScanjobParcelsMonitor, { props: { box }, global })
      expect(wrapper.findComponent(BoxStickerField).exists()).toBe(false)
      expect(wrapper.find('[data-testid="scanjob-monitor-empty-parcels"]').exists()).toBe(true)
      wrapper.unmount()
    }
  )
})
