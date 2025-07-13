<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
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

import { ref, computed, onMounted } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAlertStore } from '@/stores/alert.store.js'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  companyId: {
    type: Number,
    required: false
  }
})

const companiesStore = useCompaniesStore()
const countriesStore = useCountriesStore()
const alertStore = useAlertStore()

const { countries } = storeToRefs(countriesStore)

// Check if we're in create mode
const isCreate = computed(() => props.mode === 'create')

let company = ref({
  inn: '',
  kpp: '',
  name: '',
  shortName: '',
  countryIsoNumeric: null,
  postalCode: '',
  city: '',
  street: ''
})

if (!isCreate.value) {
  ;({ company } = storeToRefs(companiesStore))
  await companiesStore.getById(props.companyId)
}

// Get page title
function getTitle() {
  return isCreate.value ? 'Регистрация компании' : 'Изменить информацию о компании'
}

// Get button text
function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

// Validation schema
const schema = Yup.object({
  inn: Yup.string().required('ИНН обязателен'),
  kpp: Yup.string(),
  name: Yup.string().required('Название обязательно'),
  shortName: Yup.string(),
  countryIsoNumeric: Yup.number().required('Страна обязательна'),
  postalCode: Yup.string(),
  city: Yup.string(),
  street: Yup.string()
})

// Form submission
function onSubmit(values, { setErrors }) {
  if (isCreate.value) {
    return companiesStore
      .create(values)
      .then(() => {
        alertStore.success('Компания успешно создана')
        router.push('/companies')
      })
      .catch((error) => {
        if (error.message?.includes('409')) {
          setErrors({ apiError: 'Компания с таким ИНН уже существует' })
        } else {
          setErrors({ apiError: error.message || 'Ошибка при создании компании' })
        }
      })
  } else {
    return companiesStore
      .update(props.companyId, values)
      .then(() => {
        alertStore.success('Компания успешно обновлена')
        router.push('/companies')
      })
      .catch((error) => {
        setErrors({ apiError: error.message || 'Ошибка при сохранении компании' })
      })
  }
}

// Initialize data
onMounted(async () => {
  // Fetch countries if not already loaded
  if (countries.value.length === 0) {
    await countriesStore.getAll()
  }
})
</script>

<template>
  <div class="settings form-2">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />
    <Form
      @submit="onSubmit"
      :initial-values="company"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="inn" class="label">ИНН:</label>
        <Field
          name="inn"
          id="inn"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.inn }"
          placeholder="ИНН"
        />
      </div>

      <div class="form-group">
        <label for="kpp" class="label">КПП:</label>
        <Field
          name="kpp"
          id="kpp"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.kpp }"
          placeholder="КПП"
        />
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
      </div>

      <div class="form-group">
        <label for="shortName" class="label">Краткое название:</label>
        <Field
          name="shortName"
          id="shortName"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.shortName }"
          placeholder="Краткое название"
        />
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
            :key="country.id"
            :value="country.isoNumeric"
          >
            {{ country.nameRuOfficial }}
          </option>
        </Field>
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
      </div>

      <div class="form-group">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          {{ getButtonText() }}
        </button>
        <button
          class="button secondary"
          type="button"
          @click="$router.push('/companies')"
        >
          Отмена
        </button>
      </div>
      <div v-if="errors.inn" class="alert alert-danger mt-3 mb-0">{{ errors.inn }}</div>
      <div v-if="errors.kpp" class="alert alert-danger mt-3 mb-0">{{ errors.kpp }}</div>
      <div v-if="errors.name" class="alert alert-danger mt-3 mb-0">{{ errors.name }}</div>
      <div v-if="errors.shortName" class="alert alert-danger mt-3 mb-0">{{ errors.shortName }}</div>
      <div v-if="errors.countryIsoNumeric" class="alert alert-danger mt-3 mb-0">{{ errors.countryIsoNumeric }}</div>
      <div v-if="errors.postalCode" class="alert alert-danger mt-3 mb-0">{{ errors.postalCode }}</div>
      <div v-if="errors.city" class="alert alert-danger mt-3 mb-0">{{ errors.city }}</div>
      <div v-if="errors.street" class="alert alert-danger mt-3 mb-0">{{ errors.street }}</div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
  </div>
</template>
