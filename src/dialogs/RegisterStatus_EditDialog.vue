<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref, computed } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'
import RegisterStatusIcon from '@/components/RegisterStatusIcon.vue'
import {
  REGISTER_STATUS_DEFAULT_BK_COLOR,
  REGISTER_STATUS_DEFAULT_FG_COLOR,
  isSupportedRegisterStatusIcon,
  normalizeRegisterStatusPresentationPayload,
  registerStatusIconOptions
} from '@/helpers/register.status.icons.js'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  registerStatusId: {
    type: Number,
    required: false
  }
})

const registerStatusesStore = useRegisterStatusesStore()

// Check if we're in create mode
const isCreate = computed(() => props.mode === 'create')

let registerStatus

if (isCreate.value) {
  registerStatus = ref({
    title: '',
    icon: null,
    bkColor: null,
    fgColor: null
  })
} else {
  const refs = storeToRefs(registerStatusesStore)
  registerStatus = refs.registerStatus
  await registerStatusesStore.getById(props.registerStatusId)
}

// Get page title
function getTitle() {
  return isCreate.value ? 'Создание статуса партии' : 'Редактирование статуса партии'
}

// Get button text
function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

// Validation schema
const schema = Yup.object({
  title: Yup.string().required('Название статуса обязательно'),
  icon: Yup.string()
    .nullable()
    .test(
      'supported-register-status-icon',
      'Выберите поддерживаемую иконку статуса',
      (value) => !value || isSupportedRegisterStatusIcon(value)
    ),
  bkColor: Yup.string()
    .nullable()
    .matches(/^#[0-9A-Fa-f]{6}$/, {
      message: 'Цвет фона должен быть в формате #RRGGBB',
      excludeEmptyString: true
    }),
  fgColor: Yup.string()
    .nullable()
    .matches(/^#[0-9A-Fa-f]{6}$/, {
      message: 'Цвет иконки должен быть в формате #RRGGBB',
      excludeEmptyString: true
    })
})

function getColorFieldValue(fieldValue, fieldName) {
  const value = fieldValue || registerStatus.value?.[fieldName]
  if (/^#[0-9A-Fa-f]{6}$/.test(value || '')) {
    return value
  }
  return fieldName === 'bkColor'
    ? REGISTER_STATUS_DEFAULT_BK_COLOR
    : REGISTER_STATUS_DEFAULT_FG_COLOR
}

function getIconFieldValue(fieldValue) {
  return fieldValue || registerStatus.value?.icon || null
}

function getPreviewStatus(iconValue, bkColorValue, fgColorValue) {
  return {
    title: registerStatus.value?.title,
    icon: getIconFieldValue(iconValue),
    bkColor: getColorFieldValue(bkColorValue, 'bkColor'),
    fgColor: getColorFieldValue(fgColorValue, 'fgColor')
  }
}

function handleColorInput(event, handleChange, fieldName) {
  const value = event.target.value || null
  if (registerStatus.value) {
    registerStatus.value[fieldName] = value
  }
  handleChange(value)
}

// Form submission
function onSubmit(values, { setErrors }) {
  const payload = normalizeRegisterStatusPresentationPayload(values)
  if (isCreate.value) {
    return registerStatusesStore
      .create(payload)
      .then(() => {
        router.push('/registerstatuses')
      })
      .catch((error) => {
        if (error.message?.includes('409')) {
          setErrors({ apiError: 'Такой статус партии уже существует' })
        } else {
          setErrors({ apiError: error.message || 'Ошибка при создании статуса партии' })
        }
      })
  } else {
    return registerStatusesStore
      .update(props.registerStatusId, payload)
      .then(() => {
        router.push('/registerstatuses')
      })
      .catch((error) => {
        setErrors({ apiError: error.message || 'Ошибка при сохранении статуса партии' })
      })
  }
}
</script>

<template>
  <div class="settings form-2">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />
    <Form
      class="register-status-form"
      @submit="onSubmit"
      :initial-values="registerStatus"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="status-settings-row">
        <label for="title" class="label status-settings-label">Название статуса:</label>
        <Field
          name="title"
          id="title"
          type="text"
          class="form-control input status-title-input"
          :class="{ 'is-invalid': errors.title }"
          placeholder="Название статуса"
        />
      </div>

      <Field name="bkColor" v-slot="{ field, handleChange }">
        <div class="status-settings-row">
          <label for="bkColor" class="label status-settings-label">Цвет фона:</label>
          <label class="status-color-control" for="bkColor">
            <span
              class="status-color-swatch"
              :style="{ backgroundColor: getColorFieldValue(field?.value, 'bkColor') }"
              data-testid="bk-color-swatch"
            ></span>
            <span class="status-color-value">{{ getColorFieldValue(field?.value, 'bkColor') }}</span>
            <input
              id="bkColor"
              type="color"
              class="status-color-native"
              :class="{ 'is-invalid': errors.bkColor }"
              aria-label="Цвет фона"
              :value="getColorFieldValue(field?.value, 'bkColor')"
              @input="(event) => handleColorInput(event, handleChange, 'bkColor')"
            />
          </label>
        </div>
      </Field>
      <Field name="fgColor" v-slot="{ field, handleChange }">
        <div class="status-settings-row">
          <label for="fgColor" class="label status-settings-label">Цвет иконки:</label>
          <label class="status-color-control" for="fgColor">
            <span
              class="status-color-swatch"
              :style="{ backgroundColor: getColorFieldValue(field?.value, 'fgColor') }"
              data-testid="fg-color-swatch"
            ></span>
            <span class="status-color-value">{{ getColorFieldValue(field?.value, 'fgColor') }}</span>
            <input
              id="fgColor"
              type="color"
              class="status-color-native"
              :class="{ 'is-invalid': errors.fgColor }"
              aria-label="Цвет иконки"
              :value="getColorFieldValue(field?.value, 'fgColor')"
              @input="(event) => handleColorInput(event, handleChange, 'fgColor')"
            />
          </label>
        </div>
      </Field>

      <Field name="icon" v-slot="{ field, handleChange }">
        <div class="status-settings-row status-settings-row--icons">
          <span class="label status-settings-label">Иконка:</span>
          <div class="status-icon-column">
            <div class="status-icon-selector" :class="{ 'is-invalid': errors.icon }">
              <button
                v-for="option in registerStatusIconOptions"
                :key="option.value"
                type="button"
                class="status-icon-option"
                :class="{ selected: getIconFieldValue(field?.value) === option.value }"
                :aria-label="option.value"
                @click="handleChange(option.value)"
              >
                <RegisterStatusIcon
                  :status="{
                    icon: option.value,
                    bkColor: getColorFieldValue(undefined, 'bkColor'),
                    fgColor: getColorFieldValue(undefined, 'fgColor')
                  }"
                  :show-tooltip="false"
                />
              </button>
            </div>
            <div class="status-icon-preview">
              <RegisterStatusIcon
                :status="getPreviewStatus(field?.value, registerStatus.bkColor, registerStatus.fgColor)"
                :show-tooltip="false"
              />
            </div>
          </div>
        </div>
      </Field>

      <div class="status-settings-actions mt-8">
        <div class="status-settings-actions-buttons">
          <button class="button primary" type="submit" :disabled="isSubmitting">
            <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
            <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
            {{ getButtonText() }}
          </button>
          <button
            class="button secondary"
            type="button"
            @click="$router.push('/registerstatuses')"
          >
            <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
            Отменить
          </button>
        </div>
      </div>

      <div v-if="errors.title" class="alert alert-danger mt-3 mb-0">{{ errors.title }}</div>
      <div v-if="errors.icon" class="alert alert-danger mt-3 mb-0">{{ errors.icon }}</div>
      <div v-if="errors.bkColor" class="alert alert-danger mt-3 mb-0">{{ errors.bkColor }}</div>
      <div v-if="errors.fgColor" class="alert alert-danger mt-3 mb-0">{{ errors.fgColor }}</div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
  </div>
</template>

<style scoped>
.register-status-form {
  --register-status-label-width: 13rem;
}

.status-settings-row,
.status-settings-actions {
  display: grid;
  grid-template-columns: var(--register-status-label-width) minmax(0, 1fr);
  align-items: center;
  column-gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.status-settings-row--icons {
  align-items: start;
}

.status-settings-label {
  width: auto;
  min-width: 0;
}

.status-title-input {
  width: 100%;
}

.status-color-control {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: fit-content;
  min-width: 9.5rem;
  min-height: 2.25rem;
  border: 1px solid #c7ccd1;
  border-radius: 4px;
  background: #fff;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}

.status-color-control:focus-within {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.18);
}

.status-color-swatch {
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid #74777c;
  border-radius: 4px;
}

.status-color-value {
  font-variant-numeric: tabular-nums;
}

.status-color-native {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  opacity: 0;
  cursor: pointer;
}

.status-icon-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, 2.5rem);
  gap: 0.5rem;
  align-items: center;
}

.status-icon-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid #c7ccd1;
  border-radius: 4px;
  background: #fff;
  padding: 0.125rem;
  cursor: pointer;
}

.status-icon-option:hover {
  border-color: #1976d2;
}

.status-icon-option.selected {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.18);
}

.status-icon-column {
  min-width: 0;
}

.status-icon-preview {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.status-settings-actions {
  margin-bottom: 0;
}

.status-settings-actions-buttons {
  grid-column: 2;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 700px) {
  .status-settings-row,
  .status-settings-actions {
    grid-template-columns: 1fr;
    row-gap: 0.35rem;
  }

  .status-settings-actions-buttons {
    grid-column: 1;
  }
}
</style>
