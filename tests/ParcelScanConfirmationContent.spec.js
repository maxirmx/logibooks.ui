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
    [0, 'Выбрано 0 посылок'], [1, 'Выбрана 1 посылка'],
    [2, 'Выбрано 2 посылки'], [4, 'Выбрано 4 посылки'],
    [5, 'Выбрано 5 посылок'], [6, 'Выбрано 6 посылок'],
    [11, 'Выбрано 11 посылок'], [12, 'Выбрано 12 посылок'],
    [14, 'Выбрано 14 посылок'], [21, 'Выбрана 21 посылка'],
    [22, 'Выбрано 22 посылки'], [25, 'Выбрано 25 посылок'],
    [101, 'Выбрана 101 посылка'], [111, 'Выбрано 111 посылок']
  ])('renders the selected count with Russian grammar: %s', (count, expected) => {
    expect(parcelScanSelectionMessage(count)).toBe(expected)
    const wrapper = mount(ParcelScanConfirmationContent, { props: { count, jobs: [jobs[0]], choice: { jobId: 47 } } })
    expect(wrapper.get('p').text()).toBe(expected)
    expect(wrapper.text()).not.toContain('Отметить выбранные')
    expect(wrapper.text()).not.toContain('Количество:')
    wrapper.unmount()
  })

})
