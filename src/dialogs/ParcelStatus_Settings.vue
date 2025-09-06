<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref, computed } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  orderStatusId: {
    type: Number,
    required: false
  }
})

const parcelStatusesStore = useParcelStatusesStore()

// Check if we're in create mode
const isCreate = computed(() => props.mode === 'create')

let parcelStatus = ref({
  title: ''
})

if (!isCreate.value) {
  ;({ parcelStatus } = storeToRefs(parcelStatusesStore))
  await parcelStatusesStore.getById(props.orderStatusId)
}

// Get page title
function getTitle() {
  return isCreate.value ? 'Создание статуса посылки' : 'Редактирование статуса посылки'
}

// Get button text
function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

// Validation schema
const schema = Yup.object({
  title: Yup.string().required('Название статуса обязательно')
})

// Form submission
function onSubmit(values, { setErrors }) {
  if (isCreate.value) {
    return parcelStatusesStore
      .create(values)
      .then(() => {
        router.push('/parcelstatuses')
      })
      .catch((error) => {
        if (error.message?.includes('409')) {
          setErrors({ apiError: 'Такой статус посылки уже существует' })
        } else {
          setErrors({ apiError: error.message || 'Ошибка при создании статуса посылки' })
        }
      })
  } else {
    return parcelStatusesStore
      .update(props.orderStatusId, values)
      .then(() => {
        router.push('/parcelstatuses')
      })
      .catch((error) => {
        setErrors({ apiError: error.message || 'Ошибка при сохранении статуса посылки' })
      })
  }
}
</script>

<template>
  <div class="settings form-2">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />
    <Form
      @submit="onSubmit"
      :initial-values="parcelStatus"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="title" class="label">Название статуса:</label>
        <Field
          name="title"
          id="title"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.title }"
          placeholder="Название статуса"
        />
      </div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          {{ getButtonText() }}
        </button>
        <button
          class="button secondary"
          type="button"
          @click="$router.push('/parcelstatuses')"
        >
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>

      <div v-if="errors.title" class="alert alert-danger mt-3 mb-0">{{ errors.title }}</div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
  </div>
</template>