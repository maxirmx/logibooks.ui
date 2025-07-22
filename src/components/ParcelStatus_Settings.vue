<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
// notice, this list of conditions and the following disclaimer in the
// documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { ref, computed } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useOrderStatusesStore } from '@/stores/order.statuses.store.js'

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

const orderStatusesStore = useOrderStatusesStore()

// Check if we're in create mode
const isCreate = computed(() => props.mode === 'create')

let orderStatus = ref({
  title: ''
})

if (!isCreate.value) {
  ;({ orderStatus } = storeToRefs(orderStatusesStore))
  await orderStatusesStore.getById(props.orderStatusId)
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
    return orderStatusesStore
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
    return orderStatusesStore
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
      :initial-values="orderStatus"
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

      <div class="form-group">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          {{ getButtonText() }}
        </button>
        <button
          class="button secondary"
          type="button"
          @click="$router.push('/parcelstatuses')"
        >
          Отмена
        </button>
      </div>

      <div v-if="errors.title" class="alert alert-danger mt-3 mb-0">{{ errors.title }}</div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
  </div>
</template>