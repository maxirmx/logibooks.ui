/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelScanConfirmationContent from '@/components/ParcelScanConfirmationContent.vue'
import { parcelScanSelectionMessage } from '@/helpers/parcel.scan.helpers.js'

const jobs = [
  { id: 47, label: 'Сканирование сделки XX-2' },
  { id: 48, label: 'Поиск посылок' }
]

describe('parcel scan confirmation content', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    [0, 'Выбрано 0 посылок']
  ])('renders the selected count with Russian grammar: %s', (count, expected) => {
    expect(parcelScanSelectionMessage(count)).toBe(expected)
    const wrapper = mount(ParcelScanConfirmationContent, { props: { count, jobs: [jobs[0]], choice: { jobId: 47 } } })
    expect(wrapper.get('p').text()).toBe(expected)
    expect(wrapper.text()).not.toContain('Отметить выбранные')
    expect(wrapper.text()).not.toContain('Количество:')
    wrapper.unmount()
  })

})
