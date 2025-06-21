<script setup>
// Copyright (C) 2023 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of O!Service applcation
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

import { ref } from 'vue'

import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useUsersStore } from '@/stores/users.store.js'
import { useProfilesStore } from '@/stores/profiles.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'

import { saveAs } from 'file-saver'

const props = defineProps({
  register: {
    type: Boolean,
    required: true
  },
  id: {
    type: Number,
    required: false
  }
})

const usersStore = useUsersStore()
const authStore = useAuthStore()

const pwdErr =
  'Пароль должен быть не короче 8 символов и содержать хотя бы одну цифру и один специальный символ (!@#$%^&*()\\-_=+{};:,<.>)'
const pwdReg = /^.*(?=.{8,})((?=.*[!@#$%^&*()\-_=+{};:,<.>]){1})((?=.*\d){1}).*$/
const profileErr = 'Необходимо указать организацию'

const schema = Yup.object().shape({
  firstName: Yup.string().required('Необходимо указать имя'),
  lastName: Yup.string().required('Необходимо указать фамилию'),
  email: Yup.string()
    .required('Необходимо указать электронную почту')
    .email('Неверный формат электронной почты'),
  profileId: Yup.number().concat(
    asAdmin() ? Yup.number().typeError(profileErr).required(profileErr).min(0, profileErr) : null
  ),
  password: Yup.string().concat(
    isRegister() ? Yup.string().required('Необходимо указать пароль').matches(pwdReg, pwdErr) : null
  ),
  password2: Yup.string()
    .when('password', (password, schema) => {
      if ((password && password != '') || isRegister())
        return schema.required('Необходимо подтвердить пароль').matches(pwdReg, pwdErr)
    })
    .oneOf([Yup.ref('password')], 'Пароли должны совпадать')
})

const profilesStore = useProfilesStore()
const profiles = storeToRefs(profilesStore).profiles
const profile = storeToRefs(profilesStore).profile

if (asAdmin()) {
  profilesStore.getAll()
} else {
  if (authStore.user) {
    profilesStore.getById(authStore.user.profileId)
  }
}

const showPassword = ref(false)
const showPassword2 = ref(false)

let user = ref({
  profileId: 1
})

if (!isRegister()) {
  ;({ user } = storeToRefs(usersStore))
  await usersStore.getById(props.id, true)
}

function isRegister() {
  return props.register
}

function asAdmin() {
  return authStore.user && authStore.user.isAdmin
}

function getTitle() {
  return isRegister() ? (asAdmin() ? 'Регистрация пользователя' : 'Регистрация') : 'Настройки'
}

function getButton() {
  return isRegister() ? 'Зарегистрировать' + (asAdmin() ? '' : 'ся') : 'Сохранить'
}

function showCredentials() {
  return !isRegister() && !asAdmin()
}

function showAndEditCredentials() {
  return asAdmin()
}

function getCredentials() {
  let crd = null
  if (user.value) {
    crd = ''
    if (user.value.isAdmin === 'ADMIN') {
      crd = 'Aдминистратор'
    }
  }
  return crd
}

function onSubmit(values, { setErrors }) {
  if (isRegister()) {
    if (asAdmin()) {
      return usersStore
        .add(values, true)
        .then(() =>
          router.push(authStore.user.isAdmin ? '/users' : '/user/edit/' + authStore.user.id)
        )
        .catch((error) => setErrors({ apiError: error }))
    } else {
      values.isAdmin = false
      values.host = window.location.href
      values.host = values.host.substring(0, values.host.lastIndexOf('/'))
      return authStore
        .register(values)
        .then(() => {
          router.push('/').then(() => {
            const alertStore = useAlertStore()
            alertStore.success(
              'На Ваш адрес электронной почты отправлено письмо с подтверждением. ' +
                'Пожалуйста, перейдите по ссылке для завершения регистрации. ' +
                'Обратите внимание, что ссылка одноразовая и действует 4 часа. ' +
                'Если Вы не можете найти письма, проверьте папку с нежелательной почтой (спамом). ' +
                'Если письмо не пришло, обратитесь к администратору.'
            )
          })
        })
        .catch((error) => setErrors({ apiError: error }))
    }
  } else {
    return usersStore
      .update(props.id, values, true)
      .then(() =>
        router.push(authStore.user.isAdmin ? '/users' : '/user/edit/' + authStore.user.id)
      )
      .catch((error) => {
        console.log(error)
        setErrors({ apiError: error })
      })
  }
}

async function exportData(u) {
  const filename = u.email + '.ovpn'
  const blob = new Blob([u.config], {
    type: 'text/plain;charset=utf-8'
  })

  saveAs(blob, filename)
}
</script>

<template>
  <div class="settings form-2">
    <h1 class="orange">{{ getTitle() }}</h1>
    <hr class="hr" />
    <div class="link-crt">
      <a class="link" @click="exportData(user)">
        <font-awesome-icon size="1x" icon="fa-solid fa-download" class="link" />
        Загрузить конфигурацию
      </a>
    </div>
    <Form
      @submit="onSubmit"
      :initial-values="user"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="lastName" class="label">Фамилия:</label>
        <Field
          name="lastName"
          id="lastName"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.lastName }"
          placeholder="Фамилия"
        />
      </div>
      <div class="form-group">
        <label for="firstName" class="label">Имя:</label>
        <Field
          name="firstName"
          id="firstName"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.firstName }"
          placeholder="Имя"
        />
      </div>
      <div class="form-group">
        <label for="patronimic" class="label">Отчество:</label>
        <Field
          name="patronimic"
          id="patronimic"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.patronimic }"
          placeholder="Отчество"
        />
      </div>
      <div class="form-group">
        <label for="email" class="label">Адрес электронной почты:</label>
        <Field
          name="email"
          id="email"
          autocomplete="off"
          type="email"
          class="form-control input"
          :class="{ 'is-invalid': errors.email }"
          placeholder="Адрес электронной почты"
        />
      </div>
      <div class="form-group">
        <label for="password" class="label">Пароль:</label>
        <Field
          name="password"
          id="password"
          ref="password"
          :type="showPassword ? 'text' : 'password'"
          class="form-control input password"
          :class="{ 'is-invalid': errors.password }"
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
      <div class="form-group">
        <label for="password2" class="label">Пароль ещё раз:</label>
        <Field
          name="password2"
          id="password2"
          :type="showPassword2 ? 'text' : 'password'"
          class="form-control input password"
          :class="{ 'is-invalid': errors.password2 }"
          placeholder="Пароль"
        />

        <button
          type="button"
          @click="
            (event) => {
              event.preventDefault()
              showPassword2 = !showPassword2
            }
          "
          class="button-o"
        >
          <font-awesome-icon
            size="1x"
            v-if="!showPassword2"
            icon="fa-solid fa-eye"
            class="button-o-c"
          />
          <font-awesome-icon
            size="1x"
            v-if="showPassword2"
            icon="fa-solid fa-eye-slash"
            class="button-o-c"
          />
        </button>
      </div>
      <div v-if="showCredentials()" class="form-group">
        <label for="profileId" class="label">Профиль:</label>
        <span id="profileId"
          ><em>{{ profile?.name }}</em></span
        >
      </div>
      <div v-if="showAndEditCredentials()" class="form-group">
        <label for="profileId" class="label">Профиль:</label>
        <Field
          name="profileId"
          as="select"
          class="form-control input select"
          :class="{ 'is-invalid': errors.profileId }"
        >
          <option value="">Выберите профиль:</option>
          <option v-for="profile in profiles" :key="profile" :value="profile.id">
            {{ profile.name }}
          </option>
        </Field>
      </div>
      <div v-if="showCredentials()" class="form-group">
        <label for="crd" class="label">Права:</label>
        <span id="crd"
          ><em>{{ getCredentials() }}</em></span
        >
      </div>

      <div v-if="showAndEditCredentials()" class="form-group">
        <label for="isAdmin" class="label">Права:</label>
        <Field
          id="isAdmin"
          type="checkbox"
          name="isAdmin"
          class="checkbox checkbox-styled"
          value="ADMIN"
        />
        <label for="isAdmin">Администратор</label>
      </div>

      <div class="form-group">
        <button class="button" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          {{ getButton() }}
        </button>
        <button
          v-if="asAdmin()"
          class="button"
          type="button"
          @click="
            $router.push(authStore.user.isAdmin ? '/users' : '/user/edit/' + authStore.user.id)
          "
        >
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          Отменить
        </button>
      </div>
      <div v-if="errors.lastName" class="alert alert-danger mt-3 mb-0">{{ errors.lastName }}</div>
      <div v-if="errors.firstName" class="alert alert-danger mt-3 mb-0">{{ errors.firstName }}</div>
      <div v-if="errors.patronimic" class="alert alert-danger mt-3 mb-0">
        {{ errors.patronimic }}
      </div>
      <div v-if="errors.email" class="alert alert-danger mt-3 mb-0">{{ errors.email }}</div>
      <div v-if="errors.password" class="alert alert-danger mt-3 mb-0">{{ errors.password }}</div>
      <div v-if="errors.password2" class="alert alert-danger mt-3 mb-0">{{ errors.password2 }}</div>
      <div v-if="errors.profileId" class="alert alert-danger mt-3 mb-0">{{ errors.profileId }}</div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
  </div>
  <div v-if="user?.loading" class="text-center m-5">
    <span class="spinner-border spinner-border-lg align-center"></span>
  </div>
  <div v-if="user?.error" class="text-center m-5">
    <div class="text-danger">Ошибка при загрузке информации о пользователе: {{ user.error }}</div>
  </div>
</template>
