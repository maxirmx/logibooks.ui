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

import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useParcelCheckStatusStore } from '@/stores/parcel.checkstatuses.store.js'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useParcelViewsStore } from '@/stores/parcel.views.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { storeToRefs } from 'pinia'
import { ref, watch, computed } from 'vue'
import { wbrRegisterColumnTitles, wbrRegisterColumnTooltips } from '@/helpers/wbr.register.mapping.js'
import { HasIssues, getCheckStatusInfo, getCheckStatusClass } from '@/helpers/orders.check.helper.js'
import { getFieldTooltip } from '@/helpers/parcel.tooltip.helpers.js'
import WbrFormField from './WbrFormField.vue'
import { ensureHttps } from '@/helpers/url.helpers.js'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  registerId: { type: Number, required: true },
  id: { type: Number, required: true }
})

const parcelsStore = useParcelsStore()
const registersStore = useRegistersStore()
const statusStore = useParcelStatusesStore()
const parcelCheckStatusStore = useParcelCheckStatusStore()
const stopWordsStore = useStopWordsStore()
const feacnCodesStore = useFeacnCodesStore()
const countriesStore = useCountriesStore()
const parcelViewsStore = useParcelViewsStore()

const { item } = storeToRefs(parcelsStore)
const { stopWords } = storeToRefs(stopWordsStore)
const { orders: feacnOrders } = storeToRefs(feacnCodesStore)
const { countries } = storeToRefs(countriesStore)

// Reactive reference to track current statusId for color updates
const currentStatusId = ref(null)

// Watch for changes in item.statusId to initialize currentStatusId
watch(() => item.value?.statusId, (newStatusId) => {
  currentStatusId.value = newStatusId
}, { immediate: true })

const productLinkWithProtocol = computed(() => ensureHttps(item.value?.productLink))

const isDescriptionVisible = ref(false)

statusStore.ensureStatusesLoaded()
parcelCheckStatusStore.ensureStatusesLoaded()
await stopWordsStore.getAll()
countriesStore.ensureLoaded()
await parcelsStore.getById(props.id)
await parcelViewsStore.add(props.id)

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
    console.error('Failed to validate parcel:', error)
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при проверке посылки'
  }
}

// Approve/согласовать the parcel
async function approveParcel(values) {
  try {
    // First update the parcel with current form values
    await parcelsStore.update(props.id, values)
    // Then approve the parcel
    await parcelsStore.approve(item.value.id)
    // Optionally reload the order data to reflect any changes
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
    const filename = String(item.value?.shk || '').padStart(20, '0')
    await parcelsStore.generate(item.value.id, filename)
  } catch (error) {
    console.error('Failed to generate XML:', error)
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при генерации XML'
  }
}
</script>

<template>
  <div class="settings form-4 form-compact">
    <h1 class="primary-heading">
      Посылка {{ item?.shk ? item.shk : '[без номера]' }}
    </h1>
    <hr class="hr" />
    <Form @submit="onSubmit" :initial-values="item" :validation-schema="schema" v-slot="{ errors, values, isSubmitting, handleSubmit }">

      <!-- Order Identification & Status Section -->
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="statusId" class="label" :title="getFieldTooltip('statusId', wbrRegisterColumnTitles, wbrRegisterColumnTooltips)">{{ wbrRegisterColumnTitles.statusId }}:</label>
            <Field as="select" name="statusId" id="statusId" class="form-control input"
                   @change="(e) => currentStatusId = parseInt(e.target.value)">
              <option v-for="s in statusStore.parcelStatuses" :key="s.id" :value="s.id">{{ s.title }}</option>
            </Field>
          </div>
          <div class="form-group">
            <label for="checkStatusId" class="label" :title="getFieldTooltip('checkStatusId', wbrRegisterColumnTitles, wbrRegisterColumnTooltips)">{{ wbrRegisterColumnTitles.checkStatusId }}:</label>
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
          <!-- Last view 
          <div class="form-group">
            <label for="lastView" class="label" title="Последний просмотр">Последний просмотр:</label>
            <div class="readonly-field">
              {{ item?.dTime ? new Date(item.dTime).toLocaleString() : '[неизвестно]' }}
            </div>
          </div>
          -->
          <!-- Stopwords information when there are issues -->
          <div v-if="HasIssues(item?.checkStatusId) && getCheckStatusInfo(item, feacnOrders, stopWords)" class="form-group stopwords-info">
            <div class="stopwords-text">
              {{ getCheckStatusInfo(item, feacnOrders, stopWords) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Product Name and description Section -->
      <div class="form-section">
        <div class="form-row-1 product-name-row">
          <ActionButton
            :item="item"
            :icon="isDescriptionVisible ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'"
            :tooltip-text="isDescriptionVisible ? 'Скрыть описание' : 'Показать описание'"
            @click="isDescriptionVisible = !isDescriptionVisible"
          />
          <WbrFormField name="productName" :errors="errors" />
        </div>
        <div class="form-row-0" v-show="isDescriptionVisible">
          <div class="form-group-0">
            <label for="description" class="label-0">Описание:</label>
            <Field
              as="textarea"
              name="description"
              id="description"
              rows="5"
              class="form-control input-0"
              :class="{ 'is-invalid': errors && errors.description }"
            />
          </div>
        </div>
      </div>

      <!-- Product Identification & Details Section -->
      <div class="form-section">
        <div class="form-row">
          <WbrFormField name="tnVed" :errors="errors" :fullWidth="false" />
          <WbrFormField name="shk" :errors="errors" :fullWidth="false" />
          <div class="form-group">
            <label class="label">{{ wbrRegisterColumnTitles.productLink }}:</label>
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
          <WbrFormField name="countryCode" as="select" :errors="errors" :fullWidth="false">
            <option value="">Выберите страну</option>
            <option v-for="country in countries" :key="country.id" :value="country.isoNumeric">
              {{ country.nameRuOfficial }}
            </option>
          </WbrFormField>
          <WbrFormField name="weightKg" type="number" step="1.0" :errors="errors" :fullWidth="false" />
          <WbrFormField name="quantity" type="number" step="1.0" :errors="errors" :fullWidth="false" />
          <WbrFormField name="unitPrice" type="number" step="1.0" :errors="errors" :fullWidth="false" />
          <WbrFormField name="currency" :errors="errors" :fullWidth="false" />
        </div>
        <div class="form-row">
          <WbrFormField name="recipientName" :errors="errors" :fullWidth="false" />
          <WbrFormField name="passportNumber" :errors="errors" :fullWidth="false" />
        </div>
      </div>

      <!-- Action buttons -->

      <div class="form-actions">
        <button class="button primary" @click="handleSubmit(onSubmit)" type="button" :disabled="isSubmitting">
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
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="item?.error" class="text-center m-5">
      <div class="text-danger">Ошибка: {{ item.error }}</div>
    </div>
  </div>
</template>

