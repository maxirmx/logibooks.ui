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
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import ActionButton from '@/components/ActionButton.vue'
import StatusColorInput from '@/components/StatusColorInput.vue'
import { hexToRgb, isOptionalRgb, rgbToHex } from '@/helpers/status.color.helpers.js'

const alertStore = useAlertStore()
const authStore = useAuthStore()

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

const parcelStatus = ref({
  title: '',
  useAtCustomsProcessing: false,
  bkColor: null,
  restrictionReason: '',
  inspection: false
})
const canEdit = computed(() => Boolean(parcelStatus.value) && authStore.canWriteSettings)

if (!isCreate.value) {
  const saved = await runWithAlert(() => parcelStatusesStore.getById(props.orderStatusId), {
    fallback: 'Не удалось загрузить статус посылки',
    scope: getCurrentScope()
  })
  parcelStatus.value = saved && { ...saved, bkColor: hexToRgb(saved.bkColor) }
}

// Get page title
function getTitle() {
  if (!authStore.canWriteSettings) return 'Просмотр статуса посылки'
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
    .test('rgb-color', 'Укажите цвет при выгрузке тремя числами от 0 до 255 через запятую', isOptionalRgb)
})

// Form submission
function onSubmit(values, { setErrors } = {}) {
  if (!canEdit.value) return
  const payload = { ...values, bkColor: rgbToHex(values.bkColor) }
  if (isCreate.value) {
    return parcelStatusesStore
      .create(payload)
      .then(close)
      .catch((error) => {
        if (error.message?.includes('409')) {
          alertStore.error('Такой статус посылки уже существует')
        } else {
          reportFormError(error, {
            setErrors,
            alertStore,
            fallback: 'Ошибка при создании статуса посылки'
          })
        }
      })
  } else {
    return parcelStatusesStore
      .update(props.orderStatusId, payload)
      .then(close)
      .catch((error) => {
        reportFormError(error, {
          setErrors,
          alertStore,
          fallback: 'Ошибка при сохранении статуса посылки'
        })
      })
  }
}
function close() {
  return runWithAlert(() => router.push('/parcelstatuses'), {
    fallback: 'Не удалось открыть список'
  })
}
</script>

<template>
  <div class="settings form-2">
    <Form
      @invalid-submit="focusFirstInvalidField"
      class="parcel-status-form"
      @submit="onSubmit"
      :initial-values="parcelStatus"
      :validation-schema="schema"
      v-slot="{ errors, values, isSubmitting, handleSubmit }"
    >
      <div class="header-with-actions">
        <h1 class="primary-heading">{{ getTitle() }}</h1>
        <div class="header-actions" data-testid="parcel-status-header-actions">
          <ActionButton
            v-if="canEdit"
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
            :tooltip-text="canEdit ? 'Отменить' : 'Закрыть'"
            :disabled="isSubmitting"
            data-testid="parcel-status-cancel-action"
            @click="close"
          />
        </div>
      </div>
      <hr class="hr" />

      <PageAlertRegion />

      <fieldset v-if="parcelStatus" :disabled="!canEdit" class="settings-fields">
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
          <FieldError name="title" :errors="errors" />
        </div>

        <div class="form-group">
          <label for="useAtCustomsProcessing" class="label">Таможенное оформление:</label>
          <div class="checkbox-item">
            <Field
              id="useAtCustomsProcessing"
              type="checkbox"
              name="useAtCustomsProcessing"
              class="checkbox checkbox-styled"
              :value="true"
              :unchecked-value="false"
            />
            <label for="useAtCustomsProcessing" aria-hidden="true"></label>
          </div>
        </div>

        <div class="form-group">
          <label for="inspection" class="label">Досмотр:</label>
          <div class="checkbox-item">
            <Field
              id="inspection"
              type="checkbox"
              name="inspection"
              class="checkbox checkbox-styled"
              :value="true"
              :unchecked-value="false"
            />
            <label for="inspection" aria-hidden="true"></label>
          </div>
        </div>

        <Field name="bkColor" v-slot="{ value, handleChange, handleBlur }">
          <div class="form-group">
            <label :for="canEdit ? 'bkColor' : 'bkColor-picker'" class="label">Цвет при выгрузке:</label>
            <div class="status-color-actions">
              <StatusColorInput
                id="bkColor"
                label="Цвет при выгрузке"
                :model-value="value"
                :disabled="!canEdit"
                :invalid="Boolean(errors.bkColor)"
                @update:model-value="handleChange($event, Boolean(errors.bkColor))"
                @blur="handleBlur($event, true)"
              />
              <ActionButton
                v-if="canEdit"
                :item="{}"
                icon="fa-solid fa-broom"
                tooltip-text="Очистить"
                :disabled="!value"
                data-testid="bk-color-clear-action"
                @click="handleChange(null)"
              />
            </div>
            <FieldError name="bkColor" :errors="errors" />
          </div>
        </Field>

        <div
          v-if="!authStore.canWriteSettings || !values.useAtCustomsProcessing"
          class="form-group"
          data-testid="restriction-reason-group"
        >
          <label for="restrictionReason" class="label">Причина запрета:</label>
          <Field
            id="restrictionReason"
            name="restrictionReason"
            type="text"
            class="form-control input"
            placeholder="Причина запрета"
          />
        </div>
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

.checkbox-item {
  display: flex;
  align-items: center;
}

.checkbox-item .checkbox-styled + label {
  margin: 0;
  padding: 0;
  width: auto;
  min-width: 0;
  display: inline-flex;
  align-items: center;
}

.checkbox-item .checkbox-styled + label:after {
  margin-left: 0;
  margin-right: 0;
}

.checkbox-item .checkbox-styled + label:before {
  top: 0;
  right: 2px;
}

.status-color-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

</style>
