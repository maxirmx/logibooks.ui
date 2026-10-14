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
    ScanjobWbrNParcelsMonitorTable = (
      await import('@/dialogs/Scanjob_WbrN_Parcels_Monitor_Table.vue')
    ).default
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
