<script setup>
import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useOrdersStore } from '@/stores/orders.store.js'
import { useOrderStatusStore } from '@/stores/order.status.store.js'
import { storeToRefs } from 'pinia'

const props = defineProps({
  registerId: { type: Number, required: true },
  id: { type: Number, required: true }
})

const ordersStore = useOrdersStore()
const statusStore = useOrderStatusStore()

const { item } = storeToRefs(ordersStore)

statusStore.ensureStatusesLoaded()
await ordersStore.getById(props.id)

const schema = Yup.object().shape({
  statusId: Yup.number().required('Необходимо выбрать статус'),
  rowNumber: Yup.number().required('Необходимо указать номер строки'),
  orderNumber: Yup.string().required('Необходимо указать номер заказа'),
  tnVed: Yup.string().required('Необходимо указать ТН ВЭД')
})

function onSubmit(values, { setErrors }) {
  return ordersStore
    .update(props.id, values)
    .then(() => router.push(`/registers/${props.registerId}/orders`))
    .catch((error) => setErrors({ apiError: error.message || String(error) }))
}
</script>

<template>
  <div class="settings form-2">
    <h1 class="primary-heading">Заказ {{ item?.value?.id }}</h1>
    <hr class="hr" />
    <Form @submit="onSubmit" :initial-values="item" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
      <div class="form-group">
        <label for="rowNumber" class="label">Номер строки:</label>
        <Field name="rowNumber" id="rowNumber" type="number" class="form-control input" :class="{ 'is-invalid': errors.rowNumber }" />
      </div>
      <div class="form-group">
        <label for="orderNumber" class="label">Номер заказа:</label>
        <Field name="orderNumber" id="orderNumber" type="text" class="form-control input" :class="{ 'is-invalid': errors.orderNumber }" />
      </div>
      <div class="form-group">
        <label for="tnVed" class="label">ТН ВЭД:</label>
        <Field name="tnVed" id="tnVed" type="text" class="form-control input" :class="{ 'is-invalid': errors.tnVed }" />
      </div>
      <div class="form-group">
        <label for="statusId" class="label">Статус:</label>
        <Field as="select" name="statusId" id="statusId" class="form-control input" :class="{ 'is-invalid': errors.statusId }">
          <option v-for="s in statusStore.statuses" :key="s.id" :value="s.id">{{ s.title }}</option>
        </Field>
      </div>
      <div class="form-group">
        <button class="button" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          Сохранить
        </button>
        <button class="button" type="button" @click="router.push(`/registers/${props.registerId}/orders`)">Отменить</button>
      </div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
    <div v-if="item?.loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="item?.error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке заказа: {{ item.error }}</div>
    </div>
  </div>
</template>
