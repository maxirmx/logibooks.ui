<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useForm, useField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as Yup from 'yup'
import FieldArrayWithButtons from '@/components/FieldArrayWithButtons.vue'
import FeacnCodeSearch from '@/components/FeacnCodeSearch.vue'
import ActionButton from '@/components/ActionButton.vue'
import { useFeacnPrefixesStore } from '@/stores/feacn.prefixes.store.js'
import { useAlertStore } from '@/stores/alert.store.js'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  prefixId: {
    type: [String, Number],
    required: false
  }
})

const prefixesStore = useFeacnPrefixesStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

const isCreate = computed(() => props.mode === 'create')
const saving = ref(false)
const loading = ref(false)

const schema = toTypedSchema(
  Yup.object({
    code: Yup.string().required('Префикс обязателен'),
    exceptions: Yup.array().of(Yup.string()),
    comment: Yup.string().nullable(),
    explanationForExport: Yup.string().nullable(),
    explanationForImport: Yup.string().nullable(),
    forExport: Yup.boolean(),
    forImport: Yup.boolean(),
    description: Yup.string().nullable(),
    feacnOrderId: Yup.number().nullable()
  })
)

const { errors, handleSubmit, resetForm, setFieldValue } = useForm({
  validationSchema: schema,
  initialValues: {
    code: '',
    exceptions: [''],
    comment: '',
    explanationForExport: '',
    explanationForImport: '',
    forExport: false,
    forImport: false,
    description: null,
    feacnOrderId: null
  }
})

const { value: code } = useField('code')
const { value: explanationForExport } = useField('explanationForExport')
const { value: explanationForImport } = useField('explanationForImport')
const { value: forExport } = useField('forExport')
const { value: forImport } = useField('forImport')

const codeSearchActive = ref(false)
const exceptionSearchIndex = ref(null)
const lastFocusedElement = ref(null)
const lastExceptionSearchIndex = ref(null)

const searchActive = computed(() => codeSearchActive.value || exceptionSearchIndex.value !== null)

function toggleCodeSearch() {
  if (!codeSearchActive.value) {
    lastFocusedElement.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
    lastExceptionSearchIndex.value = null
  }
  codeSearchActive.value = !codeSearchActive.value
}

function handleCodeSelect(feacnCode) {
  setFieldValue('code', feacnCode)
  codeSearchActive.value = false
}

function handleRefocus() {
  nextTick(() => {
    const fallbackInput = lastExceptionSearchIndex.value !== null
      ? document.getElementById(`exceptions_${lastExceptionSearchIndex.value}`)
      : document.getElementById('code')
    const target = lastFocusedElement.value || fallbackInput
    target?.focus?.()
  })
}

function toggleExceptionSearch(index) {
  if (exceptionSearchIndex.value !== index) {
    lastFocusedElement.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
    lastExceptionSearchIndex.value = index
  }
  exceptionSearchIndex.value = exceptionSearchIndex.value === index ? null : index
}

function handleExceptionCodeSelect(code) {
  if (exceptionSearchIndex.value !== null) {
    setFieldValue(`exceptions[${exceptionSearchIndex.value}]`, code)
  }
  exceptionSearchIndex.value = null
}

function handleEscape(event) {
  if (event.key === 'Escape') {
    codeSearchActive.value = false
    exceptionSearchIndex.value = null
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
      const item = await prefixesStore.getById(props.prefixId)
      if (item) {
        // Convert FeacnPrefixExceptionDto[] to string[] for UI display
        const exceptionCodes = item.exceptions && item.exceptions.length 
          ? item.exceptions.map(exc => typeof exc === 'string' ? exc : exc.code)
          : ['']
        
        resetForm({
          values: {
            code: item.code || '',
            exceptions: exceptionCodes,
            comment: item.comment || '',
            explanationForExport: item.explanationForExport || '',
            explanationForImport: item.explanationForImport || '',
            forExport: !!item.forExport,
            forImport: !!item.forImport,
            description: item.description ?? null,
            feacnOrderId: item.feacnOrderId ?? null
          }
        })
      }
    } catch {
      alertStore.error('Ошибка при загрузке данных префикса')
      router.push('/feacn/prefixes')
    } finally {
      loading.value = false
    }
  }
})

const onSubmit = handleSubmit(async (values, { setErrors }) => {
  saving.value = true
  try {
    // Prepare data for API - convert UI format to DTO format
    const submitData = {
      code: values.code,
      // Filter out empty strings and convert to the format expected by CreateDto
      exceptions: values.exceptions.filter(exc => exc && exc.trim() !== ''),
      comment: values.comment ?? '',
      explanationForExport: values.explanationForExport ? values.explanationForExport.trim() : '',
      explanationForImport: values.explanationForImport ? values.explanationForImport.trim() : '',
      forExport: !!values.forExport,
      forImport: !!values.forImport,
      description: values.description ?? null,
      feacnOrderId: values.feacnOrderId ?? null
    }

    if (isCreate.value) {
      await prefixesStore.create(submitData)
    } else {
      await prefixesStore.update(props.prefixId, submitData)
    }
    router.push('/feacn/prefixes')
  } catch (error) {
    setErrors({ apiError: error.message || 'Ошибка при сохранении префикса' })
  } finally {
    saving.value = false
  }
})

function cancel() {
  router.push('/feacn/prefixes')
}
</script>

<template>
  <div class="settings form-3">
    <h1 class="primary-heading">{{ isCreate ? 'Создание префикса ТН ВЭД' : 'Редактирование префикса ТН ВЭД' }}</h1>
    <hr class="hr" />

    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>

    <form v-else @submit.prevent="onSubmit">
      <div class="feacn-search-wrapper">
        <div class="form-group">
          <label for="code" class="label">Префикс:</label>
          <input
            name="code"
            id="code"
            type="text"
            class="form-control input"
            :class="{ 'is-invalid': errors.code }"
            v-model="code"
            @dblclick="toggleCodeSearch"
            :readonly="searchActive"
            placeholder="Введите префикс ТН ВЭД"
          />
          <ActionButton
            :icon="codeSearchActive ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'"
            :item="null"
            @click="toggleCodeSearch"
            class="ml-2 mr-2"
            :tooltip-text="codeSearchActive ? 'Скрыть дерево кодов' : 'Выбрать код'"
            :disabled="false"
          />
          <div v-if="errors.code" class="invalid-feedback">{{ errors.code }}</div>
          <FeacnCodeSearch v-if="codeSearchActive" class="feacn-overlay" @select="handleCodeSelect" @refocus="handleRefocus" />
        </div>
      </div>

      <div class="form-group">
        <span class="label">Таможенная процедура:</span>
        <div class="procedure-grid">
          <div class="procedure-item">
            <input
              id="forExport"
              type="checkbox"
              name="forExport"
              class="checkbox checkbox-styled"
              v-model="forExport"
            />
            <label for="forExport">Экспорт из РФ</label>
          </div>

          <div class="procedure-item">
            <input
              id="forImport"
              type="checkbox"
              name="forImport"
              class="checkbox checkbox-styled"
              v-model="forImport"
            />
            <label for="forImport">Импорт в РФ</label>
          </div>
        </div>
      </div>

      <div v-if="forExport" class="form-group">
        <label for="explanationForExport" class="label">Причина запрета экспорта:</label>
        <input
          name="explanationForExport"
          id="explanationForExport"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.explanationForExport }"
          placeholder="Причина запрета экспорта"
          v-model="explanationForExport"
        />
        <div v-if="errors.explanationForExport" class="invalid-feedback">{{ errors.explanationForExport }}</div>
      </div>

      <div v-if="forImport" class="form-group">
        <label for="explanationForImport" class="label">Причина запрета импорта:</label>
        <input
          name="explanationForImport"
          id="explanationForImport"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.explanationForImport }"
          placeholder="Причина запрета импорта"
          v-model="explanationForImport"
        />
        <div v-if="errors.explanationForImport" class="invalid-feedback">{{ errors.explanationForImport }}</div>
      </div>

      <div class="feacn-search-wrapper">
        <FieldArrayWithButtons
          name="exceptions"
          label="Исключения"
          field-type="input"
          :field-props="({ index }) => ({
            onDblclick: () => toggleExceptionSearch(index),
            readonly: searchActive && exceptionSearchIndex !== index
          })"
          placeholder="Код-исключение"
          add-tooltip="Добавить исключение"
          remove-tooltip="Удалить исключение"
          :has-error="!!errors.exceptions"
        >
          <template #extra="{ index }">
            <ActionButton
              :icon="searchActive && exceptionSearchIndex === index ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'"
              :item="index"
              @click="toggleExceptionSearch(index)"
              class="ml-2 mr-2"
              :tooltip-text="searchActive && exceptionSearchIndex === index ? 'Скрыть дерево кодов' : 'Выбрать код'"
              :disabled="searchActive && exceptionSearchIndex !== index"
            />
          </template>
        </FieldArrayWithButtons>
        <FeacnCodeSearch
          v-if="exceptionSearchIndex !== null"
          class="feacn-overlay"
          @select="handleExceptionCodeSelect"
          @refocus="handleRefocus"
        />
      </div>
      <div v-if="errors.exceptions" class="invalid-feedback">{{ errors.exceptions }}</div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="saving || searchActive">
          <span v-show="saving" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          {{ isCreate ? 'Создать' : 'Сохранить' }}
        </button>
        <button class="button secondary" type="button" @click="cancel" :disabled="searchActive">
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>

      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </form>

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

.procedure-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  align-items: center;
}

.procedure-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 850px) {
  .procedure-grid {
    grid-template-columns: 1fr;
  }
}
</style>
