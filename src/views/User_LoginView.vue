<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref } from 'vue'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { getHomeRoute } from '@/helpers/login.navigation.js'

import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useParcelCheckStatusStore } from '@/stores/parcel.checkstatuses.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useTransportationTypesStore } from '@/stores/transportation.types.store.js'
import { useCustomsProceduresStore } from '@/stores/customs.procedures.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
const companiesStore = useCompaniesStore()
const countriesStore = useCountriesStore()
const transportationTypesStore = useTransportationTypesStore()
const customsProceduresStore = useCustomsProceduresStore()
const parcelStatusesStore = useParcelStatusesStore()
const parcelCheckStatusStore = useParcelCheckStatusStore()

const schema = Yup.object().shape({
  login_email: Yup.string()
    .required('Необходимо указать электронную почту')
    .email('Неверный формат электронной почты'),
  login_password: Yup.string()
    .required('Необходимо указать пароль')
    .min(4, 'Пароль не может быть короче 4 симоволов')
})

const showPassword = ref(false)

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

function onSubmit(values, { setErrors }) {
  const authStore = useAuthStore()
  const { login_email, login_password } = values

  return authStore
    .login(login_email, login_password)
    .then(async () => {
      await parcelStatusesStore.ensureLoaded()
      await parcelCheckStatusStore.ensureLoaded()
      await countriesStore.ensureLoaded()
      await transportationTypesStore.ensureLoaded()
      await customsProceduresStore.ensureLoaded()
      await companiesStore.getAll()
      router.push(getHomeRoute())
    })
    .catch((error) => setErrors({ apiError: error.message || String(error) }))
}
</script>

<template>
  <div class="settings form-1">
    <h1 class="primary-heading">Вход</h1>
    <hr class="hr" />
    <Form @submit="onSubmit" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
      <div class="form-group">
        <label for="login_email" class="label">Адрес электронной почты:</label>
        <Field
          name="login_email"
          id="login_email"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.login_email }"
          placeholder="Адрес электронной почты"
        />
      </div>
      <div class="form-group">
        <label for="login_password" class="label">Пароль:</label>
        <div class="password-wrapper">
          <Field
            name="login_password"
            id="login_password"
            :type="showPassword ? 'text' : 'password'"
            class="form-control input password"
            :class="{ 'is-invalid': errors.login_password }"
            placeholder="Пароль"
          />
          <button
            type="button"
            @click="
              (event) => {
                event.preventDefault()
                showPassword = !showPassword
              }
            "
            class="button-o"
          >
            <font-awesome-icon
              size="1x"
              v-if="!showPassword"
              icon="fa-solid fa-eye"
              class="button-o-c"
            />
            <font-awesome-icon
              size="1x"
              v-if="showPassword"
              icon="fa-solid fa-eye-slash"
              class="button-o-c"
            />
          </button>
        </div>
      </div>
      <div class="form-group">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          Войти
        </button>
      </div>
      <div v-if="errors.login_email" class="alert alert-danger mt-3 mb-0">
        {{ errors.login_email }}
      </div>
      <div v-if="errors.login_password" class="alert alert-danger mt-3 mb-0">
        {{ errors.login_password }}
      </div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
      <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
        <button @click="alertStore.clear()" class="btn btn-link close">×</button>
        {{ alert.message }}
      </div>
    </Form>
  </div>
</template>
