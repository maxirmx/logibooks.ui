// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

<script setup>

import { ref, computed, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm, useField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as Yup from 'yup'
import router from '@/router'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { useWordMatchTypesStore } from '@/stores/word.match.types.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { isMatchTypeDisabled, createMatchTypeValidationTest } from '@/helpers/matchTypeValidation.js'
import FieldArrayWithButtons from '@/components/FieldArrayWithButtons.vue'

const props = defineProps({
  id: {
    type: [String, Number],
    default: null
  }
})

const keyWordsStore = useKeyWordsStore()
const matchTypesStore = useWordMatchTypesStore()
const alertStore = useAlertStore()

const { alert } = storeToRefs(alertStore)

const isEdit = computed(() => props.id !== null && props.id !== undefined)
const saving = ref(false)
const loading = ref(false)

// Validation schema
const schema = toTypedSchema(Yup.object().shape({
  feacnCodes: Yup.array().of(
    Yup.string().test(
      'len',
      'Код ТН ВЭД должен содержать ровно 10 цифр',
      value => !value || /^\d{10}$/.test(value)
    )
  ),
  word: Yup
    .string()
    .required('Необходимо ввести ключевое слово или фразу')
    .min(1, 'Ключевое слово должно содержать хотя бы один символ'),
  matchTypeId: Yup
    .number()
    .required('Необходимо выбрать тип соответствия')
    .test(
      'is-enabled',
      'Выбранный тип соответствия недоступен для текущего слова/фразы',
      createMatchTypeValidationTest()
    )
}))

const { errors, handleSubmit, resetForm, setFieldValue } = useForm({
  validationSchema: schema,
  initialValues: {
    feacnCodes: [''],
    word: '',
    matchTypeId: 41
  }
})

const { value: feacnCodes } = useField('feacnCodes')
const { value: word } = useField('word')
const { value: matchTypeId } = useField('matchTypeId')

const feacnCodesError = computed(() => {
  const key = Object.keys(errors.value).find(k => k.startsWith('feacnCodes'))
  return key ? errors.value[key] : null
})

function isOptionDisabled(value) {
  return isMatchTypeDisabled(value, word.value)
}

matchTypesStore.ensureLoaded()

// Ensure initial value is properly set for create mode
onMounted(async () => {
  if (isEdit.value) {
    loading.value = true
    try {
      const loadedKeyWord = await keyWordsStore.getById(props.id)
      if (loadedKeyWord) {
        resetForm({
          values: {
            feacnCodes: loadedKeyWord.feacnCodes?.length ? loadedKeyWord.feacnCodes : [''],
            word: loadedKeyWord.word,
            matchTypeId: loadedKeyWord.matchTypeId
          }
        })
        await nextTick()
      }
    } catch {
      alertStore.error('Ошибка при загрузке данных ключевого слова')
      router.push('/keywords')
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

function onCodeInput(event) {
  // Only allow digits, enforce max length of 10
  const inputValue = event.target.value.replace(/\D/g, '').slice(0, 10)
  // Update the input if we've modified the value
  if (inputValue !== event.target.value) {
    event.target.value = inputValue
  }
}

const onSubmit = handleSubmit(async (values, { setErrors }) => {
  saving.value = true
  
  const keyWordData = {
    feacnCodes: values.feacnCodes.filter(code => code && code.trim().length > 0),
    word: values.word.trim(),
    matchTypeId: values.matchTypeId
  }

  // Include id for updates
  if (isEdit.value) {
    keyWordData.id = props.id
  }

  try {
    if (isEdit.value) {
      await keyWordsStore.update(props.id, keyWordData)
    } else {
      await keyWordsStore.create(keyWordData)
    }
    router.push('/keywords')
  } catch (error) {
    setErrors({ apiError: error.message })
  } finally {
    saving.value = false
  }
})

function cancel() {
  router.push('/keywords')
}

// Expose functions for testing
defineExpose({
  onSubmit,
  cancel,
  onWordInput,
  onCodeInput,
  isOptionDisabled,
  feacnCodes
})
</script>

<template>
  <div class="settings form-3">
    <h1 class="primary-heading">{{ isEdit ? 'Редактировать слово или фразу для подбора ТН ВЭД' : 'Регистрация слова или фразы для подбора ТН ВЭД' }}</h1>
    <hr class="hr" />
    
    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    
    <form v-else @submit.prevent="onSubmit">
      <div class="form-group">
        <label for="word" class="label">Ключевое слово или фраза для подбора ТН ВЭД:</label>
        <input
          name="word"
          id="word"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.word }"
          placeholder="Ключевое слово или фраза"
          v-model="word"
          @input="onWordInput"
        />
        <div v-if="errors.word" class="invalid-feedback">{{ errors.word }}</div>
      </div>

      <FieldArrayWithButtons
        name="feacnCodes"
        label="Код ТН ВЭД (10 цифр):"
        field-type="input"
        :field-props="{ maxlength: 10, inputmode: 'numeric', pattern: '[0-9]*', onInput: onCodeInput }"
        placeholder="Введите код ТН ВЭД"
        add-tooltip="Добавить код"
        remove-tooltip="Удалить код"
        :has-error="!!feacnCodesError"
      />
      <div v-if="feacnCodesError" class="invalid-feedback">{{ feacnCodesError }}</div>
      
      <div class="form-group">
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
