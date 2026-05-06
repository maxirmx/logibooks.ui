<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref, computed, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm, useField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as Yup from 'yup'
import router from '@/router'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useWordMatchTypesStore } from '@/stores/word.match.types.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { isMatchTypeDisabled, createMatchTypeValidationTest } from '@/helpers/match.type.validation.js'

const props = defineProps({
  id: {
    type: [String, Number],
    default: null
  }
})

const stopWordsStore = useStopWordsStore()
const matchTypesStore = useWordMatchTypesStore()
const alertStore = useAlertStore()

const { alert } = storeToRefs(alertStore)

const isEdit = computed(() => props.id !== null && props.id !== undefined)
const saving = ref(false)
const loading = ref(false)

// Validation schema
const schema = toTypedSchema(Yup.object().shape({
  word: Yup
    .string()
    .required('Необходимо ввести стоп-слово или фразу')
    .min(1, 'Стоп-слово должно содержать хотя бы один символ'),
  matchTypeId: Yup
    .number()
    .required('Необходимо выбрать тип соответствия')
    .test(
      'is-enabled',
      'Выбранный тип соответствия недоступен для текущего слова/фразы',
      createMatchTypeValidationTest()
    ),
  explanationForExport: Yup.string().nullable(),
  explanationForImport: Yup.string().nullable(),
  forExport: Yup.boolean(),
  forImport: Yup.boolean()
}))

const { errors, handleSubmit, resetForm, setFieldValue } = useForm({
  validationSchema: schema,
  initialValues: {
    word: '',
    matchTypeId: 41,
    explanationForExport: '',
    explanationForImport: '',
    forExport: false,
    forImport: true
  }
})

const { value: word } = useField('word')
const { value: matchTypeId } = useField('matchTypeId')
const { value: explanationForExport } = useField('explanationForExport')
const { value: explanationForImport } = useField('explanationForImport')
const { value: forExport } = useField('forExport')
const { value: forImport } = useField('forImport')


function isOptionDisabled(value) {
  return isMatchTypeDisabled(value, word.value)
}

matchTypesStore.ensureLoaded()

// Ensure initial value is properly set for create mode
onMounted(async () => {
  if (isEdit.value) {
    loading.value = true
    try {
      const loadedStopWord = await stopWordsStore.getById(props.id)
      if (loadedStopWord) {
        resetForm({
          values: {
            word: loadedStopWord.word,
            matchTypeId: loadedStopWord.matchTypeId,
            explanationForExport: loadedStopWord.explanationForExport || '',
            explanationForImport: loadedStopWord.explanationForImport || '',
            forExport: !!loadedStopWord.forExport,
            forImport: !!loadedStopWord.forImport
          }
        })
        await nextTick()
      }
    } catch {
      alertStore.error('Ошибка при загрузке данных стоп слова')
      router.push('/stopwords')
    } finally {
      loading.value = false
    }
  } else {
    setFieldValue('matchTypeId', 41)
    await nextTick()
  }
})

function onWordInput(event) {
  // The field value is automatically updated by vee-validate
  // We just need to update our internal tracking
  word.value = event.target.value
}

const onSubmit = handleSubmit(async (values, { setErrors }) => {
  saving.value = true
  
  const stopWordData = {
    word: values.word.trim(),
    matchTypeId: values.matchTypeId,
    explanationForExport: values.explanationForExport ? values.explanationForExport.trim() : '',
    explanationForImport: values.explanationForImport ? values.explanationForImport.trim() : '',
    forExport: !!values.forExport,
    forImport: !!values.forImport
  }

  // Include id for updates
  if (isEdit.value) {
    stopWordData.id = props.id
  }

  try {
    if (isEdit.value) {
      await stopWordsStore.update(props.id, stopWordData)
    } else {
      await stopWordsStore.create(stopWordData)
    }
    router.push('/stopwords')
  } catch (error) {
    setErrors({ apiError: error.message })
  } finally {
    saving.value = false
  }
})

function cancel() {
  router.push('/stopwords')
}

// Expose functions for testing
defineExpose({
  onSubmit,
  cancel,
  onWordInput,
  isOptionDisabled
})
</script>

<template>
  <div class="settings form-2">
    <h1 class="primary-heading">{{ isEdit ? 'Редактировать стоп-слово или фразу' : 'Регистрация стоп слова или фразы' }}</h1>
    <hr class="hr" />
    
    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    
    <form v-else @submit.prevent="onSubmit">
      <div class="form-group">
        <label for="word" class="label">Стоп-слово или фраза:</label>
        <input
          name="word"
          id="word"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.word }"
          placeholder="Стоп-слово или фраза"
          v-model="word"
          @input="onWordInput"
        />
        <div v-if="errors.word" class="invalid-feedback">{{ errors.word }}</div>
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
<<<<<<< HEAD
=======
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
>>>>>>> b1023cd3189771e36bd6f112bf4944b909864c4b
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

      <div class="form-group match-type-group">
        <label class="label">Тип соответствия:</label>
        <div class="radio-group" :class="{ 'is-invalid': errors.matchTypeId }">
          <label
            v-for="mt in matchTypesStore.matchTypes"
            :key="mt.id"
            class="radio-styled"
          >
            <input
              type="radio"
              :id="`matchType-${mt.id}`"
              name="matchTypeId"
              :value="mt.id"
              v-model="matchTypeId"
              :disabled="isOptionDisabled(mt.id)"
            />
            <span class="radio-mark"></span>
            {{ mt.name }}
          </label>
        </div>
      </div>

      <div v-if="errors.matchTypeId" class="alert alert-danger mt-3 mb-0">{{ errors.matchTypeId }}</div>
      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="saving">
          <span v-show="saving" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          Сохранить
        </button>
        <button
          class="button secondary"
          type="button"
          @click="cancel"
        >
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
