<script setup>
/* global FileReader */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref, computed, watch } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  companyId: {
    type: Number,
    required: false
  }
})

const companiesStore = useCompaniesStore()
const countriesStore = useCountriesStore()
countriesStore.ensureLoaded()
const { countries } = storeToRefs(countriesStore)

// Check if we're in create mode
const isCreate = computed(() => props.mode === 'create')

let company = ref({
  inn: '',
  kpp: '',
  ogrn: '',
  name: '',
  shortName: '',
  countryIsoNumeric: null,
  postalCode: '',
  city: '',
  street: '',
  titleSignatureStamp: null
})

// store base64 and mime separately. backend expects raw base64 for byte[] binding.
const signatureStampBase64 = ref(null)
const signatureStampMime = ref(null)
const fileInputRef = ref(null)
const alertStore = useAlertStore()

function parseStampValue(value) {
  if (!value) return { base64: null, mime: null }
  if (typeof value === 'string' && value.startsWith('data:')) {
    const m = value.match(/^data:([^;]+);base64,(.*)$/)
    if (m) return { base64: m[2], mime: m[1] }
  }
  // assume raw base64 without mime
  return { base64: value, mime: null }
}

// expose a computed data URI for template/preview use
const signatureStamp = computed(() => {
  if (!signatureStampBase64.value) return null
  const mime = signatureStampMime.value || 'image/png'
  return `data:${mime};base64,${signatureStampBase64.value}`
})

if (!isCreate.value) {
  ;({ company } = storeToRefs(companiesStore))
  await companiesStore.getById(props.companyId)
  const parsed = parseStampValue(company.value?.titleSignatureStamp)
  signatureStampBase64.value = parsed.base64
  signatureStampMime.value = parsed.mime
  watch(
    () => company.value?.titleSignatureStamp,
    (newValue) => {
      const p = parseStampValue(newValue)
      signatureStampBase64.value = p.base64
      signatureStampMime.value = p.mime
    }
  )
} else {
  const p = parseStampValue(company.value.titleSignatureStamp)
  signatureStampBase64.value = p.base64
  signatureStampMime.value = p.mime
}

// Get page title
function getTitle() {
  return isCreate.value ? 'Регистрация компании' : 'Изменить информацию о компании'
}

// Get button text
function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

// Validation schema
const schema = Yup.object({
  inn: Yup.string().required('ИНН обязателен'),
  kpp: Yup.string(),
  ogrn: Yup.string(),
  name: Yup.string(),
  shortName: Yup.string().required('Краткое название обязательно'),
  countryIsoNumeric: Yup.number().required('Страна обязательна'),
  postalCode: Yup.string(),
  city: Yup.string(),
  street: Yup.string(),
  titleSignatureStamp: Yup.string().nullable()
})

function normalizeValues(values) {
  if (values && typeof values === 'object' && values.value && typeof values.value === 'object') {
    return values.value
  }
  return values
}

function getStampPreview(value) {
  if (!value) return null
  if (typeof value === 'string' && value.startsWith('data:')) return value
  // value here can be raw base64; assume png if mime missing
  return `data:image/png;base64,${value}`
}

function openFileDialog() {
  fileInputRef.value?.click()
}

function onStampSelected(event) {
  const file = event.target?.files?.[0]
  if (!file) {
    return
  }
  if (!file.type.startsWith('image/')) {
    // inform the user why the file was rejected via the global alert store
    alertStore.error('Выбранный файл не является изображением.')
    event.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const result = String(reader.result || '')
    if (result.startsWith('data:')) {
      const m = result.match(/^data:([^;]+);base64,(.*)$/)
      if (m) {
        signatureStampMime.value = m[1]
        signatureStampBase64.value = m[2]
        return
      }
    }
    // fallback: store as raw base64 and use file.type as mime
    signatureStampBase64.value = result
    signatureStampMime.value = file.type || null
  }
  reader.readAsDataURL(file)
}

function removeStamp() {
  signatureStampBase64.value = null
  signatureStampMime.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// Form submission
function onSubmit(values, { setErrors }) {
  const normalizedValues = normalizeValues(values) || {}
  const payload = {
    ...normalizedValues,
    // send full data URI here; fetch.wrapper will strip the prefix before sending over network
    // keeping data URI preserves MIME for tests and local state
    titleSignatureStamp: signatureStamp.value || null
  }

  if (isCreate.value) {
    return companiesStore
      .create(payload)
      .then(() => {
        router.push('/companies')
      })
      .catch((error) => {
        if (error.message?.includes('409')) {
          setErrors({ apiError: 'Компания с таким ИНН уже существует' })
        } else {
          setErrors({ apiError: error.message || 'Ошибка при регистрации компании' })
        }
      })
  } else {
    return companiesStore
      .update(props.companyId, payload)
      .then(() => {
        router.push('/companies')
      })
      .catch((error) => {
        setErrors({ apiError: error.message || 'Ошибка при сохранении информации о компании' })
      })
  }
}

</script>

<template>
  <div class="settings form-2">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />
    <Form
      @submit="onSubmit"
      :initial-values="company"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="inn" class="label">ИНН:</label>
        <Field
          name="inn"
          id="inn"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.inn }"
          placeholder="ИНН"
        />
      </div>

      <div class="form-group">
        <label for="kpp" class="label">КПП:</label>
        <Field
          name="kpp"
          id="kpp"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.kpp }"
          placeholder="КПП"
        />
      </div>
      <div class="form-group">
        <label for="ogrn" class="label">ОГРН:</label>
        <Field
          name="ogrn"
          id="ogrn"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.ogrn }"
          placeholder="ОГРН"
        />
      </div>

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
      </div>

      <div class="form-group">
        <label for="shortName" class="label">Краткое название:</label>
        <Field
          name="shortName"
          id="shortName"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.shortName }"
          placeholder="Краткое название"
        />
      </div>

      <div class="form-group">
        <label for="countryIsoNumeric" class="label">Страна:</label>
        <Field
          name="countryIsoNumeric"
          id="countryIsoNumeric"
          as="select"
          class="form-control input"
          :class="{ 'is-invalid': errors.countryIsoNumeric }"
        >
          <option value="">Выберите страну</option>
          <option
            v-for="country in countries"
            :key="country.id"
            :value="country.isoNumeric"
          >
            {{ country.nameRuOfficial }}
          </option>
        </Field>
      </div>

      <div class="form-group">
        <label for="postalCode" class="label">Почтовый индекс:</label>
        <Field
          name="postalCode"
          id="postalCode"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.postalCode }"
          placeholder="Почтовый индекс"
        />
      </div>

      <div class="form-group">
        <label for="city" class="label">Город:</label>
        <Field
          name="city"
          id="city"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.city }"
          placeholder="Город"
        />
      </div>

      <div class="form-group">
        <label for="street" class="label">Улица:</label>
        <Field
          name="street"
          id="street"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.street }"
          placeholder="Улица"
        />
      </div>

      <div class="form-group">
        <label class="label">Подпись / печать:</label>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="sr-only"
          data-testid="signature-stamp-input"
          @change="onStampSelected"
        />
        <div class="signature-stamp">
          <div v-if="signatureStamp" class="signature-preview">
            <img
              :src="getStampPreview(signatureStamp)"
              alt="Подпись или печать"
              data-testid="signature-stamp-preview"
            />
          </div>
          <div class="signature-actions">
            <button class="button secondary" type="button" @click="openFileDialog">
              <font-awesome-icon size="1x" icon="fa-solid fa-upload" class="mr-1" />
              {{ signatureStamp ? 'Заменить изображение' : 'Загрузить изображение' }}
            </button>
            <button
              v-if="signatureStamp"
              class="button danger"
              type="button"
              data-testid="remove-signature-stamp"
              @click="removeStamp"
            >
              <font-awesome-icon size="1x" icon="fa-solid fa-trash-can" class="mr-1" />
              Удалить
            </button>
          </div>
        </div>
      </div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          {{ getButtonText() }}
        </button>
        <button
          class="button secondary"
          type="button"
          data-testid="cancel-button"
          @click="$router.push('/companies')"
        >
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>
  <div v-if="errors.inn" class="alert alert-danger mt-3 mb-0">{{ errors.inn }}</div>
      <div v-if="errors.kpp" class="alert alert-danger mt-3 mb-0">{{ errors.kpp }}</div>
      <div v-if="errors.ogrn" class="alert alert-danger mt-3 mb-0">{{ errors.ogrn }}</div>
      <div v-if="errors.name" class="alert alert-danger mt-3 mb-0">{{ errors.name }}</div>
      <div v-if="errors.shortName" class="alert alert-danger mt-3 mb-0">{{ errors.shortName }}</div>
      <div v-if="errors.countryIsoNumeric" class="alert alert-danger mt-3 mb-0">{{ errors.countryIsoNumeric }}</div>
      <div v-if="errors.postalCode" class="alert alert-danger mt-3 mb-0">{{ errors.postalCode }}</div>
      <div v-if="errors.city" class="alert alert-danger mt-3 mb-0">{{ errors.city }}</div>
      <div v-if="errors.street" class="alert alert-danger mt-3 mb-0">{{ errors.street }}</div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
      <!-- Global alert display (uses alert store) -->
      <div v-if="alertStore.alert" class="mt-3">
        <div :class="['alert', alertStore.alert.type]" role="alert">{{ alertStore.alert.message }}</div>
      </div>
    </Form>
  </div>
</template>

<style scoped>
.signature-stamp {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.signature-preview {
  max-width: 200px;
  max-height: 120px;
}

.signature-preview img {
  max-width: 100%;
  max-height: 120px;
  border: 1px solid var(--border-color, #ccc);
  border-radius: 4px;
  object-fit: contain;
}

.signature-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
