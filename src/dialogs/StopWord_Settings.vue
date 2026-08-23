<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import FieldError from '@/components/FieldError.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { focusFirstInvalidField } from '@/helpers/form.validation.helpers.js'
import { reportFormError } from '@/helpers/error.helpers.js'
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useForm, useField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as Yup from 'yup'
import router from '@/router'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useWordMatchTypesStore } from '@/stores/word.match.types.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { storeToRefs } from 'pinia'
import RestrictionScopeEditor from '@/components/RestrictionScopeEditor.vue'
import ActionButton from '@/components/ActionButton.vue'
import {
  isMatchTypeDisabled,
  createMatchTypeValidationTest
} from '@/helpers/match.type.validation.js'

const props = defineProps({
  id: {
    type: [String, Number],
    default: null
  }
})

const stopWordsStore = useStopWordsStore()
const matchTypesStore = useWordMatchTypesStore()
const countriesStore = useCountriesStore()
const alertStore = useAlertStore()
const { countries } = storeToRefs(countriesStore)
const isEdit = computed(() => props.id !== null && props.id !== undefined)
const saving = ref(false)
const loading = ref(false)
const UNIQUE_SCOPES_ERROR = 'Страна и процедура не должны повторяться'

function getCompleteScopeKeys(scopes) {
  return (scopes || [])
    .filter(
      (scope) => scope.countryIsoNumeric != null && scope.customsProcedureCode != null
    )
    .map(
      (scope) => `${Number(scope.countryIsoNumeric)}:${Number(scope.customsProcedureCode)}`
    )
}

// Validation schema
const schema = toTypedSchema(
  Yup.object().shape({
    word: Yup.string()
      .required('Необходимо ввести стоп-слово или фразу')
      .min(1, 'Стоп-слово должно содержать хотя бы один символ'),
    matchTypeId: Yup.number()
      .required('Необходимо выбрать тип соответствия')
      .test(
        'is-enabled',
        'Выбранный тип соответствия недоступен для текущего слова/фразы',
        createMatchTypeValidationTest()
      ),
    scopes: Yup.array()
      .of(
        Yup.object({
          countryIsoNumeric: Yup.number().required('Выберите страну'),
          customsProcedureCode: Yup.number()
            .oneOf([10, 40], 'Выберите процедуру')
            .required('Выберите процедуру'),
          explanation: Yup.string().nullable()
        })
      )
      .test('unique-scopes', UNIQUE_SCOPES_ERROR, (scopes) => {
        const keys = getCompleteScopeKeys(scopes)
        return new Set(keys).size === keys.length
      })
  })
)

const { errors, handleSubmit, resetForm, setFieldValue, setErrors } = useForm({
  validationSchema: schema,
  initialValues: {
    word: '',
    matchTypeId: 41,
    scopes: []
  }
})

const { value: word } = useField('word')
const { value: matchTypeId } = useField('matchTypeId')
const { value: scopes } = useField('scopes')
const scopeSubmissionErrors = ref({})
const scopeEditorErrors = computed(() => ({
  ...errors.value,
  ...scopeSubmissionErrors.value
}))

function handleInvalidSubmit(submission) {
  const scopeError = submission?.errors?.scopes
  scopeSubmissionErrors.value = scopeError ? { scopes: scopeError } : {}
  return focusFirstInvalidField(submission)
}

watch(scopes, () => {
  scopeSubmissionErrors.value = {}
}, { deep: true })

function isOptionDisabled(value) {
  return isMatchTypeDisabled(value, word.value)
}

async function initialize() {
  loading.value = true
  try {
    await Promise.all([matchTypesStore.ensureLoaded(), countriesStore.ensureLoaded()])
    if (isEdit.value) {
      const loadedStopWord = await stopWordsStore.getById(props.id)
      if (loadedStopWord) {
        resetForm({
          values: {
            word: loadedStopWord.word,
            matchTypeId: loadedStopWord.matchTypeId,
            scopes: (loadedStopWord.scopes || []).map((scope) => ({ ...scope }))
          }
        })
        await nextTick()
      }
    } else {
      setFieldValue('matchTypeId', 41)
      await nextTick()
    }
  } catch (error) {
    alertStore.error(error, {
      fallback: 'Ошибка при загрузке данных стоп-слова',
      action: { label: 'Повторить', handler: initialize }
    })
  } finally {
    loading.value = false
  }
}

onMounted(initialize)

function onWordInput(event) {
  // The field value is automatically updated by vee-validate
  // We just need to update our internal tracking
  word.value = event.target.value
}

const onSubmit = handleSubmit(async (values) => {
  scopeSubmissionErrors.value = {}
  saving.value = true

  const stopWordData = {
    word: values.word.trim(),
    matchTypeId: values.matchTypeId,
    scopes: (values.scopes || []).map((scope) => ({
      countryIsoNumeric: Number(scope.countryIsoNumeric),
      customsProcedureCode: Number(scope.customsProcedureCode),
      explanation: scope.explanation?.trim() || null
    }))
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
    reportFormError(error, {
      setErrors,
      alertStore,
      fallback: 'Ошибка при сохранении стоп-слова'
    })
  } finally {
    saving.value = false
  }
}, handleInvalidSubmit)

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
  <div class="settings form-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">
        {{ isEdit ? 'Редактировать стоп-слово или фразу' : 'Регистрация стоп слова или фразы' }}
      </h1>
      <div class="header-actions">
        <ActionButton
          :item="null"
          icon="fa-solid fa-check-double"
          icon-size="2x"
          tooltip-text="Сохранить"
          :disabled="loading || saving"
          data-testid="stopword-save-action"
          @click="onSubmit"
        />
        <ActionButton
          :item="{}"
          icon="fa-solid fa-xmark"
          icon-size="2x"
          tooltip-text="Отменить"
          :disabled="loading || saving"
          data-testid="stopword-cancel-action"
          @click="cancel"
        />
      </div>
    </div>
    <hr class="hr" />

    <PageAlertRegion />

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

      <div class="form-group match-type-group">
        <label class="label">Тип соответствия:</label>
        <div class="radio-group" :class="{ 'is-invalid': errors.matchTypeId }">
          <label v-for="mt in matchTypesStore.matchTypes" :key="mt.id" class="radio-styled">
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
        <FieldError name="matchTypeId" :errors="errors" />
      </div>

      <div class="form-group">
        <RestrictionScopeEditor
          v-model="scopes"
          :countries="countries"
          :disabled="saving"
          :errors="scopeEditorErrors"
        />
      </div>
    </form>
  </div>
</template>

