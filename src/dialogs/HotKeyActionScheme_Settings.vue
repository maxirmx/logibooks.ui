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
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useHotKeyActionSchemesStore } from '@/stores/hotkey.action.schemes.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import ActionButton from '@/components/ActionButton.vue'
import KeyCaptureInput from '@/components/KeyCaptureInput.vue'

const alertStore = useAlertStore()
const authStore = useAuthStore()

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  hotKeyActionSchemeId: {
    type: Number,
    required: false
  }
})

const hotKeyActionSchemesStore = useHotKeyActionSchemesStore()
const { ops } = storeToRefs(hotKeyActionSchemesStore)
const isCreate = computed(() => props.mode === 'create')
const scope = getCurrentScope()
const isSubmitting = ref(false)

const hotKeyActionScheme = ref({
  name: '',
  actions: []
})

// Load ops data
const savedOps = await runWithAlert(() => hotKeyActionSchemesStore.ensureOpsLoaded(), {
  fallback: 'Не удалось загрузить список действий',
  scope
})
let loaded = scope.active && savedOps !== null

if (loaded && !isCreate.value) {
  const saved = await runWithAlert(() => hotKeyActionSchemesStore.getById(props.hotKeyActionSchemeId), {
    fallback: 'Не удалось загрузить схему настройки клавиатуры',
    scope
  })
  loaded = Boolean(saved)
  if (saved) {
    hotKeyActionScheme.value = { ...saved, actions: (saved.actions ?? []).map(action => ({ ...action })) }
  }
} else if (loaded) {
  // In create mode, initialize with all actions from ops
  hotKeyActionScheme.value.actions = ops.value.actions.map((action) => ({
    id: 0,
    action: action.value,
    keyCode: '',
    shift: false,
    ctrl: false,
    alt: false,
    schemeId: 0
  }))
}
const canEdit = computed(() => loaded && authStore.canWriteSettings)

function getTitle() {
  if (!authStore.canWriteSettings) return 'Просмотр схемы настройки клавиатуры'
  return isCreate.value
    ? 'Создание схемы настройки клавиатуры'
    : 'Изменение схемы настройки клавиатуры'
}

function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

function getActionName(actionId) {
  return hotKeyActionSchemesStore.getOpsLabel(ops.value.actions, actionId)
}

const schema = Yup.object({
  name: Yup.string().required('Название обязательно')
})

function onSubmit(values, { setErrors } = {}) {
  if (!canEdit.value || isSubmitting.value) return

  isSubmitting.value = true
  const submitData = {
    id: hotKeyActionScheme.value.id,
    name: values.name,
    actions: hotKeyActionScheme.value.actions
  }

  if (isCreate.value) {
    return hotKeyActionSchemesStore
      .create(submitData)
      .then(close)
      .catch((error) => {
        if (error.message?.includes('409')) {
          alertStore.error('Схема настройки клавиатуры с таким названием уже существует')
        } else {
          reportFormError(error, {
            setErrors,
            alertStore,
            fallback: 'Ошибка при создании схемы настройки клавиатуры'
          })
        }
      })
      .finally(() => {
        isSubmitting.value = false
      })
  }

  return hotKeyActionSchemesStore
    .update(props.hotKeyActionSchemeId, submitData)
    .then(close)
    .catch((error) => {
      reportFormError(error, {
        setErrors,
        alertStore,
        fallback: 'Ошибка при сохранении схемы настройки клавиатуры'
      })
    })
    .finally(() => {
      isSubmitting.value = false
    })
}

function close() {
  return runWithAlert(() => router.push('/hotkeyactionschemes'), {
    fallback: 'Не удалось открыть список'
  })
}
</script>

<template>
  <div class="settings form-3">
    <Form
      @invalid-submit="focusFirstInvalidField"
      @submit="onSubmit"
      :initial-values="hotKeyActionScheme"
      :validation-schema="schema"
      v-slot="{ errors, handleSubmit }"
    >
      <div class="header-with-actions">
        <h1 class="primary-heading">{{ getTitle() }}</h1>
        <div class="header-actions">
          <ActionButton
            v-if="canEdit"
            :item="{}"
            icon="fa-solid fa-check-double"
            icon-size="2x"
            :tooltip-text="getButtonText()"
            :disabled="isSubmitting"
            @click="handleSubmit(onSubmit)"
          />
          <ActionButton
            :item="{}"
            icon="fa-solid fa-xmark"
            icon-size="2x"
            :tooltip-text="canEdit ? 'Отменить' : 'Закрыть'"
            :disabled="isSubmitting"
            @click="close"
          />
        </div>
      </div>
      <hr class="hr" />

      <PageAlertRegion />

      <fieldset v-if="loaded" :disabled="!canEdit" class="settings-fields">
        <div class="form-group">
          <label for="name" class="label">Название:</label>
          <Field
            name="name"
            id="name"
            type="text"
            class="form-control input"
            :class="{ 'is-invalid': errors.name }"
            placeholder="Название"
          />
          <FieldError name="name" :errors="errors" />
        </div>

        <div class="form-group mt-4">
          <label class="label">Действия:</label>
          <div class="table-card app-table-card app-table-scroll mt-4">
            <table class="app-table interlaced-table">
              <thead>
                <tr>
                  <th>Действие</th>
                  <th>Клавиша</th>
                  <th class="checkbox-col">Shift</th>
                  <th class="checkbox-col">Ctrl</th>
                  <th class="checkbox-col">Alt</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(action, index) in hotKeyActionScheme.actions" :key="action.action">
                  <td>{{ getActionName(action.action) }}</td>
                  <td>
                    <KeyCaptureInput
                      v-model="action.keyCode"
                      :disabled="!canEdit"
                      class="key-input-full"
                    />
                  </td>
                  <td class="checkbox-col">
                    <input
                      type="checkbox"
                      v-model="action.shift"
                      class="checkbox checkbox-styled"
                      :id="`shift-${index}`"
                    />
                    <label :for="`shift-${index}`"></label>
                  </td>
                  <td class="checkbox-col">
                    <input
                      type="checkbox"
                      v-model="action.ctrl"
                      class="checkbox checkbox-styled"
                      :id="`ctrl-${index}`"
                    />
                    <label :for="`ctrl-${index}`"></label>
                  </td>
                  <td class="checkbox-col">
                    <input
                      type="checkbox"
                      v-model="action.alt"
                      class="checkbox checkbox-styled"
                      :id="`alt-${index}`"
                    />
                    <label :for="`alt-${index}`"></label>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </fieldset>
    </Form>
  </div>
</template>

<style scoped>
.checkbox-col {
  text-align: center;
  width: 80px;
}

.checkbox-col input[type='checkbox'] {
  margin: 0;
}

.checkbox-col label {
  margin: 0;
  padding: 0;
  cursor: pointer;
  width: auto;
  display: inline-block;
}

/* Override checkbox-styled label width for table */
.checkbox-col .checkbox-styled + label {
  width: auto;
  min-width: 20px;
}

.checkbox-col .checkbox-styled + label:after {
  margin-left: 0;
  margin-right: 0;
}

.checkbox-col .checkbox-styled + label:before {
  right: 4px;
}

.key-input-full {
  width: 100%;
  max-width: none;
}
</style>
