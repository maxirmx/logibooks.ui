// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { Field, Form as VeeForm } from 'vee-validate'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import FieldError from '@/components/FieldError.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import {
  approveParcel,
  approveParcelWithExcise,
  approveParcelWithNotification,
  validateParcelData
} from '@/helpers/parcel.actions.helpers.js'

describe('parcel action failure presentation', () => {
  let wrapper
  let store
  let item
  let alertStore

  beforeEach(() => {
    setActivePinia(createPinia())
    alertStore = useAlertStore()
    item = ref({ id: 7, productName: 'original', tnVed: 'old' })
    store = {
      update: vi.fn().mockResolvedValue(undefined),
      approve: vi.fn().mockResolvedValue(true),
      validate: vi.fn().mockResolvedValue(true),
      getById: vi.fn().mockResolvedValue({ id: 7, productName: 'edited', tnVed: '1234567890' }),
      error: null
    }
  })

  afterEach(() => wrapper?.unmount())

  const actions = {
    approve: (values, setErrors) => approveParcel(values, item, store, undefined, undefined, { setErrors }),
    excise: (values, setErrors, setFieldValue) => approveParcelWithExcise(values, item, store, undefined, {
      setErrors, onRefreshed: parcel => setFieldValue('tnVed', parcel.tnVed)
    }),
    notification: (values, setErrors) => approveParcelWithNotification(values, item, store, undefined, { setErrors }),
    stopWords: (values, setErrors) => validateParcelData(values, item, store, true, undefined, undefined, { setErrors }),
    tnved: (values, setErrors) => validateParcelData(values, item, store, false, undefined, undefined, { setErrors })
  }

  async function editor(action) {
    wrapper = mount(defineComponent({
      components: { Field, VeeForm, FieldError, PageAlertRegion },
      setup: () => ({ initialValues: item.value, run: actions[action] }),
      template: `<VeeForm :initial-values="initialValues" v-slot="{ values, errors, setErrors, setFieldValue }">
        <h1>Посылка</h1><hr class="hr"><PageAlertRegion />
        <div class="form-group"><Field name="productName" data-testid="product" />
          <FieldError name="productName" :errors="errors" /></div>
        <Field name="tnVed" data-testid="tnved" />
        <button type="button" data-testid="run" @click="run(values, setErrors, setFieldValue)">Выполнить</button>
      </VeeForm>`
    }))
    await flushPromises()
    await wrapper.get('[data-testid="product"]').setValue('edited')
  }

  it.each(['approve', 'stopWords'])('%s reports a refresh failure after successful mutation without resubmitting', async action => {
    store.getById.mockRejectedValueOnce(new Error('соединение потеряно'))
    await editor(action)
    await wrapper.get('[data-testid="run"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain(action === 'approve' ? 'Посылка согласована' : 'Проверка посылки выполнена')
    expect(alertStore.alert).not.toHaveProperty('action')
    expect(store.update).toHaveBeenCalledOnce()
    expect(action === 'approve' ? store.approve : store.validate).toHaveBeenCalledOnce()
  })



  it('returns unsuccessful for a stale parcel and preserves successful approval data', async () => {
    await expect(approveParcel({ id: 8 }, item, store)).resolves.toBe(false)
    await expect(validateParcelData({ id: 8 }, item, store, true)).resolves.toBe(false)
    await expect(approveParcel({ id: 7 }, item, store)).resolves.toMatchObject({ tnVed: '1234567890' })
    expect(store.update).toHaveBeenCalledOnce()
  })
})
