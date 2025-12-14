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
  article: '',
  number: '',
  terminationDate: '',
  publicationDate: '',
  registrationDate: ''
})

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
  article: Yup.string().required('Необходимо ввести артикул'),
  number: Yup.string(),
  terminationDate: Yup.string().required('Необходимо ввести срок действия'),
  publicationDate: Yup.string().required('Необходимо ввести дату публикации'),
  registrationDate: Yup.string().required('Необходимо ввести дату регистрации')
})

function onSubmit(values, { setErrors }) {
  const payload = {
    article: values.article?.trim() || '',
    number: values.number?.trim() || '',
    terminationDate: values.terminationDate,
    publicationDate: values.publicationDate,
    registrationDate: values.registrationDate
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
  } else {
    payload.id = props.notificationId
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

if (!isCreate.value) {
  const loaded = await notificationsStore.getById(props.notificationId)
  if (loaded) {
    notificationForm.value = {
      article: loaded.article || '',
      number: loaded.number || '',
      terminationDate: formatDateForInput(loaded.terminationDate),
      publicationDate: formatDateForInput(loaded.publicationDate),
      registrationDate: formatDateForInput(loaded.registrationDate)
    }
  } else {
    router.push('/notifications')
  }
}

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
        <label for="article" class="label">Артикул:</label>
        <Field
          name="article"
          id="article"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.article }"
          placeholder="Артикул"
        />
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
      </div>

      <div class="form-group">
        <label for="registrationDate" class="label">Дата регистрации:</label>
        <Field
          name="registrationDate"
          id="registrationDate"
          type="date"
          class="form-control input"
          :class="{ 'is-invalid': errors.registrationDate }"
        />
      </div>

      <div class="form-group">
        <label for="publicationDate" class="label">Дата публикации:</label>
        <Field
          name="publicationDate"
          id="publicationDate"
          type="date"
          class="form-control input"
          :class="{ 'is-invalid': errors.publicationDate }"
        />
      </div>

      <div class="form-group">
        <label for="terminationDate" class="label">Срок действия:</label>
        <Field
          name="terminationDate"
          id="terminationDate"
          type="date"
          class="form-control input"
          :class="{ 'is-invalid': errors.terminationDate }"
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
          @click="$router.push('/notifications')"
        >
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>

      <div v-if="errors.article" class="alert alert-danger mt-3 mb-0">{{ errors.article }}</div>
      <div v-if="errors.number" class="alert alert-danger mt-3 mb-0">{{ errors.number }}</div>
      <div v-if="errors.registrationDate" class="alert alert-danger mt-3 mb-0">{{ errors.registrationDate }}</div>
      <div v-if="errors.publicationDate" class="alert alert-danger mt-3 mb-0">{{ errors.publicationDate }}</div>
      <div v-if="errors.terminationDate" class="alert alert-danger mt-3 mb-0">{{ errors.terminationDate }}</div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
  </div>
</template>
