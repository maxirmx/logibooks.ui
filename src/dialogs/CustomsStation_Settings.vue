<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Field, Form } from 'vee-validate'
import * as Yup from 'yup'
import router from '@/router'
import { useAlertStore } from '@/stores/alert.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useCustomsStationsStore } from '@/stores/customs.stations.store.js'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  customsStationId: {
    type: Number,
    required: false
  }
})

const customsStationsStore = useCustomsStationsStore()
const countriesStore = useCountriesStore()
const alertStore = useAlertStore()
countriesStore.ensureLoaded()
const { countries } = storeToRefs(countriesStore)
const { alert } = storeToRefs(alertStore)

const isCreate = computed(() => props.mode === 'create')

let customsStation = ref({
  id: 0,
  number: '',
  name: '',
  countryIsoNumeric: null,
  postalCode: '',
  city: '',
  street: ''
})

if (!isCreate.value) {
  ;({ customsStation } = storeToRefs(customsStationsStore))
  try {
    await customsStationsStore.getById(props.customsStationId)
  } catch {
    alertStore.error('Ошибка при загрузке данных таможенного поста')
    router.push('/customsstations')
  }
}

const schema = Yup.object({
  id: Yup.number().required(),
  number: Yup.string()
    .required('Код поста обязателен')
    .matches(/^[0-9]+$/, 'Код поста должен содержать только цифры'),
  name: Yup.string().required('Название обязательно'),
  countryIsoNumeric: Yup.number().required('Страна обязательна'),
  postalCode: Yup.string(),
  city: Yup.string(),
  street: Yup.string()
})

function getTitle() {
  return isCreate.value
    ? 'Регистрация таможенного поста'
    : 'Изменить информацию о таможенном посте'
}

function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

function cancel() {
  router.push('/customsstations')
}

function normalizeValues(values) {
  if (values && typeof values === 'object' && values.value && typeof values.value === 'object') {
    return values.value
  }
  return values
}

function onSubmit(values, { setErrors }) {
  const payload = normalizeValues(values) || {}
  const operation = isCreate.value
    ? customsStationsStore.create(payload)
    : customsStationsStore.update(props.customsStationId, payload)

  return operation
    .then(() => {
      router.push('/customsstations')
    })
    .catch((error) => {
      if (error?.status === 409) {
        setErrors({ apiError: error.message })
        return
      }

      const fallback = isCreate.value
        ? 'Ошибка при регистрации таможенного поста'
        : 'Ошибка при сохранении информации о таможенном посте'
      setErrors({ apiError: error?.message || fallback })
    })
}
</script>

<template>
  <div class="settings form-2">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />
    <Form
      @submit="onSubmit"
      :initial-values="customsStation"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="number" class="label">Код поста:</label>
        <Field
          name="number"
          id="number"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          class="form-control input"
          :class="{ 'is-invalid': errors.number }"
          placeholder="Код поста"
        />
        <div v-if="errors.number" class="invalid-feedback">{{ errors.number }}</div>
      </div>

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
        <div v-if="errors.name" class="invalid-feedback">{{ errors.name }}</div>
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
          <option
            v-for="country in countries"
            :key="country.isoNumeric"
            :value="country.isoNumeric"
          >
            {{ country.nameRuOfficial }}
          </option>
        </Field>
        <div v-if="errors.countryIsoNumeric" class="invalid-feedback">
          {{ errors.countryIsoNumeric }}
        </div>
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
        <div v-if="errors.postalCode" class="invalid-feedback">{{ errors.postalCode }}</div>
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
        <div v-if="errors.city" class="invalid-feedback">{{ errors.city }}</div>
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
        <div v-if="errors.street" class="invalid-feedback">{{ errors.street }}</div>
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
          @click="cancel"
        >
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>

      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>

    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>
