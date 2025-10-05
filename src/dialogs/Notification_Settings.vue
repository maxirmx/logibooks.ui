<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref, computed } from 'vue'
import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useNotificationsStore } from '@/stores/notifications.store.js'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  notificationId: {
    type: Number,
    required: false
  }
})

const notificationsStore = useNotificationsStore()

const isCreate = computed(() => props.mode === 'create')

const notificationForm = ref({
  model: '',
  number: '',
  terminationDate: ''
})

if (!isCreate.value) {
  const loaded = await notificationsStore.getById(props.notificationId)
  if (loaded) {
    notificationForm.value = {
      model: loaded.model || '',
      number: loaded.number || '',
      terminationDate: formatDateForInput(loaded.terminationDate)
    }
  } else {
    router.push('/notifications')
  }
}

function formatDateForInput(value) {
  if (!value) {
    return ''
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'string') {
    if (value.includes('T')) {
      return value.slice(0, 10)
    }
    return value
  }

  if (typeof value === 'object' && value.year && value.month && value.day) {
    const month = String(value.month).padStart(2, '0')
    const day = String(value.day).padStart(2, '0')
    return `${value.year}-${month}-${day}`
  }

  return ''
}

function getTitle() {
  return isCreate.value ? 'Регистрация нотификации' : 'Изменить информацию о нотификации'
}

function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

const schema = Yup.object({
  model: Yup.string().required('Модель обязательна'),
  number: Yup.string(),
  terminationDate: Yup.string().required('Дата окончания обязательна')
})

function onSubmit(values, { setErrors }) {
  const payload = {
    model: values.model?.trim() || '',
    number: values.number?.trim() || '',
    terminationDate: values.terminationDate
  }

  if (isCreate.value) {
    return notificationsStore
      .create(payload)
      .then(() => {
        router.push('/notifications')
      })
      .catch((error) => {
        setErrors({ apiError: error.message || 'Ошибка при создании нотификации' })
      })
  }

  return notificationsStore
    .update(props.notificationId, payload)
    .then(() => {
      router.push('/notifications')
    })
    .catch((error) => {
      setErrors({ apiError: error.message || 'Ошибка при сохранении нотификации' })
    })
}

defineExpose({
  formatDateForInput,
  getTitle,
  getButtonText,
  onSubmit
})

</script>

<template>
  <div class="settings form-2">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />
    <Form
      @submit="onSubmit"
      :initial-values="notificationForm"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="model" class="label">Модель:</label>
        <Field
          name="model"
          id="model"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.model }"
          placeholder="Модель"
        />
        <div v-if="errors.model" class="invalid-feedback">{{ errors.model }}</div>
      </div>

      <div class="form-group">
        <label for="number" class="label">Номер:</label>
        <Field
          name="number"
          id="number"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.number }"
          placeholder="Номер"
        />
        <div v-if="errors.number" class="invalid-feedback">{{ errors.number }}</div>
      </div>

      <div class="form-group">
        <label for="terminationDate" class="label">Дата окончания:</label>
        <Field
          name="terminationDate"
          id="terminationDate"
          type="date"
          class="form-control input"
          :class="{ 'is-invalid': errors.terminationDate }"
        />
        <div v-if="errors.terminationDate" class="invalid-feedback">{{ errors.terminationDate }}</div>
      </div>

      <div v-if="errors.apiError" class="alert alert-danger">{{ errors.apiError }}</div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
          {{ getButtonText() }}
        </button>
      </div>
    </Form>
  </div>
</template>
