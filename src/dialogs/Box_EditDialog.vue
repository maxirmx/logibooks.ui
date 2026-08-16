<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import router from '@/router'
import ActionButton from '@/components/ActionButton.vue'
import FieldError from '@/components/FieldError.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { useBoxesStore } from '@/stores/boxes.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { focusFirstInvalidField } from '@/helpers/form.validation.helpers.js'
import { reportFormError } from '@/helpers/error.helpers.js'
import { runWithRetryAlert } from '@/helpers/notification.helpers.js'
import { buildParcelListHeading } from '@/helpers/register.heading.helpers.js'
import { getRegisterNouns, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'

const MAXIMUM_DIMENSION_CM = 99_999_999.99
const MAXIMUM_WEIGHT_KG = 1e17

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  registerId: {
    type: Number,
    required: true
  },
  boxId: {
    type: Number,
    required: false
  }
})

const alertStore = useAlertStore()
const boxesStore = useBoxesStore()
const registersStore = useRegistersStore()
const { box, loading: boxLoading } = storeToRefs(boxesStore)
const { item: register, loading: registerLoading } = storeToRefs(registersStore)
const formReady = ref(false)

const isCreate = computed(() => props.mode === 'create')
const readOnly = computed(() => register.value?.readOnly === true)
const manualWeightDisabled = computed(() => Number(register.value?.realWeightKg || 0) > 0)
const loading = computed(() => boxLoading.value || registerLoading.value)
const registerHeading = computed(() =>
  buildParcelListHeading(
    register.value,
    (id) => registersStore.getTransportationDocument(id),
    getRegisterNouns(OP_MODE_WAREHOUSE).singular
  )
)
const initialValues = computed(() => {
  if (isCreate.value) {
    return {
      code: '',
      lengthCm: null,
      widthCm: null,
      heightCm: null,
      weightKg: null
    }
  }

  return {
    code: box.value?.code || '',
    lengthCm: box.value?.lengthCm ?? null,
    widthCm: box.value?.widthCm ?? null,
    heightCm: box.value?.heightCm ?? null,
    weightKg: box.value?.weightKg ?? null
  }
})

const optionalNumber = (label, maximum, { allowZero = false } = {}) =>
  Yup.number()
    .transform((value, originalValue) => (originalValue === '' ? null : value))
    .nullable()
    .typeError(`${label} должен быть числом`)
    .test('minimum-value', `${label} должен быть ${allowZero ? 'неотрицательным' : 'положительным'}`, (value) =>
      value == null || (allowZero ? value >= 0 : value > 0)
    )
    .max(maximum, `${label} превышает допустимое значение`)

const schema = Yup.object({
  code: Yup.string().trim().required('Номер коробки обязателен'),
  lengthCm: optionalNumber('Длина', MAXIMUM_DIMENSION_CM),
  widthCm: optionalNumber('Ширина', MAXIMUM_DIMENSION_CM),
  heightCm: optionalNumber('Высота', MAXIMUM_DIMENSION_CM),
  weightKg: optionalNumber('Вес', MAXIMUM_WEIGHT_KG, { allowZero: true })
})

function getTitle() {
  return isCreate.value
    ? `${registerHeading.value} - создание коробки`
    : `Редактирование коробки ${box.value?.code || ''}`
}

function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  return Number(value)
}

function boxesPath() {
  return `/registers/${props.registerId}/boxes`
}

function cancel() {
  router.push(boxesPath())
}

async function loadData() {
  formReady.value = false
  const operations = [
    registersStore.ensureOpsLoaded(),
    registersStore.getById(props.registerId)
  ]
  if (!isCreate.value) {
    operations.push(boxesStore.getById(props.boxId))
  }

  await Promise.all(operations)
  if (!isCreate.value && Number(box.value?.registerId) !== Number(props.registerId)) {
    throw new Error('Коробка не принадлежит выбранному реестру')
  }

  formReady.value = true
  if (readOnly.value) {
    alertStore.warning('Изменения запрещены для этого реестра', { timeout: null })
  }
}

defineExpose({
  formReady,
  initialValues,
  manualWeightDisabled,
  readOnly,
  loadData,
  onSubmit,
  cancel,
  toNumberOrNull
})

await runWithRetryAlert(loadData, {
  fallback: isCreate.value ? 'Не удалось подготовить создание коробки' : 'Не удалось загрузить коробку'
})

async function onSubmit(values, { setErrors } = {}) {
  if (!formReady.value) {
    return false
  }

  if (readOnly.value) {
    alertStore.warning('Изменения запрещены для этого реестра', { timeout: null })
    return false
  }

  const payload = {
    lengthCm: toNumberOrNull(values.lengthCm),
    widthCm: toNumberOrNull(values.widthCm),
    heightCm: toNumberOrNull(values.heightCm)
  }
  if (!manualWeightDisabled.value) {
    payload.weightKg = toNumberOrNull(values.weightKg)
  }

  try {
    if (isCreate.value) {
      await boxesStore.create({
        registerId: props.registerId,
        code: values.code.trim(),
        ...payload
      })
    } else {
      await boxesStore.update(props.boxId, payload)
    }
    await router.push(boxesPath())
    return true
  } catch (error) {
    if (isCreate.value && error?.status === 409 && error.message?.includes('уже существует')) {
      alertStore.error('Коробка с таким номером уже существует')
    } else {
      reportFormError(error, {
        setErrors,
        alertStore,
        fallback: isCreate.value
          ? 'Ошибка при создании коробки'
          : 'Ошибка при сохранении коробки'
      })
    }
    return false
  }
}

</script>

<template>
  <div class="settings form-3" data-testid="box-edit-dialog">
    <Form
      :key="`${formReady}-${props.mode}-${box?.id || props.registerId}`"
      class="box-form"
      :initial-values="initialValues"
      :validation-schema="schema"
      @invalid-submit="focusFirstInvalidField"
      @submit="onSubmit"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="header-with-actions">
        <h1 class="primary-heading">{{ getTitle() }}</h1>
        <div class="header-actions">
          <ActionButton
            :item="{}"
            type="submit"
            icon="fa-solid fa-check-double"
            icon-size="2x"
            :tooltip-text="getButtonText()"
            :disabled="!formReady || isSubmitting || loading || readOnly"
            data-testid="box-save-action"
          />
          <ActionButton
            :item="{}"
            icon="fa-solid fa-xmark"
            icon-size="2x"
            tooltip-text="Отменить"
            :disabled="isSubmitting || loading"
            data-testid="box-cancel-action"
            @click="cancel"
          />
        </div>
      </div>

      <hr class="hr" />

      <PageAlertRegion />

      <template v-if="formReady">
      <div class="box-form-field">
        <div class="box-control-row">
          <label for="code" class="label">Номер коробки:</label>
          <Field
            id="code"
            name="code"
            type="text"
            class="form-control input"
            :class="{ 'is-invalid': errors.code }"
            :readonly="!isCreate"
            :disabled="readOnly"
            data-testid="box-code-input"
          />
        </div>
        <FieldError name="code" :errors="errors" />
      </div>

      <div v-for="field in [
        { name: 'lengthCm', label: 'Длина, см:', step: '0.01' },
        { name: 'widthCm', label: 'Ширина, см:', step: '0.01' },
        { name: 'heightCm', label: 'Высота, см:', step: '0.01' }
      ]" :key="field.name" class="box-form-field">
        <div class="box-control-row">
          <label :for="field.name" class="label">{{ field.label }}</label>
          <Field
            :id="field.name"
            :name="field.name"
            type="number"
            min="0.01"
            :max="MAXIMUM_DIMENSION_CM"
            :step="field.step"
            class="form-control input"
            :class="{ 'is-invalid': errors[field.name] }"
            :disabled="readOnly"
            :data-testid="`box-${field.name}-input`"
          />
        </div>
        <FieldError :name="field.name" :errors="errors" />
      </div>

      <div class="box-form-field">
        <div class="box-control-row">
          <label for="weightKg" class="label">Вес, кг:</label>
          <Field
            id="weightKg"
            name="weightKg"
            type="number"
            min="0"
            :max="MAXIMUM_WEIGHT_KG"
            step="0.001"
            class="form-control input"
            :class="{ 'is-invalid': errors.weightKg }"
            :disabled="readOnly || manualWeightDisabled"
            data-testid="box-weight-input"
          />
        </div>
        <FieldError name="weightKg" :errors="errors" />
        <div v-if="manualWeightDisabled" class="field-hint" data-testid="box-weight-disabled-hint">
          Вес коробки рассчитывается автоматически, поскольку для реестра задан фактический вес.
        </div>
      </div>
      </template>
      <div v-if="loading" class="box-loading">
        <span class="spinner-border spinner-border-m"></span>
      </div>
    </Form>
  </div>
</template>

<style scoped>
.box-form-field {
  margin-bottom: 1rem;
}

.box-control-row {
  display: grid;
  grid-template-columns: minmax(150px, 220px) minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
}

.box-form-field :deep(.invalid-feedback),
.field-hint {
  margin-left: calc(min(220px, 35vw) + 1rem);
}

.field-hint {
  margin-top: 0.35rem;
  color: #6c757d;
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.box-loading {
  padding: 2rem;
  text-align: center;
}

@media (max-width: 640px) {
  .box-control-row {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }

  .box-form-field :deep(.invalid-feedback),
  .field-hint {
    margin-left: 0;
  }
}
</style>
