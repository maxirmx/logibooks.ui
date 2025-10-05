<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref, computed } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useAirportsStore } from '@/stores/airports.store.js'

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
  iata: '',
  icao: '',
  name: ''
})

if (!isCreate.value) {
  ;({ airport } = storeToRefs(airportsStore))
  await airportsStore.getById(props.airportId)
}

function getTitle() {
  return isCreate.value ? 'Регистрация аэропорта' : 'Изменить информацию об аэропорте'
}

function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

const schema = Yup.object({
  iata: Yup.string().required('IATA код обязателен'),
  icao: Yup.string(),
  name: Yup.string().required('Название обязательно')})

function onSubmit(values, { setErrors }) {
  if (isCreate.value) {
    return airportsStore
      .create(values)
      .then(() => {
        router.push('/airports')
      })
      .catch((error) => {
        if (error.message?.includes('409')) {
          setErrors({ apiError: 'Аэропорт с таким кодом ИАТА уже существует' })
        } else {
          setErrors({ apiError: error.message || 'Ошибка при регистрации аэропорта' })
        }
      })
  }

  return airportsStore
    .update(props.airportId, values)
    .then(() => {
      router.push('/airports')
    })
    .catch((error) => {
      setErrors({ apiError: error.message || 'Ошибка при сохранении информации об аэропорте' })
    })
}
</script>

<template>
  <div class="settings form-2">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />
    <Form
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
      </div>

      <div class="form-group">
        <label for="iata" class="label">Код ИАТА:</label>
        <Field
          name="iata"
          id="iata"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.iata }"
          placeholder="Код ИАТА"
        />
      </div>

      <div class="form-group">
        <label for="icao" class="label">Код ИКАО:</label>
        <Field
          name="icao"
          id="icao"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.icao }"
          placeholder="Код ИКАО"
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
          @click="$router.push('/airports')"
        >
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>

      <div v-if="errors.iata" class="alert alert-danger mt-3 mb-0">{{ errors.iata }}</div>
      <div v-if="errors.icao" class="alert alert-danger mt-3 mb-0">{{ errors.icao }}</div>
      <div v-if="errors.name" class="alert alert-danger mt-3 mb-0">{{ errors.name }}</div>
      <div v-if="errors.country" class="alert alert-danger mt-3 mb-0">{{ errors.country }}</div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
  </div>
</template>
