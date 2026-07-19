// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomsStationsView from '@/views/CustomsStations_View.vue'
import CustomsStationCreateView from '@/views/CustomsStation_CreateView.vue'
import CustomsStationEditView from '@/views/CustomsStation_EditView.vue'

vi.mock('@/lists/CustomsStations_List.vue', () => ({
  default: {
    name: 'CustomsStations_List',
    template: '<div data-testid="customs-stations-list">List</div>'
  }
}))

vi.mock('@/dialogs/CustomsStation_Settings.vue', () => ({
  default: {
    name: 'CustomsStation_Settings',
    props: ['mode', 'customsStationId'],
    template: '<div data-testid="customs-station-settings">{{ mode }}:{{ customsStationId }}</div>'
  }
}))

describe('customs station views', () => {
  it('renders the list view', () => {
    const wrapper = mount(CustomsStationsView)

    expect(wrapper.find('[data-testid="customs-stations-list"]').exists()).toBe(true)
  })

  it('renders the create settings view', () => {
    const wrapper = mount(CustomsStationCreateView)

    expect(wrapper.find('[data-testid="customs-station-settings"]').text()).toContain('create')
  })

  it('renders the edit settings view with a numeric id', () => {
    const wrapper = mount(CustomsStationEditView, { props: { id: 42 } })

    expect(wrapper.find('[data-testid="customs-station-settings"]').text()).toBe('edit:42')
  })
})
