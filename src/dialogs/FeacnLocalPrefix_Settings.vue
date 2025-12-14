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
import FieldArrayWithButtons from '@/components/FieldArrayWithButtons.vue'
import FeacnCodeSearch from '@/components/FeacnCodeSearch.vue'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'
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
    comment: Yup.string()
  })
)

const { errors, handleSubmit, resetForm, setFieldValue } = useForm({
  validationSchema: schema,
  initialValues: {
    code: '',
    exceptions: [''],
    comment: ''
  }
})

const { value: code } = useField('code')
const { value: comment } = useField('comment')

const codeSearchActive = ref(false)
const exceptionSearchIndex = ref(null)

const searchActive = computed(() => codeSearchActive.value || exceptionSearchIndex.value !== null)

function toggleCodeSearch() {
  codeSearchActive.value = !codeSearchActive.value
}

function handleCodeSelect(feacnCode) {
  setFieldValue('code', feacnCode)
  codeSearchActive.value = false
}

function toggleExceptionSearch(index) {
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
            comment: item.comment || ''
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
      comment: values.comment ? values.comment.trim() : ''
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
          <FeacnCodeSearch v-if="codeSearchActive" class="feacn-overlay" @select="handleCodeSelect" />
        </div>
      </div>

      <div class="form-group">
        <label for="comment" class="label">Причина запрета:</label>
        <input
          name="comment"
          id="comment"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.comment }"
          placeholder="Причина запрета"
          v-model="comment"
        />
        <div v-if="errors.comment" class="invalid-feedback">{{ errors.comment }}</div>
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
</style>

