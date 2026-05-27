<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, ref } from 'vue'

import router from '@/router'
import { storeToRefs } from 'pinia'
import { getHomeRoute } from '@/helpers/login.navigation.js'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useUsersStore } from '@/stores/users.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useHotKeyActionSchemesStore } from '@/stores/hotkey.action.schemes.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import ActionButton from '@/components/ActionButton.vue'
import {
  roleAdmin,
  roleShiftLead,
  roleSrLogist,
  roleLogist,
  roleWhManager,
  roleWhOperator,
  keyAdmin,
  keyShiftLead,
  keySrLogist,
  keyLogist,
  keyWhManager,
  keyWhOperator
} from '@/helpers/user.roles.js'

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
const hotKeyActionSchemesStore = useHotKeyActionSchemesStore()
const warehousesStore = useWarehousesStore()
const { hotKeyActionSchemes } = storeToRefs(hotKeyActionSchemesStore)
const { warehouses, loading: warehousesLoading } = storeToRefs(warehousesStore)

await Promise.all([
  hotKeyActionSchemesStore.ensureLoaded(),
  warehousesStore.ensureLoaded()
])

const pwdErr =
  'Пароль должен быть не короче 8 символов и содержать хотя бы одну цифру и один специальный символ (!@#$%^&*()\\-_=+{};:,<.>)'
const pwdReg = /^.*(?=.{8,})((?=.*[!@#$%^&*()\-_=+{};:,<.>]){1})((?=.*\d){1}).*$/

const schema = Yup.object().shape({
  firstName: Yup.string().required('Необходимо указать имя'),
  lastName: Yup.string().required('Необходимо указать фамилию'),
  email: Yup.string()
    .required('Необходимо указать электронную почту')
    .email('Неверный формат электронной почты'),
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


const showPassword = ref(false)
const showPassword2 = ref(false)
const selectedWarehouseIds = ref([])

let user = ref({
  schemeId: 0,
  warehouseIds: []
})

if (!isRegister()) {
  ;({ user } = storeToRefs(usersStore))
  await usersStore.getById(props.id, true)
  // Ensure schemeId defaults to 0 when null or undefined
  if (user.value.schemeId == null) {
    user.value.schemeId = 0
  }
  selectedWarehouseIds.value = [...(user.value.warehouseIds ?? [])]
}

const warehouseHeaders = [
  { title: '', key: 'selected', sortable: false, width: '56px' },
  { title: 'Cклад', key: 'name' },
  { title: 'Город', key: 'city' }
]

const displayedWarehouses = computed(() => warehouses.value ?? [])

const allWarehousesSelected = computed(() => {
  return displayedWarehouses.value.length > 0
    && displayedWarehouses.value.every((warehouse) => selectedWarehouseIds.value.includes(warehouse.id))
})

const roleFieldNames = ['isAdmin', 'isShiftLead', 'isSrLogist', 'isLogist', 'isWhManager', 'isWhOperator']

function hasRoleFields(values) {
  return roleFieldNames.some((fieldName) => Object.prototype.hasOwnProperty.call(values ?? {}, fieldName))
}

function hasRoleSelection(values, fieldName, key, role) {
  if (hasRoleFields(values)) {
    return values?.[fieldName] === key || values?.[fieldName] === true
  }

  return values?.[fieldName] === key
    || values?.[fieldName] === true
    || values?.roles?.includes(role)
}

function isRegister() {
  return props.register
}

function asAdmin() {
  return authStore.isAdmin
}

function getTitle() {
  return isRegister() ? (asAdmin() ? 'Регистрация пользователя' : 'Регистрация') : 'Изменить информацию о пользователе'
}

function getButton() {
  return isRegister() ? 'Зарегистрировать' + (asAdmin() ? '' : 'ся') : 'Сохранить'
}

function onCancel() {
  router.push(getHomeRoute(true))
}

function showCredentials() {
  return !isRegister() && !asAdmin()
}

function showAndEditCredentials() {
  return asAdmin()
}

function hasOnlyWarehouseRoles(values = user.value) {
  const hasWarehouseRole = hasRoleSelection(values, 'isWhManager', keyWhManager, roleWhManager)
    || hasRoleSelection(values, 'isWhOperator', keyWhOperator, roleWhOperator)

  if (!hasWarehouseRole) {
    return false
  }

  return !(
    hasRoleSelection(values, 'isAdmin', keyAdmin, roleAdmin)
    || hasRoleSelection(values, 'isShiftLead', keyShiftLead, roleShiftLead)
    || hasRoleSelection(values, 'isSrLogist', keySrLogist, roleSrLogist)
    || hasRoleSelection(values, 'isLogist', keyLogist, roleLogist)
  )
}

function showWarehouseAssociations(values = user.value) {
  return hasOnlyWarehouseRoles(values)
}

function isWarehouseSelected(warehouseId) {
  return selectedWarehouseIds.value.includes(warehouseId)
}

function toggleWarehouse(warehouseId, selected) {
  if (selected) {
    if (!selectedWarehouseIds.value.includes(warehouseId)) {
      selectedWarehouseIds.value = [...selectedWarehouseIds.value, warehouseId]
    }
  } else {
    selectedWarehouseIds.value = selectedWarehouseIds.value.filter((id) => id !== warehouseId)
  }
}

function toggleAllWarehouses(selected) {
  selectedWarehouseIds.value = selected
    ? displayedWarehouses.value.map((warehouse) => warehouse.id)
    : []
}

function getCredentials() {
  const crd = []
  if (user.value) {
    if (user.value.roles && user.value.roles.includes(roleAdmin)) {
      crd.push('Администратор')
    }
    if (user.value.roles && user.value.roles.includes(roleShiftLead)) {
      crd.push('Старший смены')
    }
    if (user.value.roles && user.value.roles.includes(roleSrLogist)) {
      crd.push('Старший логист')
    }
    if (user.value.roles && user.value.roles.includes(roleLogist)) {
      crd.push('Логист')
    }
    if (user.value.roles && user.value.roles.includes(roleWhManager)) {
      crd.push('Менеджер склада')
    }
    if (user.value.roles && user.value.roles.includes(roleWhOperator)) {
      crd.push('Оператор склада')
    }
  }
  return crd.join(', ')
}

function onSubmit(values, { setErrors }) {
  if (asAdmin()) {
    values.warehouseIds = [...selectedWarehouseIds.value]
  } else {
    delete values.warehouseIds
  }

  if (isRegister()) {
    if (asAdmin()) {
      return usersStore
        .add(values, true)
        .then(() =>
          router.push(getHomeRoute(true))
        )
        .catch((error) => setErrors({ apiError: error.message || String(error) }))
    } else {
      values.roles = [roleLogist]
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
        .catch((error) => setErrors({ apiError: error.message || String(error) }))
    }
  } else {
    if (!asAdmin()) {
      values.roles = user.value.roles
    }
    return usersStore
      .update(props.id, values, true)
      .then(() => router.push(getHomeRoute(true)))
      .catch((error) => setErrors({ apiError: error.message || String(error) }))
  }
}

</script>

<template>
  <div class="settings form-3">
    <Form
      @submit="onSubmit"
      :initial-values="user"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting, handleSubmit, values }"
    >
      <div class="header-with-actions">
        <h1 class="primary-heading">{{ getTitle() }}</h1>
        <div class="header-actions">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-check-double"
            icon-size="2x"
            :tooltip-text="getButton()"
            :disabled="isSubmitting"
            @click="handleSubmit(onSubmit)()"
          />
          <ActionButton
            v-if="asAdmin()"
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
        <label for="patronymic" class="label">Отчество:</label>
        <Field
          name="patronymic"
          id="patronymic"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.patronymic }"
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
        <div class="password-wrapper">
          <Field
            name="password"
            autocomplete="new-password"
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
      </div>
      <div class="form-group">
        <label for="password2" class="label">Пароль ещё раз:</label>
        <div class="password-wrapper">
          <Field
            name="password2"
            id="password2"
            autocomplete="new-password"
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
      </div>
      <div v-if="showCredentials()" class="form-group">
        <span class="label">Права:</span>
        <span
          ><em>{{ getCredentials() }}</em></span
        >
      </div>

      <div v-if="showAndEditCredentials()" class="form-group">
        <span class="label">Права:</span>
        <div class="roles-grid">
          <div class="role-item">
            <Field
              id="isAdmin"
              type="checkbox"
              name="isAdmin"
              class="checkbox checkbox-styled"
              :value="keyAdmin"
            />
            <label for="isAdmin">Администратор</label>
          </div>

          <div class="role-item">
            <Field
              id="isShiftLead"
              type="checkbox"
              name="isShiftLead"
              class="checkbox checkbox-styled"
              :value="keyShiftLead"
            />
            <label for="isShiftLead">Старший смены</label>
          </div>

          <div class="role-item">
            <Field
              id="isSrLogist"
              type="checkbox"
              name="isSrLogist"
              class="checkbox checkbox-styled"
              :value="keySrLogist"
            />
            <label for="isSrLogist">Старший логист</label>
          </div>

          <div class="role-item">
            <Field
              id="isLogist"
              type="checkbox"
              name="isLogist"
              class="checkbox checkbox-styled"
              :value="keyLogist"
            />
            <label for="isLogist">Логист</label>
          </div>

          <div class="role-item">
            <Field
              id="isWhManager"
              type="checkbox"
              name="isWhManager"
              class="checkbox checkbox-styled"
              :value="keyWhManager"
            />
            <label for="isWhManager">Менеджер склада</label>
          </div>

          <div class="role-item">
            <Field
              id="isWhOperator"
              type="checkbox"
              name="isWhOperator"
              class="checkbox checkbox-styled"
              :value="keyWhOperator"
            />
            <label for="isWhOperator">Оператор склада</label>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="schemeId" class="label">Схема настройки клавиатуры:</label>
        <Field
          name="schemeId"
          id="schemeId"
          as="select"
          class="form-control input"
        >
          <option :value="0">Без схемы</option>
          <option v-for="scheme in hotKeyActionSchemes" :key="scheme.id" :value="scheme.id">
            {{ scheme.name }}
          </option>
        </Field>
      </div>

      <div v-if="showWarehouseAssociations(values)" class="warehouse-associations">
        <h2 class="label">Доступ к складам:</h2>
        <div class="warehouse-associations-table">
          <v-data-table
            :headers="warehouseHeaders"
            :items="displayedWarehouses"
            :loading="warehousesLoading"
            density="compact"
            class="elevation-1 interlaced-table"
            hide-default-footer
            :items-per-page="-1"
          >
            <template v-slot:[`header.selected`]>
              <div v-if="showAndEditCredentials()" data-testid="warehouse-select-all">
                <v-checkbox
                  :model-value="allWarehousesSelected"
                  aria-label="Выбрать все склады"
                  :disabled="warehousesLoading || displayedWarehouses.length === 0"
                  density="compact"
                  hide-details
                  @update:model-value="toggleAllWarehouses"
                />
              </div>
            </template>
            <template v-slot:[`item.selected`]="{ item }">
              <v-checkbox
                :model-value="isWarehouseSelected(item.id)"
                :disabled="!showAndEditCredentials()"
                density="compact"
                hide-details
                @update:model-value="(selected) => toggleWarehouse(item.id, selected)"
              />
            </template>
          </v-data-table>
        </div>
      </div>

      <div v-if="errors.lastName" class="alert alert-danger mt-3 mb-0">{{ errors.lastName }}</div>
      <div v-if="errors.firstName" class="alert alert-danger mt-3 mb-0">{{ errors.firstName }}</div>
      <div v-if="errors.patronymic" class="alert alert-danger mt-3 mb-0">
        {{ errors.patronymic }}
      </div>
      <div v-if="errors.email" class="alert alert-danger mt-3 mb-0">{{ errors.email }}</div>
      <div v-if="errors.password" class="alert alert-danger mt-3 mb-0">{{ errors.password }}</div>
      <div v-if="errors.password2" class="alert alert-danger mt-3 mb-0">{{ errors.password2 }}</div>
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

<style scoped>
.roles-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  align-items: center;
}
.role-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.warehouse-associations {
  width: 100%;
  margin-top: 24px;
}

.warehouse-associations-table {
  width: 100%;
  min-width: 0;
  margin-top: 24px;
}
@media (max-width: 850px) {
  .roles-grid {
    grid-template-columns: 1fr;
  }
}
</style>
