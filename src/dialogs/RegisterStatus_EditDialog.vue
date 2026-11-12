<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import FieldError from '@/components/FieldError.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { focusFirstInvalidField } from '@/helpers/form.validation.helpers.js'
import { runWithAlert } from '@/helpers/notification.helpers.js'
import { reportFormError } from '@/helpers/error.helpers.js'
import { ref, computed, getCurrentScope } from 'vue'
import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import ActionButton from '@/components/ActionButton.vue'
import RegisterStatusIcon from '@/components/RegisterStatusIcon.vue'
import StatusColorInput from '@/components/StatusColorInput.vue'
import { hexToRgb, isOptionalRgb, rgbToHex } from '@/helpers/status.color.helpers.js'
import {
  REGISTER_STATUS_DEFAULT_BK_COLOR,
  REGISTER_STATUS_DEFAULT_FG_COLOR,
  isSupportedRegisterStatusIcon,
  normalizeRegisterStatusPresentationPayload,
  registerStatusIconOptions
} from '@/helpers/register.status.icons.js'

const alertStore = useAlertStore()

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
const authStore = useAuthStore()

// Check if we're in create mode
const isCreate = computed(() => props.mode === 'create')
const registerStatus = ref({
  title: '',
  icon: null,
  bkColor: null,
  fgColor: null,
  readOnly: false,
  transit: false,
  exportTo1C: false,
  monitorInAlta: false
})
const canEdit = computed(() => Boolean(registerStatus.value) && authStore.canWriteSettings)

if (!isCreate.value) {
  const saved = await runWithAlert(() => registerStatusesStore.getById(props.registerStatusId), {
    fallback: 'Не удалось загрузить статус партии',
    scope: getCurrentScope()
  })
  registerStatus.value = saved && {
    ...saved,
    bkColor: hexToRgb(saved.bkColor),
    fgColor: hexToRgb(saved.fgColor)
  }
}

// Get page title
function getTitle() {
  if (!authStore.canWriteSettings) return 'Просмотр статуса партии'
  return isCreate.value ? 'Создание статуса партии' : 'Редактирование статуса партии'
}

// Get button text
function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

// Validation schema
const schema = Yup.object({
  exportTo1C: Yup.boolean().default(false),
  monitorInAlta: Yup.boolean().default(false),
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
    .test('rgb-color', 'Укажите цвет фона тремя числами от 0 до 255 через запятую', isOptionalRgb),
  fgColor: Yup.string()
    .nullable()
    .test('rgb-color', 'Укажите цвет иконки тремя числами от 0 до 255 через запятую', isOptionalRgb)
})

// Form submission
function onSubmit(values, { setErrors } = {}) {
  if (!canEdit.value) return
  const payload = normalizeRegisterStatusPresentationPayload({
    ...values,
    bkColor: rgbToHex(values.bkColor),
    fgColor: rgbToHex(values.fgColor)
  })
  if (isCreate.value) {
    return registerStatusesStore
      .create(payload)
      .then(close)
      .catch((error) => {
        if (error.message?.includes('409')) {
          alertStore.error('Такой статус партии уже существует')
        } else {
          reportFormError(error, {
            setErrors,
            alertStore,
            fallback: 'Ошибка при создании статуса партии'
          })
        }
      })
  } else {
    return registerStatusesStore
      .update(props.registerStatusId, payload)
      .then(close)
      .catch((error) => {
        reportFormError(error, {
          setErrors,
          alertStore,
          fallback: 'Ошибка при сохранении статуса партии'
        })
      })
  }
}
function close() {
  return runWithAlert(() => router.push('/registerstatuses'), {
    fallback: 'Не удалось открыть список'
  })
}
</script>

<template>
  <div class="settings form-2">
    <Form
      @invalid-submit="focusFirstInvalidField"
      class="register-status-form"
      @submit="onSubmit"
      :initial-values="registerStatus"
      :validation-schema="schema"
      v-slot="{ errors, values, isSubmitting, handleSubmit }"
    >
      <div class="header-with-actions">
        <h1 class="primary-heading">{{ getTitle() }}</h1>
        <div class="header-actions" data-testid="register-status-header-actions">
          <ActionButton
            v-if="canEdit"
            :item="{}"
            icon="fa-solid fa-check-double"
            :iconSize="'2x'"
            :tooltip-text="getButtonText()"
            :disabled="isSubmitting"
            data-testid="register-status-save-action"
            @click="handleSubmit(onSubmit)"
          />
          <ActionButton
            :item="{}"
            icon="fa-solid fa-xmark"
            :iconSize="'2x'"
            :tooltip-text="canEdit ? 'Отменить' : 'Закрыть'"
            :disabled="isSubmitting"
            data-testid="register-status-cancel-action"
            @click="close"
          />
        </div>
      </div>
      <hr class="hr" />

      <PageAlertRegion />

      <fieldset v-if="registerStatus" :disabled="!canEdit" class="settings-fields">
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
          <FieldError name="title" :errors="errors" />
        </div>

        <div class="status-settings-row">
          <label for="transit" class="label status-settings-label">Транзит:</label>
          <div class="checkbox-item">
            <Field
              id="transit"
              name="transit"
              type="checkbox"
              class="checkbox checkbox-styled"
              :value="true"
              :unchecked-value="false"
            />
            <label for="transit" aria-hidden="true"></label>
          </div>
        </div>

        <div class="status-settings-row">
          <label for="exportTo1C" class="label status-settings-label">Выгружать в 1C:</label>
          <div class="checkbox-item">
            <Field
              id="exportTo1C"
              name="exportTo1C"
              type="checkbox"
              class="checkbox checkbox-styled"
              :value="true"
              :unchecked-value="false"
            />
            <label for="exportTo1C" aria-hidden="true"></label>
          </div>
          <FieldError name="exportTo1C" :errors="errors" />
        </div>

        <div class="status-settings-row">
          <label for="monitorInAlta" class="label status-settings-label">
            Мониторинг реестра в Альта-Софт:
          </label>
          <div class="checkbox-item">
            <Field
              id="monitorInAlta"
              name="monitorInAlta"
              type="checkbox"
              class="checkbox checkbox-styled"
              :value="true"
              :unchecked-value="false"
            />
            <label for="monitorInAlta" aria-hidden="true"></label>
          </div>
          <FieldError name="monitorInAlta" :errors="errors" />
        </div>

        <div class="status-settings-row">
          <label for="readOnly" class="label status-settings-label">Изменения запрещены:</label>
          <div class="checkbox-item">
            <Field
              id="readOnly"
              name="readOnly"
              type="checkbox"
              class="checkbox checkbox-styled"
              :value="true"
              :unchecked-value="false"
            />
            <label for="readOnly" aria-hidden="true"></label>
          </div>
        </div>

        <Field name="bkColor" v-slot="{ value, handleChange, handleBlur }">
          <div class="status-settings-row">
            <label :for="canEdit ? 'bkColor' : 'bkColor-picker'" class="label status-settings-label">
              Цвет фона:
            </label>
            <StatusColorInput
              id="bkColor"
              label="Цвет фона"
              :model-value="value"
              :default-color="REGISTER_STATUS_DEFAULT_BK_COLOR"
              :disabled="!canEdit"
              :invalid="Boolean(errors.bkColor)"
              @update:model-value="handleChange($event, Boolean(errors.bkColor))"
              @blur="handleBlur($event, true)"
            />
            <FieldError name="bkColor" :errors="errors" />
          </div>
        </Field>
        <Field name="fgColor" v-slot="{ value, handleChange, handleBlur }">
          <div class="status-settings-row">
            <label :for="canEdit ? 'fgColor' : 'fgColor-picker'" class="label status-settings-label">
              Цвет иконки:
            </label>
            <StatusColorInput
              id="fgColor"
              label="Цвет иконки"
              :model-value="value"
              :default-color="REGISTER_STATUS_DEFAULT_FG_COLOR"
              :disabled="!canEdit"
              :invalid="Boolean(errors.fgColor)"
              @update:model-value="handleChange($event, Boolean(errors.fgColor))"
              @blur="handleBlur($event, true)"
            />
            <FieldError name="fgColor" :errors="errors" />
          </div>
        </Field>

        <Field name="icon" v-slot="{ value, handleChange }">
          <div class="status-settings-row status-settings-row--icons">
            <span class="label status-settings-label">Иконка:</span>
            <div class="status-icon-column">
              <div class="status-icon-selector" :class="{ 'is-invalid': errors.icon }">
                <button
                  v-for="option in registerStatusIconOptions"
                  :key="option.value"
                  type="button"
                  class="status-icon-option"
                  :class="{ selected: value === option.value }"
                  :aria-label="option.value"
                  @click="handleChange(option.value)"
                >
                  <RegisterStatusIcon
                    :status="{
                      icon: option.value,
                      bkColor: rgbToHex(values.bkColor),
                      fgColor: rgbToHex(values.fgColor)
                    }"
                  />
                </button>
              </div>
            </div>
            <FieldError name="icon" :errors="errors" />
          </div>
        </Field>
      </fieldset>
    </Form>
  </div>
</template>

<style scoped>
.primary-heading {
  margin: 0;
  flex: 1;
  min-width: 0;
}

.register-status-form {
  --register-status-label-width: min(40%, 19rem);
  --register-status-control-height: 2.25rem;
  --register-status-icon-option-size: 2.5rem;
}

.status-settings-row {
  display: grid;
  grid-template-columns: var(--register-status-label-width) minmax(0, 1fr);
  align-items: center;
  column-gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.status-settings-row > .invalid-feedback {
  grid-column: 2;
  min-width: 0;
  overflow-wrap: anywhere;
}

.status-settings-row--icons {
  align-items: start;
}

.checkbox-item {
  display: flex;
  align-items: center;
}

.checkbox-item .checkbox-styled + label {
  margin: 0;
  padding: 0;
  width: 16px;
  min-width: 16px;
  height: 16px;
  display: inline-flex;
}

.checkbox-item .checkbox-styled + label:after {
  margin: 0;
}

.checkbox-item .checkbox-styled + label:before {
  top: 0;
  right: 2px;
}

.status-settings-label {
  width: auto;
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
  align-self: center;
  display: flex;
  align-items: center;
  min-height: var(--register-status-control-height);
}

.status-settings-row--icons .status-settings-label {
  align-self: start;
  min-height: var(--register-status-icon-option-size);
}

.status-title-input {
  width: 100%;
  margin-bottom: 0;
}

.status-icon-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--register-status-icon-option-size));
  gap: 0.5rem;
  align-items: center;
}

.status-icon-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--register-status-icon-option-size);
  height: var(--register-status-icon-option-size);
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

@media (max-width: 700px) {
  .status-settings-row {
    grid-template-columns: 1fr;
    row-gap: 0.35rem;
  }

  .status-settings-row > .invalid-feedback {
    grid-column: 1;
  }

  .status-settings-label {
    min-height: 0;
  }
}
</style>
