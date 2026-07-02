/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { beforeAll, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

let ScanjobWbrNParcelsMonitorTable

vi.mock('@/dialogs/Scanjob_Parcels_Monitor_Table.vue', () => ({
  default: {
    name: 'Scanjob_Parcels_Monitor_Table',
    props: ['headers', 'parcels', 'register', 'loading', 'defectActionLoading', 'selectedParcelId'],
    emits: ['edit-parcel', 'set-defect', 'clear-defect'],
    template: `
      <div
        data-testid="scanjob-generic-table"
        :data-header-keys="headers.map(header => header.key).join(',')"
        :data-parcel-count="parcels.length"
        :data-register-id="register?.id"
        :data-loading="String(loading)"
        :data-defect-action-loading="String(defectActionLoading)"
        :data-selected-parcel-id="selectedParcelId"
      >
        <button data-testid="edit-parcel" @click="$emit('edit-parcel', parcels[0])"></button>
        <button data-testid="set-defect" @click="$emit('set-defect', parcels[0])"></button>
        <button data-testid="clear-defect" @click="$emit('clear-defect', parcels[0])"></button>
      </div>
    `
  }
}))

describe('Scanjob_WbrN_Parcels_Monitor_Table.vue', () => {
  beforeAll(async () => {
    ScanjobWbrNParcelsMonitorTable = (await import('@/dialogs/Scanjob_WbrN_Parcels_Monitor_Table.vue')).default
  })

  it('passes WbrN headers and forwards row actions', async () => {
    const parcel = { id: 51, shk: 'SHK-51', article: '29817781' }
    const wrapper = mount(ScanjobWbrNParcelsMonitorTable, {
      props: {
        parcels: [parcel],
        register: { id: 9 },
        loading: true,
        defectActionLoading: true,
        selectedParcelId: 51
      }
    })

    const table = wrapper.get('[data-testid="scanjob-generic-table"]')
    expect(table.attributes('data-header-keys')).toBe('actions,stickerScanned,checkStatusProjection,zone,statusId,scannedInfo,extId,shk,article,sticker,stickerCode,productName,weightKg,quantity')
    expect(table.attributes('data-parcel-count')).toBe('1')
    expect(table.attributes('data-register-id')).toBe('9')
    expect(table.attributes('data-loading')).toBe('true')
    expect(table.attributes('data-defect-action-loading')).toBe('true')
    expect(table.attributes('data-selected-parcel-id')).toBe('51')

    await wrapper.get('[data-testid="edit-parcel"]').trigger('click')
    await wrapper.get('[data-testid="set-defect"]').trigger('click')
    await wrapper.get('[data-testid="clear-defect"]').trigger('click')

    expect(wrapper.emitted('edit-parcel')?.[0]).toEqual([parcel])
    expect(wrapper.emitted('set-defect')?.[0]).toEqual([parcel])
    expect(wrapper.emitted('clear-defect')?.[0]).toEqual([parcel])
  })

  it('uses default prop values when optional props are omitted', () => {
    const wrapper = mount(ScanjobWbrNParcelsMonitorTable)
    const table = wrapper.get('[data-testid="scanjob-generic-table"]')

    expect(table.attributes('data-parcel-count')).toBe('0')
    expect(table.attributes('data-register-id')).toBeUndefined()
    expect(table.attributes('data-loading')).toBe('false')
    expect(table.attributes('data-defect-action-loading')).toBe('false')
    expect(table.attributes('data-selected-parcel-id')).toBeUndefined()
  })
})
