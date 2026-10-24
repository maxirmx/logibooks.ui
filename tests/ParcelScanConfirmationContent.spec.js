/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VSelect } from 'vuetify/components'
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

  it('uses an external standard label and shows only the job name in the real selector', async () => {
    const wrapper = mount(ParcelScanConfirmationContent, {
      props: { count: 6, jobs, choice: { jobId: 47 } },
      global: { plugins: [createVuetify({ components: { VSelect } })] }
    })
    expect(wrapper.get('p').text()).toBe('Выбрано 6 посылок')
    const label = wrapper.get('label.label-0')
    expect(label.text()).toBe('Задание на сканирование:')
    expect(label.attributes('for')).toBe(wrapper.get('input').attributes('id'))
    const select = wrapper.findComponent(VSelect)
    expect(select.props('label')).toBeUndefined()
    expect(select.props('items')).toEqual(jobs)
    expect(wrapper.find('label.v-label').exists()).toBe(false)
    expect(wrapper.get('.v-select__selection-text').text()).toBe('Сканирование сделки XX-2')
    expect(wrapper.text()).not.toContain('#47')
    select.vm.$emit('update:modelValue', 48)
    expect(wrapper.emitted('select-job')).toEqual([[48]])
    await wrapper.setProps({ choice: { jobId: 48 } })
    expect(wrapper.get('.v-select__selection-text').text()).toBe('Поиск посылок')
    wrapper.unmount()
  })

  it('shows a fixed job name when there is only one possible job', () => {
    const wrapper = mount(ParcelScanConfirmationContent, { props: { count: 2, jobs: [jobs[0]], choice: { jobId: 47 } } })
    expect(wrapper.get('#parcel-scan-job').text()).toBe('Сканирование сделки XX-2')
    expect(wrapper.get('label.label-0').attributes('for')).toBeUndefined()
    expect(wrapper.findComponent(VSelect).exists()).toBe(false)
    wrapper.unmount()
  })
})
