/* @vitest-environment jsdom */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import RegisterWhHeaderActionBar from '@/components/RegisterWhHeaderActionBar.vue'
import WeightCorrectionChoiceDialog from '@/l2/WeightCorrectionChoiceDialog.vue'
import { WEIGHT_CORRECTION_CHOICE } from '@/helpers/weight.correction.helpers.js'

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
  props: ['options', 'disabled'],
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

const WeightCorrectionChoiceDialogStub = {
  name: 'WeightCorrectionChoiceDialog',
  props: ['state'],
  emits: ['choose'],
  template: '<div data-testid="weight-correction-dialog"></div>'
}

function mountHeaderActionBar(props) {
  return mount(RegisterWhHeaderActionBar, {
    props,
    global: {
      stubs: {
        ActionButton: ActionButtonStub,
        ActionButton2L: ActionButton2LStub,
        WeightCorrectionChoiceDialog: WeightCorrectionChoiceDialogStub
      }
    }
  })
}

describe('RegisterWhHeaderActionBar.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isWhManagerPlus = true
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
    const promise = zoneOption.action()
    await nextTick()

    const dialog = wrapper.findComponent(WeightCorrectionChoiceDialog)
    expect(dialog.props('state').show).toBe(true)

    dialog.vm.$emit('choose', WEIGHT_CORRECTION_CHOICE.Apply)
    await promise

    expect(download).toHaveBeenCalledWith(77, 'register_77.xlsx', 8, 'Зона A', true)
  })

  it('prevents another export while the correction choice dialog is open', async () => {
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

    wrapper
      .findComponent(WeightCorrectionChoiceDialog)
      .vm.$emit('choose', WEIGHT_CORRECTION_CHOICE.Apply)

    await firstPromise
    await secondPromise

    expect(download).toHaveBeenCalledTimes(1)
    expect(download).toHaveBeenCalledWith(77, 'register_77.xlsx', 8, 'Зона A', true)

    await nextTick()
    expect(wrapper.findComponent(ActionButton2LStub).props('disabled')).toBe(false)
  })

  it('cancels selected zone download from correction dialog', async () => {
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
    const promise = zoneOption.action()
    await nextTick()

    wrapper
      .findComponent(WeightCorrectionChoiceDialog)
      .vm.$emit('choose', WEIGHT_CORRECTION_CHOICE.Cancel)
    await promise

    expect(download).not.toHaveBeenCalled()
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
