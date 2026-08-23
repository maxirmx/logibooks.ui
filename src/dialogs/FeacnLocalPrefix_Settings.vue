<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { focusFirstInvalidField } from '@/helpers/form.validation.helpers.js'
import { reportFormError } from '@/helpers/error.helpers.js'
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import router from '@/router'
import { useForm, useField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as Yup from 'yup'
import FieldArrayWithButtons from '@/components/FieldArrayWithButtons.vue'
import FeacnCodeSearch from '@/components/FeacnCodeSearch.vue'
import ActionButton from '@/components/ActionButton.vue'
import { useFeacnPrefixesStore } from '@/stores/feacn.prefixes.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { storeToRefs } from 'pinia'
import RestrictionScopeEditor from '@/components/RestrictionScopeEditor.vue'

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
const countriesStore = useCountriesStore()
const alertStore = useAlertStore()
const { countries } = storeToRefs(countriesStore)
const isCreate = computed(() => props.mode === 'create')
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

function normalizePrefixCode(value) {
  return String(value ?? '').trim()
}

function scopeKey(scope) {
  return `${Number(scope?.countryIsoNumeric)}:${Number(scope?.customsProcedureCode)}`
}

function conflictsWithExistingPrefix(scopes, code) {
  const normalizedCode = normalizePrefixCode(code)
  if (!normalizedCode || !scopes?.length) return false

  const occupiedScopes = new Set(
    prefixesStore.prefixes
      .filter((prefix) => {
        const isCurrentPrefix =
          props.prefixId != null && String(prefix.id) === String(props.prefixId)
        return !isCurrentPrefix && normalizePrefixCode(prefix.code) === normalizedCode
      })
      .flatMap((prefix) => prefix.scopes || [])
      .map(scopeKey)
  )

  return scopes.some((scope) => occupiedScopes.has(scopeKey(scope)))
}

const schema = toTypedSchema(
  Yup.object({
    code: Yup.string().required('Префикс обязателен'),
    exceptions: Yup.array().of(Yup.string()),
    comment: Yup.string().nullable(),
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
      .test(
        'available-scopes',
        'Страна и процедура уже используются для этого префикса',
        function (scopes) {
          return !conflictsWithExistingPrefix(scopes, this.parent?.code)
        }
      ),
    description: Yup.string().nullable(),
    feacnOrderId: Yup.number().nullable()
  })
)

const { errors, handleSubmit, resetForm, setFieldValue, setErrors } = useForm({
  validationSchema: schema,
  initialValues: {
    code: '',
    exceptions: [''],
    comment: '',
    scopes: [],
    description: null,
    feacnOrderId: null
  }
})

const { value: code } = useField('code')
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

watch([code, scopes], () => {
  scopeSubmissionErrors.value = {}
}, { deep: true })

const codeSearchActive = ref(false)
const exceptionSearchIndex = ref(null)
const lastFocusedElement = ref(null)
const lastExceptionSearchIndex = ref(null)

const searchActive = computed(() => codeSearchActive.value || exceptionSearchIndex.value !== null)
const saveDisabled = computed(() => loading.value || saving.value || searchActive.value)

function toggleCodeSearch() {
  if (!codeSearchActive.value) {
    lastFocusedElement.value =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
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
    const fallbackInput =
      lastExceptionSearchIndex.value !== null
        ? document.getElementById(`exceptions_${lastExceptionSearchIndex.value}`)
        : document.getElementById('code')
    const target = lastFocusedElement.value || fallbackInput
    target?.focus?.()
  })
}

function toggleExceptionSearch(index) {
  if (exceptionSearchIndex.value !== index) {
    lastFocusedElement.value =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
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

async function initialize() {
  if (!isCreate.value) {
    loading.value = true
  }
  try {
    await Promise.all([prefixesStore.ensureLoaded(), countriesStore.ensureLoaded()])

    if (!isCreate.value) {
      const item = await prefixesStore.getById(props.prefixId)
      if (item) {
        // Convert FeacnPrefixExceptionDto[] to string[] for UI display
        const exceptionCodes =
          item.exceptions && item.exceptions.length
            ? item.exceptions.map((exc) => (typeof exc === 'string' ? exc : exc.code))
            : ['']

        resetForm({
          values: {
            code: item.code || '',
            exceptions: exceptionCodes,
            comment: item.comment || '',
            scopes: (item.scopes || []).map((scope) => ({ ...scope })),
            description: item.description ?? null,
            feacnOrderId: item.feacnOrderId ?? null
          }
        })
      }
    }
  } catch (error) {
    alertStore.error(error, {
      fallback: 'Ошибка при загрузке данных префикса',
      action: { label: 'Повторить', handler: initialize }
    })
  } finally {
    if (!isCreate.value) {
      loading.value = false
    }
  }
}

onMounted(initialize)

const onSubmit = handleSubmit(async (values) => {
  scopeSubmissionErrors.value = {}
  saving.value = true
  try {
    // Prepare data for API - convert UI format to DTO format
    const submitData = {
      code: values.code,
      // Filter out empty strings and convert to the format expected by CreateDto
      exceptions: values.exceptions.filter((exc) => exc && exc.trim() !== ''),
      comment: values.comment ?? '',
      scopes: (values.scopes || []).map((scope) => ({
        countryIsoNumeric: Number(scope.countryIsoNumeric),
        customsProcedureCode: Number(scope.customsProcedureCode),
        explanation: scope.explanation?.trim() || null
      })),
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
    reportFormError(error, {
      setErrors,
      alertStore,
      fallback: 'Ошибка при сохранении префикса'
    })
  } finally {
    saving.value = false
  }
}, handleInvalidSubmit)

function cancel() {
  router.push('/feacn/prefixes')
}
</script>

<template>
  <div class="settings form-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">
        {{ isCreate ? 'Создание префикса ТН ВЭД' : 'Редактирование префикса ТН ВЭД' }}
      </h1>
      <div class="header-actions">
        <ActionButton
          :item="null"
          icon="fa-solid fa-check-double"
          icon-size="2x"
          :tooltip-text="isCreate ? 'Создать' : 'Сохранить'"
          :disabled="saveDisabled"
          data-testid="feacn-prefix-save-action"
          @click="onSubmit"
        />
        <ActionButton
          :item="{}"
          icon="fa-solid fa-xmark"
          icon-size="2x"
          tooltip-text="Отменить"
          :disabled="loading || saving || searchActive"
          data-testid="feacn-prefix-cancel-action"
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
            data-testid="feacn-code-search-action"
          />
          <div v-if="errors.code" class="invalid-feedback">{{ errors.code }}</div>
          <FeacnCodeSearch
            v-if="codeSearchActive"
            class="feacn-overlay"
            @select="handleCodeSelect"
            @refocus="handleRefocus"
          />
        </div>
      </div>

      <div class="form-group">
        <RestrictionScopeEditor
          v-model="scopes"
          :countries="countries"
          :disabled="saving"
          :errors="scopeEditorErrors"
        />
      </div>

      <div class="feacn-search-wrapper">
        <FieldArrayWithButtons
          name="exceptions"
          label="Исключения"
          field-type="input"
          :field-props="
            ({ index }) => ({
              onDblclick: () => toggleExceptionSearch(index),
              readonly: searchActive && exceptionSearchIndex !== index
            })
          "
          placeholder="Код-исключение"
          add-tooltip="Добавить исключение"
          remove-tooltip="Удалить исключение"
          :has-error="!!errors.exceptions"
        >
          <template #extra="{ index }">
            <ActionButton
              :icon="
                searchActive && exceptionSearchIndex === index
                  ? 'fa-solid fa-arrow-up'
                  : 'fa-solid fa-arrow-down'
              "
              :item="index"
              @click="toggleExceptionSearch(index)"
              class="ml-2 mr-2"
              :tooltip-text="
                searchActive && exceptionSearchIndex === index
                  ? 'Скрыть дерево кодов'
                  : 'Выбрать код'
              "
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
    </form>
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
