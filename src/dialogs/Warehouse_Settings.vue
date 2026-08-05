<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import FieldError from '@/components/FieldError.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { focusFirstInvalidField } from '@/helpers/form.validation.helpers.js'
import { runWithRetryAlert } from '@/helpers/notification.helpers.js'
import { reportFormError } from '@/helpers/error.helpers.js'
import { ref, computed } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  warehouseId: {
    type: Number,
    required: false
  }
})

const warehousesStore = useWarehousesStore()
const countriesStore = useCountriesStore()
const { countries } = storeToRefs(countriesStore)

const isCreate = computed(() => props.mode === 'create')

const warehouseTypeOptions = [
  { value: 0, label: 'Склад временного хранения' },
  { value: 1, label: 'Сортировочный склад' }
]

let warehouse = ref({
  id: 0,
  name: '',
  countryIsoNumeric: null,
  postalCode: '',
  city: '',
  street: '',
  type: 0
})

const alertStore = useAlertStore()

await runWithRetryAlert(() => countriesStore.ensureLoaded(), {
  fallback: 'Не удалось загрузить страны'
})

if (!isCreate.value) {
  ;({ warehouse } = storeToRefs(warehousesStore))
  await runWithRetryAlert(() => warehousesStore.getById(props.warehouseId), {
    fallback: 'Не удалось загрузить склад'
  })
}

function getTitle() {
  return isCreate.value ? 'Регистрация склада' : 'Изменить информацию о складе'
}

function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

const schema = Yup.object({
  id: Yup.number().required(),
  name: Yup.string().required('Название обязательно'),
  countryIsoNumeric: Yup.number().required('Страна обязательна'),
  postalCode: Yup.string(),
  city: Yup.string(),
  street: Yup.string(),
  type: Yup.number().required('Тип склада обязателен')
})

function normalizeValues(values) {
  if (values && typeof values === 'object' && values.value && typeof values.value === 'object') {
    return values.value
  }
  return values
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  return Number(value)
}

function onSubmit(values, { setErrors } = {}) {
  const normalizedValues = normalizeValues(values) || {}
  const payload = {
    ...normalizedValues,
    type: toNumberOrNull(normalizedValues.type)
  }

  if (isCreate.value) {
    return warehousesStore
      .create(payload)
      .then(() => {
        router.push('/warehouses')
      })
      .catch((error) => {
        if (error.message?.includes('409')) {
          alertStore.error('Склад с таким названием уже существует')
        } else {
          reportFormError(error, {
            setErrors,
            alertStore,
            fallback: 'Ошибка при регистрации склада'
          })
        }
      })
  } else {
    return warehousesStore
      .update(props.warehouseId, payload)
      .then(() => {
        router.push('/warehouses')
      })
      .catch((error) => {
        reportFormError(error, {
          setErrors,
          alertStore,
          fallback: 'Ошибка при сохранении информации о складе'
        })
      })
  }
}
</script>

<template>
  <div class="settings form-2">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />

    <PageAlertRegion />
    <Form
      @invalid-submit="focusFirstInvalidField"
      @submit="onSubmit"
      :initial-values="warehouse"
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
          placeholder="Название"
        />
        <FieldError name="name" :errors="errors" />
      </div>

      <div class="form-group">
        <label for="countryIsoNumeric" class="label">Страна:</label>
        <Field
          name="countryIsoNumeric"
          id="countryIsoNumeric"
          as="select"
          class="form-control input"
          :class="{ 'is-invalid': errors.countryIsoNumeric }"
        >
          <option value="">Выберите страну</option>
          <option v-for="country in countries" :key="country.id" :value="country.isoNumeric">
            {{ country.nameRuOfficial }}
          </option>
        </Field>
        <FieldError name="countryIsoNumeric" :errors="errors" />
      </div>

      <div class="form-group">
        <label for="postalCode" class="label">Почтовый индекс:</label>
        <Field
          name="postalCode"
          id="postalCode"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.postalCode }"
          placeholder="Почтовый индекс"
        />
        <FieldError name="postalCode" :errors="errors" />
      </div>

      <div class="form-group">
        <label for="city" class="label">Город:</label>
        <Field
          name="city"
          id="city"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.city }"
          placeholder="Город"
        />
        <FieldError name="city" :errors="errors" />
      </div>

      <div class="form-group">
        <label for="street" class="label">Улица:</label>
        <Field
          name="street"
          id="street"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.street }"
          placeholder="Улица"
        />
        <FieldError name="street" :errors="errors" />
      </div>

      <div class="form-group">
        <label class="label">Тип склада:</label>
        <div class="radio-group" :class="{ 'is-invalid': errors.type }">
          <label
            v-for="typeOption in warehouseTypeOptions"
            :key="typeOption.value"
            class="radio-styled"
          >
            <Field name="type" type="radio" :value="typeOption.value" />
            <span class="radio-mark"></span>
            {{ typeOption.label }}
          </label>
        </div>
        <FieldError name="type" :errors="errors" />
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
          data-testid="cancel-button"
          @click="$router.push('/warehouses')"
        >
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>
    </Form>
  </div>
</template>
