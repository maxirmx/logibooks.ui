/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ScanjobLookupProgress from '@/components/ScanjobLookupProgress.vue'
import { lookupPresetLabel, scopedLookupFeedback, withLookupReport } from '@/helpers/scoped.lookup.helpers.js'

const snapshot = {
  lookupTargetMode: 1, scanJobId: 7, registerId: 12, warehouseId: 2, dealNumber: 'ABC-1',
  lookupProgress: {
    expectedCount: 2, confirmedCount: 1, missingCount: 1,
    missingParcels: [{ parcelId: 1, parcelNumber: 'P-1' }],
    confirmedParcels: [{ parcelId: 2, parcelNumber: 'P-2' }]
  }
}

function render(props) {
  return mount(ScanjobLookupProgress, {
    props,
    global: {
      stubs: {
        VBtn: { props: ['to'], template: '<button :data-route="JSON.stringify(to)"><slot /></button>' }
      }
    }
  })
}

describe('Scoped Lookup monitor', () => {
  it('renders a completed verification and prefills recovery', () => {
    const wrapper = render({ snapshot, completed: true, canCreateSearch: true })
    expect(wrapper.text()).toContain('Контроль красной зоны')
    expect(wrapper.text()).toContain('Не найдено: 1')
    expect(wrapper.text()).toContain('P-1')
    expect(wrapper.text()).toContain('P-2')
    expect(JSON.parse(wrapper.get('button').attributes('data-route'))).toEqual({
      path: '/scanjob/create',
      query: { registerId: 12, warehouseId: 2, dealNumber: 'ABC-1', sourceScanJobId: 7 }
    })
    wrapper.unmount()
  })

  it('shows empty verification and separate recovery counts', async () => {
    const wrapper = render({
      snapshot: { ...snapshot, lookupProgress: { ...snapshot.lookupProgress, missingCount: 0, missingParcels: [] } },
      completed: true, canCreateSearch: true
    })
    expect(wrapper.text()).toContain('Ненайденных посылок нет')
    expect(wrapper.find('button').exists()).toBe(false)
    await wrapper.setProps({ snapshot: { ...snapshot, lookupTargetMode: 2 } })
    expect(wrapper.text()).toContain('Осталось найти: 1')
    expect(wrapper.find('button').exists()).toBe(false)
    wrapper.unmount()
  })

  it('offers an on-demand report and reuses parcel lists only at the same counts', async () => {
    const report = snapshot.lookupProgress
    const counts = { expectedCount: 2, confirmedCount: 1, missingCount: 1 }
    expect(withLookupReport(counts, report)).toEqual(report)
    expect(withLookupReport(report, report)).toBe(report)
    expect(withLookupReport(null, report)).toBeNull()
    expect(withLookupReport(counts, null)).toBe(counts)
    expect(withLookupReport(counts, { ...report, expectedCount: 3 })).toBe(counts)
    expect(withLookupReport(counts, { ...report, confirmedCount: 2 })).toBe(counts)
    const wrapper = render({ snapshot: { ...snapshot, lookupProgress: counts } })
    expect(wrapper.text()).toContain('Не найдено: 1')
    expect(wrapper.text()).not.toContain('P-1')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('load-report')).toHaveLength(1)
    await wrapper.setProps({ snapshot })
    expect(wrapper.text()).toContain('P-1')
    wrapper.unmount()
  })

  it('separates candidate advice, confirmation and a legacy result', () => {
    expect(lookupPresetLabel()).toBe('Поиск по статусу')
    expect(scopedLookupFeedback({ lookupOutcome: 2, candidateParcelNumbers: ['P-1'] })).toEqual({
      text: 'Откройте коробку и проверьте посылки', numbers: ['P-1']
    })
    expect(scopedLookupFeedback({ lookupOutcome: 2 }).numbers).toEqual([])
    expect(scopedLookupFeedback({ lookupOutcome: 1 }).text).toBe('Посылка подтверждена')
    expect(scopedLookupFeedback({ lookupOutcome: 3 }).text).toBe('Посылка уже подтверждена')
    expect(scopedLookupFeedback({ count: 1 })).toBeNull()
  })
})
