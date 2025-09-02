<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application

import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import router from '@/router'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'

const schema = Yup.object().shape({
  email: Yup.string()
    .required('Необходимо указать электронную почту')
    .email('Неверный формат электронной почты')
})

function onSubmit(values, { setErrors }) {
  const authStore = useAuthStore()
  values.host = window.location.href
  values.host = values.host.substring(0, values.host.lastIndexOf('/'))
  return authStore
    .recover(values)
    .then(() => {
      router.push('/').then(() => {
        const alertStore = useAlertStore()
        alertStore.success(
          'На Ваш адрес электронной почты отправлено письмо со ссылкой для восстановления пароля. ' +
            'Обратите внимание, что ссылка одноразовая и действует 4 часа. ' +
            'Если Вы не можете найти письма, проверьте папку с нежелательной почтой (спамом). ' +
            'Если письмо не пришло, обратитесь к администратору.'
        )
      })
    })
    .catch((error) => setErrors({ apiError: error.message || String(error) }))
}
</script>

<template>
  <div class="settings form-1">
    <h1 class="primary-heading">Восстановление пароля</h1>
    <hr class="hr" />
    <Form @submit="onSubmit" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
      <div class="form-group">
        <label for="email" class="label">Адрес электронной почты:</label>
        <Field
          name="email"
          id="email"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.email }"
          placeholder="Адрес электронной почты"
        />
      </div>
      <div class="form-group">
        <button class="button" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          Отправить ссылку
        </button>
      </div>
      <div v-if="errors.email" class="alert alert-danger mt-3 mb-0">{{ errors.email }}</div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
  </div>
</template>
