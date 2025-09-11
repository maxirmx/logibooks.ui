<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useParcelCheckStatusStore } from '@/stores/parcel.checkstatuses.store.js'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { useFeacnOrdersStore } from '@/stores/feacn.orders.store.js'
import { useFeacnPrefixesStore } from '@/stores/feacn.prefixes.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useParcelViewsStore } from '@/stores/parcel.views.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { storeToRefs } from 'pinia'
import { ref, watch, computed, onMounted } from 'vue'
import { wbrRegisterColumnTitles, wbrRegisterColumnTooltips } from '@/helpers/wbr.register.mapping.js'
import { HasIssues, getCheckStatusInfo, getCheckStatusClass } from '@/helpers/parcels.check.helpers.js'
import WbrFormField from '@/components/WbrFormField.vue'
import { ensureHttps } from '@/helpers/url.helpers.js'
import ActionButton from '@/components/ActionButton.vue'
import FeacnCodeEditor from '@/components/FeacnCodeEditor.vue'
import ParcelNumberExt from '@/components/ParcelNumberExt.vue'
import { handleFellowsClick } from '@/helpers/parcel.number.ext.helpers.js'
import { 
  validateParcelData, 
  approveParcel as approveParcelHelper, 
  approveParcelWithExcise as approveParcelWithExciseHelper, 
  generateXml as generateXmlHelper 
} from '@/helpers/parcel.actions.helpers.js'

const props = defineProps({
  registerId: { type: Number, required: true },
  id: { type: Number, required: true }
})

// track current parcel id so we can swap inline without changing route
const currentParcelId = ref(props.id)

const parcelsStore = useParcelsStore()
const registersStore = useRegistersStore()
const authStore = useAuthStore()
const statusStore = useParcelStatusesStore()
const parcelCheckStatusStore = useParcelCheckStatusStore()
const stopWordsStore = useStopWordsStore()
const keyWordsStore = useKeyWordsStore()
const feacnOrdersStore = useFeacnOrdersStore()
const feacnPrefixesStore = useFeacnPrefixesStore()
const countriesStore = useCountriesStore()
const parcelViewsStore = useParcelViewsStore()

await statusStore.ensureLoaded()
await parcelCheckStatusStore.ensureLoaded()
await stopWordsStore.ensureLoaded()
await keyWordsStore.ensureLoaded()
await feacnOrdersStore.ensureLoaded()
await feacnPrefixesStore.ensureLoaded()
await countriesStore.ensureLoaded()
// load initial parcel by currentParcelId
await parcelsStore.getById(currentParcelId.value)
await parcelViewsStore.add(currentParcelId.value)

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

// Set the selected parcel ID in auth store
authStore.selectedParcelId = currentParcelId.value

const { item } = storeToRefs(parcelsStore)
const { stopWords } = storeToRefs(stopWordsStore)
const { orders: feacnOrders } = storeToRefs(feacnOrdersStore)
const { prefixes: feacnPrefixes } = storeToRefs(feacnPrefixesStore)
const { countries } = storeToRefs(countriesStore)

// Track loading state from store and running actions
const { loading } = storeToRefs(parcelsStore)
const runningAction = ref(false)

// Pre-fetch next parcels - will be populated in onMounted
const theNextParcelResult = ref(null)
const nextParcelResult = ref(null)
let theNextParcelPromise = null
let nextParcelPromise = null

function initNeighborPromises(id) {
  theNextParcelResult.value = null
  nextParcelResult.value = null

  theNextParcelPromise = registersStore.theNextParcel(id)
  nextParcelPromise = registersStore.nextParcel(id)

  theNextParcelPromise.then(result => theNextParcelResult.value = result)
  nextParcelPromise.then(result => nextParcelResult.value = result)
}

// Reactive reference to track current statusId for color updates
const currentStatusId = ref(null)

// Track overlay state for disabling form elements
const overlayActive = ref(false)

// Watch for changes in item.statusId to initialize currentStatusId
watch(() => item.value?.statusId, (newStatusId) => {
  currentStatusId.value = newStatusId
}, { immediate: true })

const productLinkWithProtocol = computed(() => ensureHttps(item.value?.productLink))

const isDescriptionVisible = ref(false)

// Pre-fetch next parcels after component is mounted
onMounted(() => {
  initNeighborPromises(currentParcelId.value)
})

const schema = Yup.object().shape({
  statusId: Yup.number().required('Необходимо выбрать статус'),
  tnVed: Yup.string().required('Необходимо указать ТН ВЭД'),
  countryCode: Yup.number().required('Необходимо выбрать страну'),
  invoiceDate: Yup.date().nullable(),
  weightKg: Yup.number().nullable().min(0, 'Вес не может быть отрицательным'),
  quantity: Yup.number().nullable().min(0, 'Количество не может быть отрицательным'),
  unitPrice: Yup.number().nullable().min(0, 'Цена не может быть отрицательной')
})


async function validateParcel(values, sw) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    // Wait for both next parcel promises to complete before calling helper
    await Promise.all([theNextParcelPromise, nextParcelPromise])
    
    await validateParcelData(values, item, parcelsStore, sw)
  } finally {
    runningAction.value = false
  }
}

// Approve the parcel
async function approveParcel(values) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    // Wait for both next parcel promises to complete before calling helper
    await Promise.all([theNextParcelPromise, nextParcelPromise])
    
    await approveParcelHelper(values, item, parcelsStore)
  } finally {
    runningAction.value = false
  }
}

// Approve the parcel with excise
async function approveParcelWithExcise(values) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    // Wait for both next parcel promises to complete before calling helper
    await Promise.all([theNextParcelPromise, nextParcelPromise])
    
    await approveParcelWithExciseHelper(values, item, parcelsStore)
  } finally {
    runningAction.value = false
  }
}

// Handle saving and moving to the next parcel
async function onSubmit(values, useTheNext = false) {
  try {
    loading.value = true
    // use currentParcelId so inline swaps work
    await parcelsStore.update(currentParcelId.value, values)

    // Wait for the appropriate next parcel promise to resolve
    const nextParcel = useTheNext
      ? await theNextParcelPromise
      : await nextParcelPromise

    if (nextParcel) {
      // Inline swap: set item to preview, update current id and authStore,
      // re-init neighbor promises and load full details in background.
      item.value = nextParcel
      currentParcelId.value = nextParcel.id
      authStore.selectedParcelId = nextParcel.id

      // re-init neighbor promises for the newly active parcel
      initNeighborPromises(currentParcelId.value)

  // update URL without remount
  const newUrl = `/registers/${props.registerId}/parcels/edit/${nextParcel.id}`
  router.replace(newUrl)

  // fetch full parcel data in background (keeps UI responsive)
  parcelsStore.getById(nextParcel.id).catch(() => {/* ignore, store handles errors */})
    } else {
      const fallbackUrl = `/registers/${props.registerId}/parcels`
      router.push(fallbackUrl)
    }
  } catch (error) {
    parcelsStore.error = error?.message || String(error)
  } finally {
    loading.value = false
  }
}

function onSave(values) {
  return parcelsStore
    .update(currentParcelId.value, values)
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
    // Wait for both next parcel promises to complete before processing
    await Promise.all([theNextParcelPromise, nextParcelPromise])
    await parcelsStore.update(currentParcelId.value, values)
    const prevParcel = await parcelViewsStore.back()

    if (prevParcel) {
      // Inline swap to previous parcel: preview -> set item, update id and auth
      item.value = prevParcel
      currentParcelId.value = prevParcel.id
      authStore.selectedParcelId = prevParcel.id

      // re-init neighbor promises for the newly active parcel
      initNeighborPromises(currentParcelId.value)

  // update URL without remount
  const prevUrl = `/registers/${props.registerId}/parcels/edit/${prevParcel.id}`
  router.replace(prevUrl)

  parcelsStore.getById(prevParcel.id).catch(() => {/* ignore, store handles errors */})
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
  if (runningAction.value) return
  runningAction.value = true
  try {
    // Wait for both next parcel promises to complete before calling helper
    await Promise.all([theNextParcelPromise, nextParcelPromise])
    
    await generateXmlHelper(values, item, parcelsStore, String(item.value?.shk || '').padStart(20, '0'))
  } finally {
    runningAction.value = false
  }
}

// Handle fellows click - redirect to parcels list with filter
function handleFellows() {
  handleFellowsClick(item.value.registerId, item.value.shk)
}

</script>

<template>
  <div class="settings form-4 form-compact">
    <Form @submit="onSubmit" :initial-values="item" :validation-schema="schema" v-slot="{ errors, values, isSubmitting, setFieldValue }" :class="{ 'form-disabled': overlayActive }">
    <div class="header-with-actions">
      <h1 class="primary-heading">
        {{ item?.id ? `№ ${item.id} -- ` : '' }} посылка {{ item?.shk ? item.shk : '[без номера]' }}
      </h1>
      <!-- Action buttons moved inside Form scope -->
      <div class="header-actions">
        <ActionButton 
          :item="{}" 
          icon="fa-solid fa-arrow-right" 
          :iconSize="'2x'"
          tooltip-text="Следующая посылка"
          :disabled="isSubmitting || runningAction || loading"
          @click="onSubmit(values, true)"
        />
        <ActionButton 
          :item="{}" 
          icon="fa-solid fa-play" 
          :iconSize="'2x'"
          tooltip-text="Следующая проблема"
          :disabled="isSubmitting || runningAction || loading"
          @click="onSubmit(values, false)"
        />
        <ActionButton 
          :item="{}" 
          icon="fa-solid fa-arrow-left" 
          :iconSize="'2x'"
          tooltip-text="Назад"
          :disabled="isSubmitting || runningAction || loading"
          @click="onBack(values)"
        />
        <ActionButton 
          :item="{}" 
          icon="fa-solid fa-check-double" 
          :iconSize="'2x'"
          tooltip-text="Сохранить"
          :disabled="isSubmitting || runningAction || loading"
          @click="onSave(values)"
        />
        <ActionButton 
          :item="{}" 
          icon="fa-solid fa-xmark" 
          :iconSize="'2x'"
          tooltip-text="Отменить"
          :disabled="isSubmitting || runningAction || loading"
          @click="router.push(`/registers/${props.registerId}/parcels`)"
        />
        <ActionButton 
          :item="{}" 
          icon="fa-solid fa-file-export" 
          :iconSize="'2x'"
          tooltip-text="XML накладная"
          :disabled="isSubmitting || runningAction || loading || HasIssues(item?.checkStatusId) || item?.blockedByFellowItem"
          @click="generateXml(values)"
        />
      </div>
    </div>
    
    <hr class="hr" />
      
      <!-- Order Identification & Status Section -->
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="statusId" class="label">{{ wbrRegisterColumnTitles.statusId }}:</label>
            <Field as="select" name="statusId" id="statusId" class="form-control input"
                 @change="(e) => currentStatusId = parseInt(e.target.value)">
              <option v-for="s in statusStore.parcelStatuses" :key="s.id" :value="s.id">{{ s.title }}</option>
            </Field>
          </div>
          <div class="form-group">
            <label for="checkStatusId" class="label">{{ wbrRegisterColumnTitles.checkStatusId }}:</label>
            <div class="readonly-field status-cell" :class="getCheckStatusClass(item?.checkStatusId)">
              {{ parcelCheckStatusStore.getStatusTitle(item?.checkStatusId) }}
            </div>
            <div class="action-buttons">
              <ActionButton
                :item="item"
                icon="fa-solid fa-spell-check"
                tooltip-text="Сохранить и проверить стоп-слова"
                :disabled="isSubmitting || runningAction || loading"
                @click="() => validateParcel(values, true)"
                :iconSize="'1x'"
              />
              <ActionButton
                :item="item"
                icon="fa-solid fa-anchor-circle-check"
                tooltip-text="Сохранить и проверить коды ТН ВЭД"
                :disabled="isSubmitting || runningAction || loading"
                @click="() => validateParcel(values, false)"
                :iconSize="'1x'"
              />
              <ActionButton
                :item="item"
                icon="fa-solid fa-check-circle"
                tooltip-text="Сохранить и согласовать"
                :disabled="isSubmitting || runningAction || loading"
                @click="() => approveParcel(values)"
                variant="green"
                :iconSize="'1x'"
              />
              <ActionButton
                :item="item"
                icon="fa-solid fa-check-circle"
                tooltip-text="Сохранить и согласовать c акцизом"
                :disabled="isSubmitting || runningAction || loading"
                @click="() => approveParcelWithExcise(values)"
                variant="orange"
                :iconSize="'1x'"
              />
            </div>
          </div>
          <!-- Last view -->
          <div class="form-group">
            <label for="last-view" class="label">Последний просмотр:</label>
            <div class="readonly-field" id="last-view">
              {{ item?.dTime ? new Date(item.dTime).toLocaleString() : '' }}
            </div>
          </div>          
          <!-- Stopwords information when there are issues -->
          <div v-if="HasIssues(item?.checkStatusId) && getCheckStatusInfo(item, feacnOrders, stopWords, feacnPrefixes)" class="form-group stopwords-info">
            <div class="stopwords-text">
              {{ getCheckStatusInfo(item, feacnOrders, stopWords, feacnPrefixes) }}
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
        :columnTitles="wbrRegisterColumnTitles"
        :columnTooltips="wbrRegisterColumnTooltips"
        :setFieldValue="setFieldValue"
        :nextParcelPromises="{ theNext: theNextParcelPromise, next: nextParcelPromise }"
        :runningAction="runningAction"
        @update:item="(updatedItem) => item = updatedItem"
        @overlay-state-changed="overlayActive = $event"
        @set-running-action="runningAction = $event"
      />

      <!-- Product Name and description Section -->
      <div class="form-section">
        <div class="form-row-1 product-name-row">
          <ActionButton
            :item="item"
            :icon="isDescriptionVisible ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'"
            :tooltip-text="isDescriptionVisible ? 'Скрыть описание' : 'Показать описание'"
            @click="isDescriptionVisible = !isDescriptionVisible"
            :iconSize="'1x'"
          />
          <label for="productName" class="label-1 product-name-label">
            {{ wbrRegisterColumnTitles.productName }}:
          </label>
          <Field
            name="productName"
            id="productName"
            :class="['form-control', 'input-1', { 'is-invalid': errors && errors.productName }]"
          />
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
          <div class="form-group">
            <label for="shk" class="label">{{ wbrRegisterColumnTitles.shk }}:</label>
            <ParcelNumberExt 
              :item="item"
              field-name="shk"
              :disabled="isSubmitting || runningAction || loading"
              class="readonly-parcel-number"
              @click="() => {/* No action needed for readonly display */}"
              @fellows="handleFellows"
            />
          </div>          

          <div class="form-group">
            <label class="label">{{ wbrRegisterColumnTitles.productLink }}:</label>
            <a
              v-if="item?.productLink"
              :href="productLinkWithProtocol"
              target="_blank"
              rel="noopener noreferrer"
              class="product-link-inline"
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

    </Form>
    <div v-if="item?.error" class="text-center m-5">
      <div class="text-danger">Ошибка: {{ item.error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable text-center m-5" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
/* Header with actions layout */
.header-with-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  white-space: nowrap;
  
  /* Control panel styling */
  background: #ffffff;
  border: 1px solid #74777c;
  border-radius: 0.5rem;
  padding: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1);
  
  /* Ensure it flows below heading on narrow screens */
  min-width: min-content;
}

/* Primary heading with ellipsis */
.primary-heading {
  margin: 0;
  flex: 1;
  min-width: 0; /* Allow shrinking */
  
  /* Ellipsis on overflow */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  /* Ensure it takes available space but can shrink */
  max-width: calc(100% - 300px); /* Reserve space for buttons */
}

.form-section,
.form-row,
.form-group {
  overflow: visible !important;
}

/* On small screens, ensure full width for heading and buttons flow below */
@media (max-width: 768px) {
  .header-with-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .primary-heading {
    max-width: 100%;
    margin-bottom: 0.5rem;
  }
  
  .header-actions {
    align-self: flex-end;
  }
}

/* Product name styling */
.product-name-label {
  width: calc(18.5% - 50px);
  min-width: 140px;
}

/* Override product name row alignment */
.product-name-row {
  display: flex;
  align-items: center;
}

/* Overlay state styling */
.form-disabled .form-control,
.form-disabled button,
.form-disabled select,
.form-disabled textarea,
.form-disabled .v-field,
.form-disabled .v-btn {
  pointer-events: none;
  opacity: 0.5;
  cursor: not-allowed;
}

.form-disabled .feacn-search-wrapper {
  pointer-events: auto;
  opacity: 1;
}
</style>
