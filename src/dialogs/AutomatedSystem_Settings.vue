<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref } from 'vue'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import router from '@/router'
import ActionButton from '@/components/ActionButton.vue'
import FieldError from '@/components/FieldError.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { focusFirstInvalidField } from '@/helpers/form.validation.helpers.js'
import { reportFormError } from '@/helpers/error.helpers.js'
import {
  automatedSystemRoles,
  isAutomatedSystem,
  roleAdapter1C,
  roleAdapterAlta
} from '@/helpers/user.roles.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useUsersStore } from '@/stores/users.store.js'

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
const alertStore = useAlertStore()
const initializationFailed = ref(false)
const showPassword = ref(false)
const showPassword2 = ref(false)
const initialValues = ref({
  lastName: '',
  email: '',
  password: '',
  password2: '',
  roles: []
})

const pwdErr =
  'Пароль должен быть не короче 8 символов и содержать хотя бы одну цифру и один специальный символ (!@#$%^&*()\\-_=+{};:,<.>)'
const pwdReg = /^.*(?=.{8,})((?=.*[!@#$%^&*()\-_=+{};:,<.>]){1})((?=.*\d){1}).*$/
const roleRequiredErr = 'Необходимо выбрать роль автоматизированной системы'

const schema = Yup.object().shape({
  lastName: Yup.string().required('Необходимо указать название автоматизированной системы'),
  email: Yup.string().required('Необходимо указать идентификатор автоматизированной системы'),
  roles: Yup.array()
    .of(Yup.string().oneOf(automatedSystemRoles))
    .required(roleRequiredErr)
    .min(1, roleRequiredErr),
  password: Yup.string().concat(
    props.register
      ? Yup.string().required('Необходимо указать пароль').matches(pwdReg, pwdErr)
      : Yup.string().test('optional-password', pwdErr, (value) => !value || pwdReg.test(value))
  ),
  password2: Yup.string()
    .when('password', (password, fieldSchema) => {
      if ((password && password != '') || props.register) {
        return fieldSchema.required('Необходимо подтвердить пароль').matches(pwdReg, pwdErr)
      }
      return fieldSchema
    })
    .oneOf([Yup.ref('password')], 'Пароли должны совпадать')
})

async function initialize() {
  if (props.register) return

  try {
    const loaded = await usersStore.getById(props.id, false, true)
    if (!isAutomatedSystem(loaded)) {
      initializationFailed.value = true
      alertStore.error('Выбранная учетная запись не является автоматизированной системой')
      return
    }

    initialValues.value = {
      lastName: loaded.lastName ?? '',
      email: loaded.email ?? '',
      password: '',
      password2: '',
      roles: (loaded.roles ?? []).filter((role) => automatedSystemRoles.includes(role))
    }
  } catch (error) {
    initializationFailed.value = true
    alertStore.error(error, { fallback: 'Не удалось загрузить автоматизированную систему' })
  }
}

await initialize()

function onCancel() {
  return router.push('/users')
}

async function onSubmit(values, { setErrors } = {}) {
  if (initializationFailed.value) return

  const payload = {
    lastName: values.lastName,
    email: values.email,
    firstName: '',
    patronymic: '',
    password: values.password,
    roles: (values.roles ?? []).filter((role) => automatedSystemRoles.includes(role))
  }
  if (!payload.password) delete payload.password

  try {
    if (props.register) {
      await usersStore.add(payload)
    } else {
      await usersStore.update(props.id, payload)
    }
    await router.push('/users')
  } catch (error) {
    reportFormError(error, {
      setErrors,
      alertStore,
      fallback: props.register
        ? 'Не удалось зарегистрировать автоматизированную систему'
        : 'Не удалось сохранить автоматизированную систему'
    })
  }
}
</script>

<template>
  <div class="settings form-3">
    <Form
      :initial-values="initialValues"
      :validation-schema="schema"
      @invalid-submit="focusFirstInvalidField"
      @submit="onSubmit"
      v-slot="{ errors, isSubmitting, handleSubmit }"
    >
      <div class="header-with-actions">
        <h1 class="primary-heading">
          {{ register ? 'Регистрация автоматизированной системы' : 'Настройки автоматизированной системы' }}
        </h1>
        <div class="header-actions">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-check-double"
            icon-size="2x"
            :tooltip-text="register ? 'Зарегистрировать' : 'Сохранить'"
            :disabled="isSubmitting || initializationFailed"
            @click="handleSubmit(onSubmit)"
          />
          <ActionButton
            :item="{}"
            icon="fa-solid fa-xmark"
            icon-size="2x"
            tooltip-text="Отменить"
            :disabled="isSubmitting"
            @click="onCancel"
          />
        </div>
      </div>
      <hr class="hr" />

      <PageAlertRegion />

      <fieldset class="contents-fieldset" :disabled="initializationFailed">
        <div class="form-group">
          <label for="lastName" class="label">Название:</label>
          <Field
            id="lastName"
            name="lastName"
            type="text"
            class="form-control input"
            :class="{ 'is-invalid': errors.lastName }"
            placeholder="Название"
          />
          <FieldError name="lastName" :errors="errors" />
        </div>

        <div class="form-group">
          <label for="email" class="label">Идентификатор:</label>
          <Field
            id="email"
            name="email"
            autocomplete="off"
            type="text"
            class="form-control input"
            :class="{ 'is-invalid': errors.email }"
            placeholder="Идентификатор"
          />
          <FieldError name="email" :errors="errors" />
        </div>

        <div class="form-group">
          <label for="password" class="label">Пароль:</label>
          <div class="password-wrapper">
            <div class="password-input-row">
              <Field
                id="password"
                name="password"
                autocomplete="new-password"
                :type="showPassword ? 'text' : 'password'"
                class="form-control input password"
                :class="{ 'is-invalid': errors.password }"
                placeholder="Пароль"
              />
              <button
                type="button"
                class="button-o"
                @click.prevent="showPassword = !showPassword"
              >
                <font-awesome-icon
                  :icon="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                  class="button-o-c"
                />
              </button>
            </div>
            <FieldError name="password" :errors="errors" />
          </div>
        </div>

        <div class="form-group">
          <label for="password2" class="label">Пароль ещё раз:</label>
          <div class="password-wrapper">
            <div class="password-input-row">
              <Field
                id="password2"
                name="password2"
                autocomplete="new-password"
                :type="showPassword2 ? 'text' : 'password'"
                class="form-control input password"
                :class="{ 'is-invalid': errors.password2 }"
                placeholder="Пароль"
              />
              <button
                type="button"
                class="button-o"
                @click.prevent="showPassword2 = !showPassword2"
              >
                <font-awesome-icon
                  :icon="showPassword2 ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                  class="button-o-c"
                />
              </button>
            </div>
            <FieldError name="password2" :errors="errors" />
          </div>
        </div>

        <div class="form-group">
          <span class="label">Роль:</span>
          <div class="role-selection">
            <Field
              id="roleAdapter1C"
              name="roles"
              type="checkbox"
              class="checkbox checkbox-styled"
              :value="roleAdapter1C"
            />
            <label for="roleAdapter1C">Адаптер 1С</label>
            <Field
              id="roleAdapterAlta"
              name="roles"
              type="checkbox"
              class="checkbox checkbox-styled"
              :value="roleAdapterAlta"
            />
            <label for="roleAdapterAlta">Адаптер Альта</label>
          </div>
          <FieldError name="roles" :errors="errors" />
        </div>
      </fieldset>
    </Form>
  </div>
</template>

<style scoped>
.contents-fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.role-selection {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
