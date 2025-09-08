<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useForm, useField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as Yup from 'yup'
import { useFeacnInsertItemsStore } from '@/stores/feacn.insert.items.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import FeacnCodeSearch from '@/components/FeacnCodeSearch.vue'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  insertItemId: {
    type: [String, Number],
    required: false
  }
})

const insertItemsStore = useFeacnInsertItemsStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

const isCreate = computed(() => props.mode === 'create')
const saving = ref(false)
const loading = ref(false)

const schema = toTypedSchema(
  Yup.object({
    code: Yup.string()
      .required('Код ТН ВЭД обязателен')
      .matches(/^\d{10}$/, 'Код ТН ВЭД должен содержать ровно 10 цифр'),
    insBefore: Yup.string(),
    insAfter: Yup.string()
  })
)

const { errors, handleSubmit, resetForm, setFieldValue } = useForm({
  validationSchema: schema,
  initialValues: {
    code: '',
    insBefore: '',
    insAfter: ''
  }
})

const { value: code } = useField('code')
const { value: insBefore } = useField('insBefore')
const { value: insAfter } = useField('insAfter')

const searchActive = ref(false)

function getTitle() {
  return isCreate.value
    ? 'Создание правила для формирования описания продукта'
    : 'Редактирование правила для формирования описания продукта'
}

function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

function onCodeInput(event) {
  const inputValue = event.target.value.replace(/\D/g, '').slice(0, 10)
  if (inputValue !== event.target.value) {
    event.target.value = inputValue
  }
  setFieldValue('code', inputValue)
}

function toggleSearch() {
  searchActive.value = !searchActive.value
}

function handleCodeSelect(feacnCode) {
  setFieldValue('code', feacnCode)
  searchActive.value = false
}

function handleEscape(event) {
  if (event.key === 'Escape') {
    searchActive.value = false
  }
}

watch(searchActive, (val) => {
  if (val) {
    document.addEventListener('keydown', handleEscape)
  } else {
    document.removeEventListener('keydown', handleEscape)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})

onMounted(async () => {
  if (!isCreate.value) {
    loading.value = true
    try {
      const item = await insertItemsStore.getById(props.insertItemId)
      if (item) {
        resetForm({
          values: {
            code: item.code || '',
            insBefore: item.insBefore || '',
            insAfter: item.insAfter || ''
          }
        })
      }
    } catch {
      alertStore.error('Ошибка при загрузке данных правила')
      router.push('/feacn/insertitems')
    } finally {
      loading.value = false
    }
  }
})

const onSubmit = handleSubmit(async (values, { setErrors }) => {
  saving.value = true
  try {
    if (isCreate.value) {
      await insertItemsStore.create(values)
    } else {
      await insertItemsStore.update(props.insertItemId, values)
    }
    router.push('/feacn/insertitems')
  } catch (error) {
    setErrors({ apiError: error.message || 'Ошибка при сохранении правила' })
  } finally {
    saving.value = false
  }
})

function cancel() {
  router.push('/feacn/insertitems')
}
</script>

<template>
  <div class="settings form-3">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />

    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>

    <form v-else @submit.prevent="onSubmit">
      <div class="feacn-search-wrapper">
        <div class="form-group">
            <label for="code" class="label">Код ТН ВЭД:</label>
            <input
                name="code"
                id="code"
                type="text"
                class="form-control input"
                :class="{ 'is-invalid': errors.code }"
                maxlength="10"
                inputmode="numeric"
                pattern="[0-9]*"
                v-model="code"
                @input="onCodeInput"
                @dblclick="toggleSearch"
                :readonly="searchActive"
                placeholder="Введите код ТН ВЭД"
            />
            <ActionButton
                :icon="searchActive ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'"
                :item="null"
                @click="toggleSearch"
                class="ml-2 mr-2"
                :tooltip-text="searchActive ? 'Скрыть дерево кодов' : 'Выбрать код'"
                :disabled="false"
            />
            <div v-if="errors.code" class="invalid-feedback">{{ errors.code }}</div>
            <FeacnCodeSearch v-if="searchActive" class="feacn-overlay" @select="handleCodeSelect" />
        </div>
      </div>
      <div class="form-group">
        <label for="insBefore" class="label">Вставить перед:</label>
        <input
          name="insBefore"
          id="insBefore"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.insBefore }"
          v-model="insBefore"
          :readonly="searchActive"
          placeholder="Текст для вставки перед описанием (не обязательно)"
        />
        <div v-if="errors.insBefore" class="invalid-feedback">{{ errors.insBefore }}</div>
      </div>

      <div class="form-group">
        <label for="insAfter" class="label">Вставить после:</label>
        <input
          name="insAfter"
          id="insAfter"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.insAfter }"
          v-model="insAfter"
          :readonly="searchActive"
          placeholder="Текст для вставки после описанием (не обязательно)"
        />
        <div v-if="errors.insAfter" class="invalid-feedback">{{ errors.insAfter }}</div>
      </div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="saving || searchActive">
          <span v-show="saving" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          {{ getButtonText() }}
        </button>
        <button class="button secondary" type="button" @click="cancel" :disabled="searchActive">
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>

      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </form>

    <!-- Alert -->
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
.feacn-search-wrapper {
  position: relative;
}

.feacn-overlay {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  z-index: 100;
}
</style>

