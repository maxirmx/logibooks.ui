<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref, computed } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useHotKeyActionSchemesStore } from '@/stores/hotkey.action.schemes.store.js'

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
const isCreate = computed(() => props.mode === 'create')

let hotKeyActionScheme = ref({
  name: ''
})

if (!isCreate.value) {
  ;({ hotKeyActionScheme } = storeToRefs(hotKeyActionSchemesStore))
  await hotKeyActionSchemesStore.getById(props.hotKeyActionSchemeId)
}

function getTitle() {
  return isCreate.value
    ? 'Создание настройки клавиатуры'
    : 'Изменение настройки клавиатуры'
}

function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

const schema = Yup.object({
  name: Yup.string().required('Название обязательно')
})

function onSubmit(values, { setErrors }) {
  if (isCreate.value) {
    return hotKeyActionSchemesStore
      .create(values)
      .then(() => {
        router.push('/hotkeyactionschemes')
      })
      .catch((error) => {
        if (error.message?.includes('409')) {
          setErrors({ apiError: 'Настройки клавиатуры с таким названием уже существуют' })
        } else {
          setErrors({ apiError: error.message || 'Ошибка при создании настроек клавиатуры' })
        }
      })
  }

  return hotKeyActionSchemesStore
    .update(props.hotKeyActionSchemeId, values)
    .then(() => {
      router.push('/hotkeyactionschemes')
    })
    .catch((error) => {
      setErrors({ apiError: error.message || 'Ошибка при сохранении настроек клавиатуры' })
    })
}
</script>

<template>
  <div class="settings form-2">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />
    <Form
      @submit="onSubmit"
      :initial-values="hotKeyActionScheme"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="name" class="label">Название настройки клавиатуры:</label>
        <Field
          name="name"
          id="name"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.name }"
          placeholder="Название настройки клавиатуры"
        />
      </div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          {{ getButtonText() }}
        </button>
        <button class="button secondary" type="button" @click="$router.push('/hotkeyactionschemes')">
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>

      <div v-if="errors.name" class="alert alert-danger mt-3 mb-0">{{ errors.name }}</div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
  </div>
</template>
