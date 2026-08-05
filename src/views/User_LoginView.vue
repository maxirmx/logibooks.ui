<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import FieldError from '@/components/FieldError.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { focusFirstInvalidField } from '@/helpers/form.validation.helpers.js'
import { ref } from 'vue'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import router from '@/router'
import { useAuthStore } from '@/stores/auth.store.js'
import { getHomeRoute } from '@/helpers/login.navigation.js'

import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'

const alertStore = useAlertStore()
const companiesStore = useCompaniesStore()
const countriesStore = useCountriesStore()
const registersStore = useRegistersStore()
const parcelStatusesStore = useParcelStatusesStore()

const schema = Yup.object().shape({
  login_email: Yup.string()
    .required('Необходимо указать электронную почту')
    .email('Неверный формат электронной почты'),
  login_password: Yup.string()
    .required('Необходимо указать пароль')
    .min(4, 'Пароль не может быть короче 4 симоволов')
})

const showPassword = ref(false)

function onSubmit(values) {
  const authStore = useAuthStore()
  const { login_email, login_password } = values

  return authStore
    .login(login_email, login_password)
    .then(async () => {
      await parcelStatusesStore.ensureLoaded()
      await countriesStore.ensureLoaded()
      await registersStore.ensureOpsLoaded()
      await companiesStore.getAll()
      router.push(getHomeRoute())
    })
    .catch((error) => alertStore.error(error.message || String(error)))
}
</script>

<template>
  <div class="settings form-1">
    <h1 class="primary-heading">Вход</h1>
    <hr class="hr" />

    <PageAlertRegion />
    <Form
      @submit="onSubmit"
      @invalid-submit="focusFirstInvalidField"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="login_email" class="label">Адрес электронной почты:</label>
        <Field
          name="login_email"
          autocomplete="username"
          id="login_email"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.login_email }"
          placeholder="Адрес электронной почты"
        />
        <FieldError name="login_email" :errors="errors" />
      </div>
      <div class="form-group">
        <label for="login_password" class="label">Пароль:</label>
        <div class="password-wrapper">
          <div class="password-input-row">
            <Field
              name="login_password"
              autocomplete="current-password"
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
          <FieldError name="login_password" :errors="errors" />
        </div>
      </div>
      <div class="form-group">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          Войти
        </button>
      </div>
    </Form>
  </div>
</template>
