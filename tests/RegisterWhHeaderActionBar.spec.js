/* @vitest-environment jsdom */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RegisterWhHeaderActionBar from '@/components/RegisterWhHeaderActionBar.vue'

const download = vi.fn().mockResolvedValue(true)

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    download
  })
}))

const ActionButton2LStub = {
  name: 'ActionButton2L',
  props: ['options'],
  template: '<div data-testid="export-btn"></div>'
}

const ActionButtonStub = {
  name: 'ActionButton',
  props: ['icon'],
  template: `<button
    type="button"
    :data-testid="icon?.includes('xmark') ? 'close-btn' : 'action-btn'"
    @click="$emit('click')"
  />`
}

describe('RegisterWhHeaderActionBar.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds export options with "Все посылки" and normalized zone names', () => {
    const wrapper = mount(RegisterWhHeaderActionBar, {
      props: {
        register: { id: 77, fileName: 'register_77.xlsx' },
        zones: [
          { value: 1, name: 'Зона 1' },
          { value: 2, name: '' }
        ]
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          ActionButton2L: ActionButton2LStub
        }
      }
    })

    const actionButton2L = wrapper.findComponent(ActionButton2LStub)
    const labels = actionButton2L.props('options').map(option => option.label)
    expect(labels).toEqual([
      'Все посылки',
      'Зона 1',
      'Без зоны (не найдены)'
    ])
  })

  it('downloads selected zone with option label', async () => {
    const wrapper = mount(RegisterWhHeaderActionBar, {
      props: {
        register: { id: 77, fileName: 'register_77.xlsx' },
        zones: [{ value: 8, name: 'Зона A' }]
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          ActionButton2L: ActionButton2LStub
        }
      }
    })

    const actionButton2L = wrapper.findComponent(ActionButton2LStub)
    const zoneOption = actionButton2L.props('options')[1]
    await zoneOption.action()

    expect(download).toHaveBeenCalledWith(77, 'register_77.xlsx', 8, 'Зона A')
  })

  it('emits close on close button click', async () => {
    const wrapper = mount(RegisterWhHeaderActionBar, {
      props: {
        register: { id: 55, fileName: 'register_55.xlsx' },
        zones: []
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          ActionButton2L: ActionButton2LStub
        }
      }
    })

    await wrapper.get('[data-testid="close-btn"]').trigger('click')
    expect(wrapper.emitted('close')?.length).toBeGreaterThanOrEqual(1)
  })
})
