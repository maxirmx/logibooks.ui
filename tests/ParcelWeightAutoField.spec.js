// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelWeightAutoField from '@/components/ParcelWeightAutoField.vue'

const editableFieldStub = {
  props: ['name', 'type', 'step', 'errors', 'fullWidth'],
  template: '<div data-testid="editable-weight-field">{{ name }}:editable</div>'
}

const fontAwesomeIconStub = {
  props: ['icon'],
  template: '<i :data-icon="icon" class="fa-stub"></i>'
}

function mountField(props) {
  return mount(ParcelWeightAutoField, {
    props: {
      fieldComponent: editableFieldStub,
      label: 'Вес',
      errors: {},
      ...props
    },
    global: {
      stubs: {
        'font-awesome-icon': fontAwesomeIconStub
      }
    }
  })
}

describe('ParcelWeightAutoField', () => {
  it('keeps the weight field editable when register correction is unavailable', () => {
    const wrapper = mountField({
      item: { weightKg: 2.4, weightCorrectionEligible: true },
      register: { realWeightKg: null, totalWeightKgToRelease: 10 }
    })

    expect(wrapper.get('[data-testid="editable-weight-field"]').text()).toBe('weightKg:editable')
    expect(wrapper.find('.parcel-weight-auto-field').exists()).toBe(false)
  })

  it('renders readonly original and corrected weight for eligible parcels', () => {
    const wrapper = mountField({
      item: { weightKg: 2.4, weightCorrectionEligible: true },
      register: { realWeightKg: 5, totalWeightKgToRelease: 10 }
    })

    expect(wrapper.find('[data-testid="editable-weight-field"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('2.400')
    expect(wrapper.text()).toContain('1.200')
    expect(wrapper.text()).toContain('(Автоматический расчёт)')
    expect(wrapper.get('[data-icon="fa-solid fa-arrow-right"]').exists()).toBe(true)
  })

  it('renders readonly original weight without correction for non-eligible parcels', () => {
    const wrapper = mountField({
      item: { weightKg: 2.4, weightCorrectionEligible: false },
      register: { realWeightKg: 5, totalWeightKgToRelease: 10 }
    })

    expect(wrapper.find('[data-testid="editable-weight-field"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('2.400')
    expect(wrapper.text()).toContain('(Автоматический расчёт)')
    expect(wrapper.text()).not.toContain('1.200')
    expect(wrapper.find('[data-icon="fa-solid fa-arrow-right"]').exists()).toBe(false)
  })
})
