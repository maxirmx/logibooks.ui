<script setup>

// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks core application
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

import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useParcelCheckStatusStore } from '@/stores/parcel.checkstatuses.store.js'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { useFeacnOrdersStore } from '@/stores/feacn.orders.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useParcelViewsStore } from '@/stores/parcel.views.store.js'
import { storeToRefs } from 'pinia'
import { ref, watch, computed } from 'vue'
import { ozonRegisterColumnTitles, ozonRegisterColumnTooltips } from '@/helpers/ozon.register.mapping.js'
import { HasIssues, getCheckStatusInfo, getCheckStatusClass } from '@/helpers/parcels.check.helpers.js'
import { getFieldTooltip } from '@/helpers/parcel.tooltip.helpers.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import OzonFormField from './OzonFormField.vue'
import { ensureHttps } from '@/helpers/url.helpers.js'
import ActionButton from '@/components/ActionButton.vue'
import FeacnCodeEditor from '@/components/FeacnCodeEditor.vue'

const props = defineProps({
  registerId: { type: Number, required: true },
  id: { type: Number, required: true }
})

const parcelsStore = useParcelsStore()
const registersStore = useRegistersStore()
const statusStore = useParcelStatusesStore()
const parcelCheckStatusStore = useParcelCheckStatusStore()
const stopWordsStore = useStopWordsStore()
const keyWordsStore = useKeyWordsStore()
const feacnOrdersStore = useFeacnOrdersStore()
const countriesStore = useCountriesStore()
const parcelViewsStore = useParcelViewsStore()

await statusStore.ensureLoaded()
await parcelCheckStatusStore.ensureLoaded()
await stopWordsStore.ensureLoaded()
await keyWordsStore.ensureLoaded()
await feacnOrdersStore.ensureLoaded()
await countriesStore.ensureLoaded()
await parcelsStore.getById(props.id)
await parcelViewsStore.add(props.id)

const { item } = storeToRefs(parcelsStore)
const { stopWords } = storeToRefs(stopWordsStore)
const { orders: feacnOrders } = storeToRefs(feacnOrdersStore)
const { countries } = storeToRefs(countriesStore)

// Reactive reference to track current statusId for color updates
const currentStatusId = ref(null)

// Watch for changes in item.statusId to initialize currentStatusId
watch(() => item.value?.statusId, (newStatusId) => {
  currentStatusId.value = newStatusId
}, { immediate: true })

const productLinkWithProtocol = computed(() => ensureHttps(item.value?.productLink))

const schema = Yup.object().shape({
  statusId: Yup.number().required('Необходимо выбрать статус'),
  tnVed: Yup.string().required('Необходимо указать ТН ВЭД'),
  countryCode: Yup.number().required('Необходимо выбрать страну'),
  invoiceDate: Yup.date().nullable(),
  weightKg: Yup.number().nullable().min(0, 'Вес не может быть отрицательным'),
  quantity: Yup.number().nullable().min(0, 'Количество не может быть отрицательным'),
  unitPrice: Yup.number().nullable().min(0, 'Цена не может быть отрицательной')
})

async function validateParcel(values) {
  try {
    // First update the parcel with current form values
    await parcelsStore.update(item.value.id, values)
    // Then validate the parcel
    await parcelsStore.validate(item.value.id)
    // Optionally reload the order data to reflect any changes
    await parcelsStore.getById(props.id)
  } catch (error) {
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при проверке посылки'
  }
}

async function approveParcel(values) {
  try {
    // First update the parcel with current form values
    await parcelsStore.update(props.id, values)
    // Then approve the parcel
    await parcelsStore.approve(item.value.id)
    // Reload the order data to reflect any changes
    await parcelsStore.getById(props.id)
  } catch (error) {
    console.error('Failed to approve parcel:', error)
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при согласовании посылки'
  }
}

// Handle saving and moving to the next parcel
async function onSubmit(values) {
  try {
    await parcelsStore.update(props.id, values)
    const nextParcel = await registersStore.nextParcel(props.id)
    
    if (nextParcel) {
      const nextUrl = `/registers/${props.registerId}/parcels/edit/${nextParcel.id}`
      router.push(nextUrl)
    } else {
      const fallbackUrl = `/registers/${props.registerId}/parcels`
      router.push(fallbackUrl)
    }
  } catch (error) {
    parcelsStore.error = error?.message || String(error)
  }
}

function onSave(values) {
  return parcelsStore
    .update(props.id, values)
    .then(() => {
      router.push(`/registers/${props.registerId}/parcels`)
    })
    .catch((error) => {
      parcelsStore.error = error?.message || String(error)
    })
}

// Save current parcel and navigate to the previous one if available
async function onBack(values) {
  try {
    await parcelsStore.update(props.id, values)
    const prevParcel = await parcelViewsStore.back()

    if (prevParcel) {
      // Ensure registerId is defined, fallback to current registerId if needed
      const registerId = prevParcel.registerId || props.registerId
      const prevUrl = `/registers/${registerId}/parcels/edit/${prevParcel.id}`
      router.push(prevUrl)
    } else {
      const fallbackUrl = `/registers/${props.registerId}/parcels`
      router.push(fallbackUrl)
    }
  } catch (error) {
    parcelsStore.error = error?.message || String(error)
  }
}

// Generate XML for this parcel
async function generateXml(values) {
  try {
    // First update the parcel with current form values
    await parcelsStore.update(item.value.id, values)
    // Then generate XML
    await parcelsStore.generate(props.id, item.value?.postingNumber)
  } catch (error) {
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при генерации XML'
  }
}
</script>

<template>
  <div class="settings form-4 form-compact">
    <h1 class="primary-heading">
      Посылка {{ item?.postingNumber ? item.postingNumber : '[без номера]' }}
    </h1>
    <hr class="hr" />
    <Form @submit="onSubmit" :initial-values="item" :validation-schema="schema" v-slot="{ errors, values, isSubmitting, handleSubmit, setFieldValue }">

      <!-- Order Identification & Status Section -->
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="statusId" class="label" :title="getFieldTooltip('statusId', ozonRegisterColumnTitles, ozonRegisterColumnTooltips)">{{ ozonRegisterColumnTitles.statusId }}:</label>
            <Field as="select" name="statusId" id="statusId" class="form-control input"
                   @change="(e) => currentStatusId = parseInt(e.target.value)">
              <option v-for="s in statusStore.parcelStatuses" :key="s.id" :value="s.id">{{ s.title }}</option>
            </Field>
          </div>
          <div class="form-group">
            <label for="checkStatusId" class="label" :title="getFieldTooltip('checkStatusId', ozonRegisterColumnTitles, ozonRegisterColumnTooltips)">{{ ozonRegisterColumnTitles.checkStatusId }}:</label>
            <div class="readonly-field status-cell" :class="getCheckStatusClass(item?.checkStatusId)">
              {{ parcelCheckStatusStore.getStatusTitle(item?.checkStatusId) }}
            </div>
            <div class="action-buttons">
              <ActionButton
                :item="item"
                icon="fa-solid fa-clipboard-check"
                tooltip-text="Сохранить и проверить"
                :disabled="isSubmitting"
                @click="() => validateParcel(values)"
              />
              <ActionButton
                :item="item"
                icon="fa-solid fa-check-circle"
                tooltip-text="Сохранить и согласовать"
                :disabled="isSubmitting"
                @click="() => approveParcel(values)"
              />
            </div>
          </div>
          <!-- Last view -->
          <div class="form-group" v-if="item?.dTime">
            <label for="lastView" class="label" title="Последний просмотр">Последний просмотр текущим пользователем:</label>
            <div class="readonly-field">
              {{ item?.dTime ? new Date(item.dTime).toLocaleString() : '[неизвестно]' }}
            </div>
          </div>          
          <!-- Stopwords information when there are issues -->
          <div v-if="HasIssues(item?.checkStatusId) && getCheckStatusInfo(item, feacnOrders, stopWords)" class="form-group stopwords-info">
            <div class="stopwords-text">
              {{ getCheckStatusInfo(item, feacnOrders, stopWords) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Feacn Code Section -->
      <FeacnCodeEditor
        :item="item"
        :values="values"
        :errors="errors"
        :isSubmitting="isSubmitting"
        :columnTitles="ozonRegisterColumnTitles"
        :columnTooltips="ozonRegisterColumnTooltips"
        :setFieldValue="setFieldValue"
        @update:item="(updatedItem) => item = updatedItem"
      />

      <!-- Product Name Section -->
      <div class="form-section">
        <div class="form-row-1 product-name-row">
          <label for="productName" class="label-1 product-name-label" :title="getFieldTooltip('productName', ozonRegisterColumnTitles, ozonRegisterColumnTooltips)">
            {{ ozonRegisterColumnTitles.productName }}:
          </label>
          <Field
            name="productName"
            id="productName"
            :class="['form-control', 'input-1', { 'is-invalid': errors && errors.productName }]"
          />
        </div>
      </div>
            <!-- Product Identification & Details Section -->
      <div class="form-section">
        <div class="form-row">
          <OzonFormField name="postingNumber" :errors="errors" :fullWidth="false" />
          <OzonFormField name="placesCount" type="number" step="1" :errors="errors" :fullWidth="false" />
          <OzonFormField name="article" :errors="errors" :fullWidth="false" />
          <div class="form-group">
            <label class="label">{{ ozonRegisterColumnTitles.productLink }}:</label>
            <a
              v-if="item?.productLink"
              :href="productLinkWithProtocol"
              target="_blank"
              rel="noopener noreferrer"
              class="product-link-inline"
              :title="productLinkWithProtocol"
            >
              {{ productLinkWithProtocol }}
            </a>
            <span v-else class="no-link">Ссылка отсутствует</span>
          </div>
          <OzonFormField name="countryCode" as="select" :errors="errors" :fullWidth="false">
            <option value="">Выберите страну</option>
            <option v-for="country in countries" :key="country.id" :value="country.isoNumeric">
              {{ country.nameRuOfficial }}
            </option>
          </OzonFormField>
          <OzonFormField name="weightKg" type="number" step="1.0" :errors="errors" :fullWidth="false" />
          <OzonFormField name="quantity" type="number" step="1.0" :errors="errors" :fullWidth="false" />
          <OzonFormField name="unitPrice" type="number" step="1.0" :errors="errors" :fullWidth="false" />
          <OzonFormField name="currency" :errors="errors" :fullWidth="false" />
        </div>
      </div>

      <!-- Recipient Information Section -->
      <div class="form-section">
        <h3 class="section-title">Информация о получателе</h3>
        <div class="form-row">
          <OzonFormField name="lastName" :errors="errors" :fullWidth="false" />
          <OzonFormField name="firstName" :errors="errors" :fullWidth="false" />
          <OzonFormField name="patronymic" :errors="errors" :fullWidth="false" />
          <OzonFormField name="passportNumber" :errors="errors" :fullWidth="false" />
        </div>
      </div>

      <!-- Action buttons -->

      <div class="form-actions">
        <button class="button primary" type="button" @click="handleSubmit(onSubmit)" :disabled="isSubmitting">
          <font-awesome-icon size="1x" icon="fa-solid fa-play" class="mr-1" />
          Следующая проблема
        </button>
        <button class="button primary" type="button" @click="onSave(values)" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          Сохранить
        </button>
        <button class="button primary" type="button" @click="generateXml(values)" :disabled="isSubmitting || HasIssues(item?.checkStatusId)">
          <font-awesome-icon size="1x" icon="fa-solid fa-file-export" class="mr-1" />
          Накладная
        </button>
        <button class="button secondary" type="button" @click="onBack(values)" :disabled="isSubmitting">
          <font-awesome-icon size="1x" icon="fa-solid fa-arrow-left" class="mr-1" />
          Назад
        </button>
        <button class="button secondary" type="button" @click="router.push(`/registers/${props.registerId}/parcels`)" :disabled="isSubmitting">
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>

    </Form>

    <div v-if="item?.loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg"></span>
      <div>Загрузка данных...</div>
    </div>
    <div v-if="item?.error" class="text-center m-5">
      <div class="text-danger">Ошибка: {{ item.error }}</div>
    </div>
  </div>
</template>

<style scoped>
/* Product name styling */
.product-name-label {
  width: 18.5%;
  min-width: 180px;
}
</style>
