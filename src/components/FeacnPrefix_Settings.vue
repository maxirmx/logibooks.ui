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
import { ref, computed, onMounted } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useForm, useField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as Yup from 'yup'
import FieldArrayWithButtons from '@/components/FieldArrayWithButtons.vue'
import { useFeacnPrefixesStore } from '@/stores/feacn.prefix.store.js'
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
    exceptions: Yup.array().of(Yup.string())
  })
)

const { errors, handleSubmit, resetForm, setFieldValue } = useForm({
  validationSchema: schema,
  initialValues: {
    code: '',
    exceptions: ['']
  }
})

const { value: code } = useField('code')

onMounted(async () => {
  if (!isCreate.value) {
    loading.value = true
    try {
      const item = await prefixesStore.getById(props.prefixId)
      if (item) {
        resetForm({
          values: {
            code: item.code || '',
            exceptions: item.exceptions && item.exceptions.length ? item.exceptions : ['']
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
    if (isCreate.value) {
      await prefixesStore.create(values)
    } else {
      await prefixesStore.update(props.prefixId, values)
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
      <div class="form-group">
        <label for="code" class="label">Префикс:</label>
        <input
          name="code"
          id="code"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.code }"
          v-model="code"
          placeholder="Введите префикс ТН ВЭД"
        />
        <div v-if="errors.code" class="invalid-feedback">{{ errors.code }}</div>
      </div>

      <FieldArrayWithButtons
        name="exceptions"
        label="Исключения"
        field-type="input"
        placeholder="Код-исключение"
        add-tooltip="Добавить исключение"
        remove-tooltip="Удалить исключение"
        :has-error="!!errors.exceptions"
      />
      <div v-if="errors.exceptions" class="invalid-feedback">{{ errors.exceptions }}</div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="saving">
          <span v-show="saving" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          {{ isCreate ? 'Создать' : 'Сохранить' }}
        </button>
        <button class="button secondary" type="button" @click="cancel">
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

