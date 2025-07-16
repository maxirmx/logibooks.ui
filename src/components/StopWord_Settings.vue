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

<template>
  <v-card>
    <v-card-title>
      <span class="text-h5">{{ isEdit ? 'Редактировать стоп-слово или фразу' : 'Регистрация стоп-слова или фразы' }}</span>
    </v-card-title>
    
    <v-divider></v-divider>
    
    <v-card-text>
      <v-container>
        <v-form @submit.prevent="save">
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="word"
                :error-messages="errors.word"
                label="Стоп-слово"
                required
                clearable
                @input="onWordInput"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-radio-group
                v-model="exactMatch"
                :error-messages="errors.exactMatch"
                label="Тип соответствия"
                :disabled="forceExactMatch"
              >
                <v-radio
                  label="Точное соответствие"
                  :value="true"
                ></v-radio>
                <v-radio
                  label="Морфологическое соответствие"
                  :value="false"
                  :disabled="forceExactMatch"
                ></v-radio>
              </v-radio-group>
              <v-alert 
                v-if="forceExactMatch"
                type="info"
                variant="outlined"
                density="compact"
                class="mt-2"
              >
                Для многословных фраз доступно только точное соответствие
              </v-alert>
            </v-col>
          </v-row>

          <v-row v-if="alert">
            <v-col>
              <v-alert
                :type="alert.type"
                :text="alert.message"
                variant="outlined"
                closable
                @click:close="alertStore.clear()"
              ></v-alert>
            </v-col>
          </v-row>
        </v-form>
      </v-container>
    </v-card-text>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        color="blue-darken-1"
        variant="text"
        @click="cancel"
      >
        Отмена
      </v-btn>
      <v-btn
        color="blue-darken-1"
        variant="text"
        @click="save"
        :loading="saving"
      >
        Сохранить
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useField, useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import router from '@/router'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useAlertStore } from '@/stores/alert.store.js'

const props = defineProps({
  id: {
    type: [String, Number],
    default: null
  }
})

const stopWordsStore = useStopWordsStore()
const alertStore = useAlertStore()

const { alert } = storeToRefs(alertStore)

const isEdit = computed(() => props.id !== null && props.id !== undefined)
const saving = ref(false)

// Validation schema
const schema = toTypedSchema(
  yup.object({
    word: yup
      .string()
      .required('Необходимо ввести стоп-слово или фразу')
      .min(1, 'Стоп-слово должно содержать хотя бы один символ'),
    exactMatch: yup
      .boolean()
      .required('Необходимо выбрать тип соответствия')
  })
)

const { errors, handleSubmit, resetForm } = useForm({
  validationSchema: schema
})

const { value: word } = useField('word')
const { value: exactMatch } = useField('exactMatch')

// Check if word contains multiple words (spaces)
const forceExactMatch = computed(() => {
  const trimmedWord = word.value?.trim() || ''
  return trimmedWord.includes(' ')
})

// Watch for multi-word input and force exact match
watch(forceExactMatch, (newValue) => {
  if (newValue) {
    exactMatch.value = true
  }
})

function onWordInput() {
  // Trim spaces from the input
  if (word.value) {
    word.value = word.value.trim()
  }
}

const save = handleSubmit(async (values) => {
  saving.value = true
  try {
    const stopWordData = {
      word: values.word.trim(),
      exactMatch: values.exactMatch
    }

    if (isEdit.value) {
      await stopWordsStore.update(props.id, stopWordData)
    } else {
      await stopWordsStore.create(stopWordData)
    }
    router.push('/stopwords')
  } catch (err) {
    if (err.message?.includes('409')) {
      alertStore.error('Такое стоп-слово уже задано')
    } else {
      alertStore.error('Ошибка при сохранении стоп-слова')
    }
  } finally {
    saving.value = false
  }
})

function cancel() {
  router.push('/stopwords')
}

// Load data for editing
onMounted(async () => {
  if (isEdit.value) {
    try {
      const stopWord = await stopWordsStore.getById(props.id)
      if (stopWord) {
        resetForm({
          values: {
            word: stopWord.word,
            exactMatch: stopWord.exactMatch
          }
        })
      }
    } catch {
      alertStore.error('Ошибка при загрузке данных стоп-слова')
      router.push('/stopwords')
    }
  } else {
    // Set default values for new stopword
    resetForm({
      values: {
        word: '',
        exactMatch: false
      }
    })
  }
})

// Expose functions for testing
defineExpose({
  save,
  cancel,
  onWordInput
})
</script>
