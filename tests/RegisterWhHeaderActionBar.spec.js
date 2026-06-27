/* @vitest-environment jsdom */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import RegisterWhHeaderActionBar from '@/components/RegisterWhHeaderActionBar.vue'

const confirmMock = vi.hoisted(() => vi.fn())
const download = vi.fn().mockResolvedValue(true)
let isWhManagerPlus = true
let isSrLogistPlus = true

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    download
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    isWhManagerPlus,
    isSrLogistPlus
  })
}))

const ActionButton2LStub = {
  name: 'ActionButton2L',
  props: ['options', 'disabled'],
  template: '<div data-testid="export-btn"></div>'
}

const ActionButtonStub = {
  name: 'ActionButton',
  props: ['icon', 'disabled', 'tooltipText'],
  emits: ['click'],
  template: `<button
    type="button"
    :data-testid="icon?.includes('xmark') ? 'close-btn' : icon?.includes('pen-to-square') ? 'bulk-status-btn' : 'action-btn'"
    :title="tooltipText"
    :disabled="disabled"
    @click="$emit('click')"
  />`
}

function createDeferred() {
  let resolve
  const promise = new Promise((res) => {
    resolve = res
  })

  return { promise, resolve }
}

function mountHeaderActionBar(props) {
  return mount(RegisterWhHeaderActionBar, {
    props,
    global: {
      stubs: {
        ActionButton: ActionButtonStub,
        ActionButton2L: ActionButton2LStub
      }
    }
  })
}

describe('RegisterWhHeaderActionBar.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmMock.mockReset()
    isWhManagerPlus = true
    isSrLogistPlus = true
  })

  it('builds export options with "Все посылки" and normalized zone names', () => {
    const wrapper = mountHeaderActionBar({
      register: { id: 77, fileName: 'register_77.xlsx' },
      zones: [
        { value: 1, name: 'Зона 1' },
        { value: 2, name: '' }
      ]
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
    const wrapper = mountHeaderActionBar({
      register: { id: 77, fileName: 'register_77.xlsx' },
      zones: []
    })

    expect(wrapper.findComponent(ActionButton2LStub).exists()).toBe(true)
    expect(wrapper.find('[data-testid="export-btn"]').exists()).toBe(true)
  })

  it('hides export action when user is not warehouse manager plus', () => {
    isWhManagerPlus = false
    const wrapper = mountHeaderActionBar({
      register: { id: 77, fileName: 'register_77.xlsx' },
      zones: []
    })

    expect(wrapper.findComponent(ActionButton2LStub).exists()).toBe(false)
    expect(wrapper.find('[data-testid="export-btn"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="close-btn"]').exists()).toBe(true)
  })

  it('shows bulk status change action when user is senior logist plus', () => {
    isSrLogistPlus = true
    const wrapper = mountHeaderActionBar({
      register: { id: 77, fileName: 'register_77.xlsx' },
      zones: []
    })

    const action = wrapper.get('[data-testid="bulk-status-btn"]')
    expect(action.attributes('title')).toBe('Выбрать посылки и изменить статус')
    expect(action.attributes('disabled')).toBeUndefined()
  })

  it('groups bulk status change action with close action', () => {
    const wrapper = mountHeaderActionBar({
      register: { id: 77, fileName: 'register_77.xlsx' },
      zones: []
    })

    const groups = wrapper.findAll('.header-actions.header-actions-group')
    const lastGroup = groups.at(-1)

    expect(lastGroup.find('[data-testid="bulk-status-btn"]').exists()).toBe(true)
    expect(lastGroup.find('[data-testid="close-btn"]').exists()).toBe(true)
  })

  it('hides bulk status change action when user is not senior logist plus', () => {
    isSrLogistPlus = false
    const wrapper = mountHeaderActionBar({
      register: { id: 77, fileName: 'register_77.xlsx' },
      zones: []
    })

    expect(wrapper.find('[data-testid="bulk-status-btn"]').exists()).toBe(false)
  })

  it('emits bulk status change event from header action', async () => {
    const wrapper = mountHeaderActionBar({
      register: { id: 77, fileName: 'register_77.xlsx' },
      zones: []
    })

    await wrapper.get('[data-testid="bulk-status-btn"]').trigger('click')

    expect(wrapper.emitted('bulk-change-parcel-status')).toHaveLength(1)
  })

  it('disables bulk status change action while loading', () => {
    const wrapper = mountHeaderActionBar({
      register: { id: 77, fileName: 'register_77.xlsx' },
      zones: [],
      loading: true
    })

    expect(wrapper.get('[data-testid="bulk-status-btn"]').attributes('disabled')).toBeDefined()
  })

  it('downloads all parcels without zone arguments', async () => {
    const wrapper = mountHeaderActionBar({
      register: { id: 77, fileName: 'register_77.xlsx' },
      zones: [{ value: 8, name: 'Зона A' }]
    })

    const actionButton2L = wrapper.findComponent(ActionButton2LStub)
    const allParcelsOption = actionButton2L.props('options')[0]
    await allParcelsOption.action()

    expect(download).toHaveBeenCalledWith(77, 'register_77.xlsx', 0, undefined)
  })

  it('downloads selected zone with option label', async () => {
    const wrapper = mountHeaderActionBar({
      register: { id: 77, fileName: 'register_77.xlsx' },
      zones: [{ value: 8, name: 'Зона A' }]
    })

    const actionButton2L = wrapper.findComponent(ActionButton2LStub)
    const zoneOption = actionButton2L.props('options')[1]
    await zoneOption.action()

    expect(download).toHaveBeenCalledWith(77, 'register_77.xlsx', 8, 'Зона A')
  })

  it('downloads selected zone with correction when selected', async () => {
    confirmMock.mockResolvedValueOnce(true)
    const wrapper = mountHeaderActionBar({
      register: {
        id: 77,
        fileName: 'register_77.xlsx',
        realWeightKg: 5,
        totalWeightKgToRelease: 10
      },
      zones: [{ value: 8, name: 'Зона A' }]
    })

    const actionButton2L = wrapper.findComponent(ActionButton2LStub)
    const zoneOption = actionButton2L.props('options')[1]
    await zoneOption.action()

    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Применить поправочный коэффициент 0,500 для веса посылок?'
    }))
    expect(download).toHaveBeenCalledWith(77, 'register_77.xlsx', 8, 'Зона A', true)
  })

  it('prevents another export while the correction choice dialog is open', async () => {
    const deferred = createDeferred()
    confirmMock.mockReturnValueOnce(deferred.promise)
    const wrapper = mountHeaderActionBar({
      register: {
        id: 77,
        fileName: 'register_77.xlsx',
        realWeightKg: 5,
        totalWeightKgToRelease: 10
      },
      zones: [{ value: 8, name: 'Зона A' }]
    })

    const actionButton2L = wrapper.findComponent(ActionButton2LStub)
    const allParcelsOption = actionButton2L.props('options')[0]
    const zoneOption = actionButton2L.props('options')[1]

    const firstPromise = zoneOption.action()
    await nextTick()

    expect(wrapper.findComponent(ActionButton2LStub).props('disabled')).toBe(true)

    const secondPromise = allParcelsOption.action()
    await nextTick()

    deferred.resolve(true)

    await firstPromise
    await secondPromise

    expect(download).toHaveBeenCalledTimes(1)
    expect(download).toHaveBeenCalledWith(77, 'register_77.xlsx', 8, 'Зона A', true)

    await nextTick()
    expect(wrapper.findComponent(ActionButton2LStub).props('disabled')).toBe(false)
  })

  it('downloads selected zone without correction when correction is declined', async () => {
    confirmMock.mockResolvedValueOnce(false)
    const wrapper = mountHeaderActionBar({
      register: {
        id: 77,
        fileName: 'register_77.xlsx',
        realWeightKg: 5,
        totalWeightKgToRelease: 10
      },
      zones: [{ value: 8, name: 'Зона A' }]
    })

    const actionButton2L = wrapper.findComponent(ActionButton2LStub)
    const zoneOption = actionButton2L.props('options')[1]
    await zoneOption.action()

    expect(download).toHaveBeenCalledWith(77, 'register_77.xlsx', 8, 'Зона A')
  })

  it('emits close on close button click', async () => {
    const wrapper = mountHeaderActionBar({
      register: { id: 55, fileName: 'register_55.xlsx' },
      zones: []
    })

    await wrapper.get('[data-testid="close-btn"]').trigger('click')
    expect(wrapper.emitted('close')?.length).toBeGreaterThanOrEqual(1)
  })

  it('displays spinner when loading is true', () => {
    const wrapper = mountHeaderActionBar({
      register: { id: 55, fileName: 'register_55.xlsx' },
      zones: [],
      loading: true
    })

    const spinner = wrapper.find('.spinner-border')
    expect(spinner.exists()).toBe(true)
  })

  it('does not display spinner when loading is false', () => {
    const wrapper = mountHeaderActionBar({
      register: { id: 55, fileName: 'register_55.xlsx' },
      zones: [],
      loading: false
    })

    const spinner = wrapper.find('.spinner-border')
    expect(spinner.exists()).toBe(false)
  })
})
