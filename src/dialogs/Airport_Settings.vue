<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import FieldError from '@/components/FieldError.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { focusFirstInvalidField } from '@/helpers/form.validation.helpers.js'
import { runWithRetryAlert } from '@/helpers/notification.helpers.js'
import { reportFormError } from '@/helpers/error.helpers.js'
import { ref, computed } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useAirportsStore } from '@/stores/airports.store.js'

const alertStore = useAlertStore()

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  airportId: {
    type: Number,
    required: false
  }
})

const airportsStore = useAirportsStore()

const isCreate = computed(() => props.mode === 'create')

let airport = ref({
  codeIata: '',
  name: ''
})

if (!isCreate.value) {
  ;({ airport } = storeToRefs(airportsStore))
  await runWithRetryAlert(() => airportsStore.getById(props.airportId), {
    fallback: 'Не удалось загрузить аэропорт'
  })
}

function getTitle() {
  return isCreate.value ? 'Регистрация кода аэропорта' : 'Изменить информацию о коде аэропорта'
}

function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

const schema = Yup.object({
  codeIata: Yup.string()
    .required('Код ИАТА обязателен')
    .matches(/^[A-Za-z]{3}$/, 'Код ИАТА должен содержать ровно 3 буквы'),
  name: Yup.string().required('Название аэропорта обязательно')
})

function onSubmit(values, { setErrors } = {}) {
  // Convert IATA code to uppercase
  const processedValues = {
    ...values,
    codeIata: values.codeIata.toUpperCase()
  }

  if (isCreate.value) {
    return airportsStore
      .create(processedValues)
      .then(() => {
        router.push('/airports')
      })
      .catch((error) => {
        if (error.message?.includes('409')) {
          alertStore.error('Аэропорт с таким кодом ИАТА уже существует')
        } else {
          reportFormError(error, {
            setErrors,
            alertStore,
            fallback: 'Ошибка при регистрации аэропорта'
          })
        }
      })
  }

  return airportsStore
    .update(props.airportId, processedValues)
    .then(() => {
      router.push('/airports')
    })
    .catch((error) => {
      reportFormError(error, {
        setErrors,
        alertStore,
        fallback: 'Ошибка при сохранении информации об аэропорте'
      })
    })
}
</script>

<template>
  <div class="settings form-3">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />

    <PageAlertRegion />
    <Form
      @invalid-submit="focusFirstInvalidField"
      @submit="onSubmit"
      :initial-values="airport"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="name" class="label">Название:</label>
        <Field
          name="name"
          id="name"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.name }"
          placeholder="Название аэропорта"
        />
        <FieldError name="name" :errors="errors" />
      </div>

      <div class="form-group">
        <label for="codeIata" class="label">Код ИАТА:</label>
        <Field
          name="codeIata"
          id="codeIata"
          type="text"
          class="form-control input iata-code-field"
          :class="{ 'is-invalid': errors.codeIata }"
          placeholder="Код"
          maxlength="3"
        />
        <FieldError name="codeIata" :errors="errors" />
      </div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          {{ getButtonText() }}
        </button>
        <button class="button secondary" type="button" @click="$router.push('/airports')">
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>
    </Form>
  </div>
</template>

<style scoped>
.iata-code-field {
  text-transform: uppercase !important;
  width: 80px !important;
  max-width: 80px !important;
  min-width: 80px !important;
  flex: none !important;
  display: inline-block !important;
}
</style>
