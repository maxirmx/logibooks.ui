<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref, computed } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  orderStatusId: {
    type: Number,
    required: false
  }
})

const parcelStatusesStore = useParcelStatusesStore()

// Check if we're in create mode
const isCreate = computed(() => props.mode === 'create')

let parcelStatus = ref({
  title: '',
  useAtCustomsProcessing: false,
  bkColor: null,
  restrictionReason: ''
})

if (!isCreate.value) {
  ;({ parcelStatus } = storeToRefs(parcelStatusesStore))
  await parcelStatusesStore.getById(props.orderStatusId)
}

// Get page title
function getTitle() {
  return isCreate.value ? 'Создание статуса посылки' : 'Редактирование статуса посылки'
}

// Get button text
function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

// Validation schema
const schema = Yup.object({
  title: Yup.string().required('Название статуса обязательно'),
  bkColor: Yup.string()
    .nullable()
    .matches(/^#[0-9A-Fa-f]{6}$/, {
      message: 'Цвет при выгрузке должен быть в формате #RRGGBB',
      excludeEmptyString: true
    })
})

function getBackgroundColorValue(fieldValue) {
  const value = fieldValue === undefined ? parcelStatus.value?.bkColor : fieldValue
  return /^#[0-9A-Fa-f]{6}$/.test(value || '') ? value : null
}

function getBackgroundColorPickerValue(fieldValue) {
  return getBackgroundColorValue(fieldValue) || '#ffffff'
}

function getBackgroundColorDisplay(fieldValue) {
  return getBackgroundColorValue(fieldValue) || 'Не задан'
}

function hasBackgroundColor(fieldValue) {
  return getBackgroundColorValue(fieldValue) !== null
}

function handleBackgroundColorInput(event, handleChange) {
  const value = event.target.value || null
  if (parcelStatus.value) {
    parcelStatus.value.bkColor = value
  }
  handleChange(value)
}

function handleBackgroundColorClear(handleChange) {
  if (parcelStatus.value) {
    parcelStatus.value.bkColor = null
  }
  handleChange(null)
}

// Form submission
function onSubmit(values, { setErrors }) {
  if (isCreate.value) {
    return parcelStatusesStore
      .create(values)
      .then(() => {
        router.push('/parcelstatuses')
      })
      .catch((error) => {
        if (error.message?.includes('409')) {
          setErrors({ apiError: 'Такой статус посылки уже существует' })
        } else {
          setErrors({ apiError: error.message || 'Ошибка при создании статуса посылки' })
        }
      })
  } else {
    return parcelStatusesStore
      .update(props.orderStatusId, values)
      .then(() => {
        router.push('/parcelstatuses')
      })
      .catch((error) => {
        setErrors({ apiError: error.message || 'Ошибка при сохранении статуса посылки' })
      })
  }
}
</script>

<template>
  <div class="settings form-2">
    <Form
      class="parcel-status-form"
      @submit="onSubmit"
      :initial-values="parcelStatus"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting, handleSubmit }"
    >
      <div class="header-with-actions">
        <h1 class="primary-heading">{{ getTitle() }}</h1>
        <div class="header-actions" data-testid="parcel-status-header-actions">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-check-double"
            :iconSize="'2x'"
            :tooltip-text="getButtonText()"
            :disabled="isSubmitting"
            data-testid="parcel-status-save-action"
            @click="handleSubmit(onSubmit)"
          />
          <ActionButton
            :item="{}"
            icon="fa-solid fa-xmark"
            :iconSize="'2x'"
            tooltip-text="Отменить"
            :disabled="isSubmitting"
            data-testid="parcel-status-cancel-action"
            @click="router.push('/parcelstatuses')"
          />
        </div>
      </div>
      <hr class="hr" />

      <div class="form-group">
        <label for="title" class="label">Название статуса:</label>
        <Field
          name="title"
          id="title"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.title }"
          placeholder="Название статуса"
        />
      </div>

      <div class="form-group">
        <div class="checkbox-item">
          <Field
            id="useAtCustomsProcessing"
            type="checkbox"
            name="useAtCustomsProcessing"
            class="checkbox checkbox-styled"
            :value="true"
            :unchecked-value="false"
          />
          <label for="useAtCustomsProcessing" class="label">Таможенное оформление:</label>
        </div>
      </div>

      <Field name="bkColor" v-slot="{ field, handleChange }">
        <div class="form-group">
          <label for="bkColor" class="label">Цвет при выгрузке:</label>
          <div class="status-color-actions">
            <label
              class="status-color-control"
              :class="{ 'status-color-control--empty': !hasBackgroundColor(field?.value) }"
              for="bkColor"
            >
              <span
                class="status-color-swatch"
                :class="{ 'status-color-swatch--empty': !hasBackgroundColor(field?.value) }"
                :style="{ backgroundColor: getBackgroundColorValue(field?.value) || 'transparent' }"
                data-testid="bk-color-swatch"
              ></span>
              <span class="status-color-value">{{ getBackgroundColorDisplay(field?.value) }}</span>
              <input
                id="bkColor"
                type="color"
                class="status-color-native"
                :class="{ 'is-invalid': errors.bkColor }"
                aria-label="Цвет при выгрузке"
                :value="getBackgroundColorPickerValue(field?.value)"
                @input="(event) => handleBackgroundColorInput(event, handleChange)"
              />
            </label>
          <div class="status-color-control status-color-control-brush">
            <ActionButton
              :item="{}"
              icon="fa-solid fa-broom"
              tooltip-text="Очистить"
              :disabled="!hasBackgroundColor(field?.value)"
              data-testid="bk-color-clear-action"
              @click="handleBackgroundColorClear(handleChange)"
            />
          </div>
          </div>
        </div>
      </Field>

      <div class="form-group">
        <label for="restrictionReason" class="label">Причина запрета:</label>
        <Field
          id="restrictionReason"
          name="restrictionReason"
          type="text"
          class="form-control input"
          placeholder="Причина запрета"
        />
      </div>

      <div v-if="errors.title" class="alert alert-danger mt-3 mb-0">{{ errors.title }}</div>
      <div v-if="errors.bkColor" class="alert alert-danger mt-3 mb-0">{{ errors.bkColor }}</div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
  </div>
</template>

<style scoped>  
.primary-heading {
  margin: 0;
  flex: 1;
  min-width: 0;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-item label {
  margin: 0;
  padding: 0;
  width: auto;
  display: inline-block;
}

/* Override checkbox-styled label width for table */
.checkbox-item .checkbox-styled + label {
  width: auto;
  min-width: 20px;
}

.checkbox-item .checkbox-styled + label:after {
  margin-left: 130px;
  margin-right: 10px;
}

.checkbox-item .checkbox-styled + label:before {
  right: 12px;
}

.status-color-control {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: fit-content;
  min-width: 7.25rem;
  min-height: 2.25rem;
  border: 1px solid #c7ccd1;
  border-radius: 4px;
  background: #fff;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}

.status-color-control-brush {
  padding: 0rem 0rem;
  min-width: 2.25rem;
  margin-bottom: 8px;
}

.status-color-control:focus-within {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.18);
}

.status-color-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.status-color-control--empty {
  color: #6c757d;
}

.status-color-swatch {
  position: relative;
  width: 1.75rem;
  height: 1.25rem;
  border: 1px solid #74777c;
  border-radius: 4px;
}

.status-color-swatch--empty::after {
  content: '';
  position: absolute;
  left: 0.2rem;
  right: 0.2rem;
  top: 50%;
  border-top: 2px solid #d3223f;
  transform: rotate(-45deg);
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

@media (max-width: 700px) {
  .header-with-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .primary-heading {
    max-width: 100%;
    margin-bottom: 0.5rem;
  }

  .header-actions {
    align-self: flex-end;
  }
}
</style>
