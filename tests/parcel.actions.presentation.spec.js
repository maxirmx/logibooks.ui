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

  it.each(Object.keys(actions))('%s shows a real API conflict once, preserves values and retries', async action => {
    const message = 'В реестре выполняется пакетная проверка по стоп-словам. Дождитесь её завершения и повторите действие.'
    const operation = action === 'stopWords' || action === 'tnved' ? store.validate : store.approve
    operation.mockRejectedValueOnce(Object.assign(new Error(message), {
      status: 409, data: { msg: message, errors: {}, code: 'RegisterBulkValidationInProgress' }
    }))
    await editor(action)
    await wrapper.get('[data-testid="run"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain(message)
    expect(wrapper.get('[data-testid="product"]').element.value).toBe('edited')
    expect(store.getById).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="run"]').trigger('click')
    await flushPromises()
    expect(operation).toHaveBeenCalledTimes(2)
    expect(store.update).toHaveBeenLastCalledWith(7, expect.objectContaining({ productName: 'edited' }))
    expect(store.getById).toHaveBeenCalledOnce()
  })

  it.each(['approve', 'stopWords'])('%s maps a failed save to its field and prevents the downstream action', async action => {
    store.update.mockRejectedValueOnce(Object.assign(new Error('Ошибка полей'), {
      status: 400, data: { msg: 'Ошибка полей', errors: { ProductName: ['Проверьте название'] } }
    }))
    await editor(action)
    await wrapper.get('[data-testid="run"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="page-alert-region"]').exists()).toBe(false)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    const input = wrapper.get('[data-testid="product"]')
    expect(input.element.parentElement.textContent).toContain('Проверьте название')
    expect(input.element.value).toBe('edited')
    expect(store.approve).not.toHaveBeenCalled()
    expect(store.validate).not.toHaveBeenCalled()
    expect(store.getById).not.toHaveBeenCalled()
  })

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



  it('preserves a touched TN VED field after a failed excise refresh', async () => {
    store.getById.mockRejectedValueOnce(new Error('соединение потеряно'))
    await editor('excise')
    await wrapper.get('[data-testid="tnved"]').setValue('edited-code')
    await wrapper.get('[data-testid="tnved"]').trigger('blur')
    await wrapper.get('[data-testid="run"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="tnved"]').element.value).toBe('edited-code')
    expect(wrapper.get('[role="alert"]').text()).toContain('соединение потеряно')
    expect(store.approve).toHaveBeenCalledOnce()
  })

  it('returns unsuccessful for a stale parcel and preserves successful approval data', async () => {
    await expect(approveParcel({ id: 8 }, item, store)).resolves.toBe(false)
    await expect(validateParcelData({ id: 8 }, item, store, true)).resolves.toBe(false)
    await expect(approveParcel({ id: 7 }, item, store)).resolves.toMatchObject({ tnVed: '1234567890' })
    expect(store.update).toHaveBeenCalledOnce()
  })
})
