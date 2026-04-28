/* @vitest-environment jsdom */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RegisterWhHeaderActionBar from '@/components/RegisterWhHeaderActionBar.vue'

const download = vi.fn().mockResolvedValue(true)
let isWhManagerPlus = true

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    download
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    isWhManagerPlus
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
    isWhManagerPlus = true
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

  it('shows export action when user is warehouse manager plus', () => {
    isWhManagerPlus = true
    const wrapper = mount(RegisterWhHeaderActionBar, {
      props: {
        register: { id: 77, fileName: 'register_77.xlsx' },
        zones: []
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          ActionButton2L: ActionButton2LStub
        }
      }
    })

    expect(wrapper.findComponent(ActionButton2LStub).exists()).toBe(true)
    expect(wrapper.find('[data-testid="export-btn"]').exists()).toBe(true)
  })

  it('hides export action when user is not warehouse manager plus', () => {
    isWhManagerPlus = false
    const wrapper = mount(RegisterWhHeaderActionBar, {
      props: {
        register: { id: 77, fileName: 'register_77.xlsx' },
        zones: []
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          ActionButton2L: ActionButton2LStub
        }
      }
    })

    expect(wrapper.findComponent(ActionButton2LStub).exists()).toBe(false)
    expect(wrapper.find('[data-testid="export-btn"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="close-btn"]').exists()).toBe(true)
  })

  it('downloads all parcels without zone arguments', async () => {
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
    const allParcelsOption = actionButton2L.props('options')[0]
    await allParcelsOption.action()

    expect(download).toHaveBeenCalledWith(77, 'register_77.xlsx', 0, undefined)
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

  it('displays spinner when loading is true', () => {
    const wrapper = mount(RegisterWhHeaderActionBar, {
      props: {
        register: { id: 55, fileName: 'register_55.xlsx' },
        zones: [],
        loading: true
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          ActionButton2L: ActionButton2LStub
        }
      }
    })

    const spinner = wrapper.find('.spinner-border')
    expect(spinner.exists()).toBe(true)
  })

  it('does not display spinner when loading is false', () => {
    const wrapper = mount(RegisterWhHeaderActionBar, {
      props: {
        register: { id: 55, fileName: 'register_55.xlsx' },
        zones: [],
        loading: false
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          ActionButton2L: ActionButton2LStub
        }
      }
    })

    const spinner = wrapper.find('.spinner-border')
    expect(spinner.exists()).toBe(false)
  })
})
