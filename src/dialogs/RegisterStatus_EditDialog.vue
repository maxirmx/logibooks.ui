<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref, computed } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  registerStatusId: {
    type: Number,
    required: false
  }
})

const registerStatusesStore = useRegisterStatusesStore()

// Check if we're in create mode
const isCreate = computed(() => props.mode === 'create')

let registerStatus

if (isCreate.value) {
  registerStatus = ref({
    title: ''
  })
} else {
  registerStatus = storeToRefs(registerStatusesStore).registerStatus
  await registerStatusesStore.getById(props.registerStatusId)
}

// Get page title
function getTitle() {
  return isCreate.value ? 'Создание статуса реестра' : 'Редактирование статуса реестра'
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
    return registerStatusesStore
      .create(values)
      .then(() => {
        router.push('/registerstatuses')
      })
      .catch((error) => {
        if (error.message?.includes('409')) {
          setErrors({ apiError: 'Такой статус реестра уже существует' })
        } else {
          setErrors({ apiError: error.message || 'Ошибка при создании статуса реестра' })
        }
      })
  } else {
    return registerStatusesStore
      .update(props.registerStatusId, values)
      .then(() => {
        router.push('/registerstatuses')
      })
      .catch((error) => {
        setErrors({ apiError: error.message || 'Ошибка при сохранении статуса реестра' })
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
      :initial-values="registerStatus"
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
          @click="$router.push('/registerstatuses')"
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
