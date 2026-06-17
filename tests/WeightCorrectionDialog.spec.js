/* @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WeightCorrectionChoiceDialog from '@/l2/WeightCorrectionChoiceDialog.vue'
import {
  confirmOutputWeightCorrection,
  getCorrectedWeight,
  WEIGHT_CORRECTION_CHOICE
} from '@/helpers/weight.correction.helpers.js'

const VDialogStub = {
  name: 'VDialog',
  props: {
    modelValue: Boolean,
    width: String,
    minWidth: String,
    persistent: Boolean
  },
  template: '<div data-testid="dialog"><slot /></div>'
}

const VBtnStub = {
  name: 'VBtn',
  props: ['color'],
  emits: ['click'],
  template: '<button type="button" :data-color="color || \'\'" @click="$emit(\'click\')"><slot /></button>'
}

function mountDialog(state = { show: true, coefficientText: '0,500' }) {
  return mount(WeightCorrectionChoiceDialog, {
    props: { state },
    global: {
      stubs: {
        VDialog: VDialogStub,
        VCard: { template: '<div><slot /></div>' },
        VCardTitle: { template: '<div data-testid="title"><slot /></div>' },
        VCardText: { template: '<div data-testid="text"><slot /></div>' },
        VCardActions: { template: '<div data-testid="actions"><slot /></div>' },
        VSpacer: { template: '<span data-testid="spacer" />' },
        VBtn: VBtnStub
      }
    }
  })
}

describe('weight correction confirmation dialogs', () => {
  it('calculates corrected parcel weight only when register correction is possible', () => {
    expect(getCorrectedWeight(2.4, { realWeightKg: 5, totalWeightKgToRelease: 10 })).toBe(1.2)
    expect(getCorrectedWeight(2.4, { realWeightKg: null, totalWeightKgToRelease: 10 })).toBeNull()
    expect(getCorrectedWeight(2.4, { realWeightKg: 0, totalWeightKgToRelease: 10 })).toBeNull()
    expect(getCorrectedWeight(2.4, { realWeightKg: -1, totalWeightKgToRelease: 10 })).toBeNull()
    expect(getCorrectedWeight(2.4, { realWeightKg: 5, totalWeightKgToRelease: 0 })).toBeNull()
    expect(getCorrectedWeight(null, { realWeightKg: 5, totalWeightKgToRelease: 10 })).toBeNull()
  })

  it('uses the same confirm dialog style as delete confirmations', async () => {
    const confirm = vi.fn().mockResolvedValue(true)

    await confirmOutputWeightCorrection(confirm, {
      realWeightKg: 5,
      totalWeightKgToRelease: 10
    })

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Подтверждение',
      dialogProps: {
        width: '30%',
        minWidth: '250px'
      },
      confirmationButtonProps: {
        color: 'orange-darken-3'
      },
      content: 'К весу посылок будет применён поправочный коэффициент 0,500. Вы уверены?'
    }))
  })

  it('renders optional choice dialog with matching size and action color', async () => {
    const wrapper = mountDialog()

    const dialog = wrapper.findComponent(VDialogStub)
    expect(dialog.props('width')).toBe('30%')
    expect(dialog.props('minWidth')).toBe('250px')
    expect(dialog.props('persistent')).toBe(true)
    expect(wrapper.get('[data-testid="title"]').text()).toBe('Подтверждение')
    expect(wrapper.get('[data-testid="text"]').text()).toBe(
      'К весу посылок будет применён поправочный коэффициент 0,500. Вы уверены?'
    )

    const buttons = wrapper.findAll('button')
    expect(buttons.map(button => button.text())).toEqual([
      'Отменить сохранение',
      'Сохранить без поправки',
      'Сохранить с поправкой'
    ])
    expect(buttons[2].attributes('data-color')).toBe('orange-darken-3')

    await buttons[2].trigger('click')
    expect(wrapper.emitted('choose')?.[0]).toEqual([WEIGHT_CORRECTION_CHOICE.Apply])
  })
})
